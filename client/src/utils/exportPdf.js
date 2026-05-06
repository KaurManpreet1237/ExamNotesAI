/**
 * exportPdf.js — Professional PDF Export Engine
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Architecture (modular, single-file for build simplicity):
 *
 *   ┌─ COLOR LAYER     oklch/oklab → rgb (4-layer interception for html2canvas)
 *   ├─ STYLE LAYER     Print stylesheet, dark→light theme conversion
 *   ├─ RENDER WAIT     Deterministic completion of fonts/images/SVG/Recharts
 *   ├─ CAPTURE LAYER   html2canvas with stable dimensions + clone patches
 *   ├─ PAGINATION      Atomic-block-aware page splitter
 *   └─ BUILDER         jsPDF assembly with header/footer
 *
 * Key engineering decisions:
 *
 *   ► Atomic blocks (diagrams, charts, sections) are detected from DOM
 *     and translated to canvas Y-coordinates. Page breaks are *forced*
 *     to land BEFORE atomic blocks, never inside them.
 *
 *   ► Render wait does not rely on a single setTimeout. It awaits:
 *       1. document.fonts.ready
 *       2. all <img>.complete
 *       3. all <svg> with non-zero bounding rect (mermaid done)
 *       4. all .recharts-wrapper containing an <svg> (recharts done)
 *       5. two requestAnimationFrame ticks (paint settle)
 *
 *   ► Blank-page detection samples FIVE evenly-distributed full-width
 *     stripes across the candidate page — never just a corner.
 *
 *   ► Footer occupies a reserved 14mm zone; content image is sized so
 *     it can never overflow into that zone.
 *
 *   ► Public API preserved: exportToPdf(element, filename, topic)
 * ════════════════════════════════════════════════════════════════════════════
 */

/* ────────────────────────────────────────────────────────────────────────────
 * 0. CONSTANTS
 * ──────────────────────────────────────────────────────────────────────────── */

const A4_W_MM        = 210
const A4_H_MM        = 297
const FOOTER_H_MM    = 14                        // reserved at page bottom
const CONTENT_H_MM   = A4_H_MM - FOOTER_H_MM     // 283mm usable per page
const CAPTURE_WIDTH  = 960                       // CSS pixels we lock the export at
const SCALE          = 2                         // html2canvas oversampling
const HEADING_GUARD_PX     = 90                  // orphan-heading guard zone (canvas px)
const ATOMIC_BREAK_GAP     = 8                   // canvas px gap before forced break
const MIN_FILL_RATIO       = 0.30                // forced-early break must keep ≥30% page filled
const RENDER_WAIT_TIMEOUT  = 4000                // ms cap on async render wait

/* ────────────────────────────────────────────────────────────────────────────
 * 1. COLOR CONVERSION  (oklch / oklab → sRGB)
 *    Required because html2canvas v1 cannot parse modern color() functions.
 * ──────────────────────────────────────────────────────────────────────────── */

function oklabToRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b
  const ll = l_ ** 3, mm = m_ ** 3, ss = s_ ** 3
  const rL =  4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss
  const gL = -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss
  const bL = -0.0041960863 * ll - 0.7034186147 * mm + 1.7076147010 * ss
  const g = (x) => Math.round(Math.max(0, Math.min(1,
    x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)) * 255)
  return `rgb(${g(rL)},${g(gL)},${g(bL)})`
}

function oklchToRgb(L, C, H) {
  const r = (H * Math.PI) / 180
  return oklabToRgb(L, C * Math.cos(r), C * Math.sin(r))
}

function parseVal(v) {
  if (!v || v === 'none') return 0
  if (typeof v === 'string' && v.endsWith('%')) return parseFloat(v) / 100
  return parseFloat(v)
}

function withAlpha(rgb, alpha) {
  if (!alpha || alpha === '1' || alpha === '100%') return rgb
  const a = parseVal(alpha)
  const m = rgb.match(/\d+/g)
  return m ? `rgba(${m[0]},${m[1]},${m[2]},${a})` : rgb
}

const OKLCH_RE = /oklch\(\s*([^\s)]+)\s+([^\s)]+)\s+([^\s)/]+)(?:\s*\/\s*([^\s)]+))?\s*\)/gi
const OKLAB_RE = /oklab\(\s*([^\s)]+)\s+([^\s)]+)\s+([^\s)/]+)(?:\s*\/\s*([^\s)]+))?\s*\)/gi

function replaceModernColors(str) {
  if (typeof str !== 'string') return str
  if (!str.includes('oklch') && !str.includes('oklab')) return str
  let out = str.replace(OKLCH_RE, (_, l, c, h, a) =>
    withAlpha(oklchToRgb(parseVal(l), parseVal(c), parseVal(h)), a))
  out = out.replace(OKLAB_RE, (_, l, a, b, alpha) =>
    withAlpha(oklabToRgb(parseVal(l), parseVal(a), parseVal(b)), alpha))
  return out
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. LIVE STYLE PATCHES (applied to actual document, reverted after capture)
 * ──────────────────────────────────────────────────────────────────────────── */

function injectCssVariableOverrides() {
  const rs = window.getComputedStyle(document.documentElement)
  const ov = []
  for (let i = 0; i < rs.length; i++) {
    const p = rs[i]
    if (!p.startsWith('--')) continue
    const v = rs.getPropertyValue(p).trim()
    if (!v.includes('oklch') && !v.includes('oklab')) continue
    ov.push(`${p}: ${replaceModernColors(v)};`)
  }
  if (!ov.length) return () => {}
  const s = document.createElement('style')
  s.id = '__pdf_var_override__'
  s.textContent = `:root { ${ov.join(' ')} }`
  document.head.appendChild(s)
  return () => s.remove()
}

function patchGetComputedStyle() {
  const orig = window.getComputedStyle
  window.getComputedStyle = function (...a) {
    const styles = orig.apply(this, a)
    return new Proxy(styles, {
      get(t, p) {
        const v = t[p]
        if (typeof v === 'string' && (v.includes('oklch') || v.includes('oklab')))
          return replaceModernColors(v)
        return typeof v === 'function' ? v.bind(t) : v
      }
    })
  }
  return () => { window.getComputedStyle = orig }
}

function patchLiveStyles() {
  const patches = []
  document.querySelectorAll('style').forEach((el) => {
    const orig = el.textContent
    if (orig.includes('oklch') || orig.includes('oklab')) {
      el.textContent = replaceModernColors(orig)
      patches.push({ el, orig })
    }
  })
  return () => patches.forEach(({ el, orig }) => { el.textContent = orig })
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. PRINT STYLESHEET (injected into the html2canvas clone)
 *    Converts dark theme to light, fixes typography, marks atomic blocks.
 * ──────────────────────────────────────────────────────────────────────────── */

const PRINT_STYLESHEET = `

  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    box-sizing: border-box !important;
  }

  body {
    background: #ffffff !important;
    color: #111827 !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif !important;
    font-size: 14px !important;
    line-height: 1.6 !important;
  }

  /* ── Typography hierarchy ─────────────────────────────────────── */
  h1 {
    color: #1e1b4b !important;
    font-size: 22px !important;
    font-weight: 800 !important;
    margin: 28px 0 14px !important;
    padding-bottom: 8px !important;
    border-bottom: 2px solid #e0e7ff !important;
    line-height: 1.3 !important;
  }
  h2 {
    color: #1e1b4b !important;
    font-size: 17px !important;
    font-weight: 700 !important;
    margin: 22px 0 10px !important;
    line-height: 1.35 !important;
  }
  h3 {
    color: #374151 !important;
    font-size: 15px !important;
    font-weight: 600 !important;
    margin: 16px 0 8px !important;
    line-height: 1.4 !important;
  }
  h4, h5, h6 {
    color: #374151 !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    margin: 12px 0 6px !important;
  }
  h1, h2, h3, h4 {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }

  /* ── Paragraphs ────────────────────────────────────────────────── */
  p {
    color: #374151 !important;
    margin: 0 0 10px !important;
    line-height: 1.65 !important;
  }
  strong, b { color: #111827 !important; font-weight: 700 !important; }

  /* ── Dark theme grays → readable on white ─────────────────────── */
  .text-gray-100, .text-gray-200, .text-gray-300 { color: #1f2937 !important; }
  .text-gray-400, .text-gray-500                 { color: #374151 !important; }
  .text-gray-600, .text-gray-700                 { color: #4b5563 !important; }
  .text-indigo-300, .text-indigo-400 { color: #4338ca !important; }
  .text-purple-300, .text-purple-400 { color: #7c3aed !important; }
  .text-cyan-300,   .text-cyan-400   { color: #0e7490 !important; }
  .text-green-300,  .text-green-400  { color: #15803d !important; }
  .text-rose-300,   .text-rose-400   { color: #be123c !important; }
  .text-amber-300,  .text-amber-400  { color: #b45309 !important; }
  .text-white                        { color: #111827 !important; }

  .marker\\:text-indigo-400::marker { color: #4338ca !important; }
  .marker\\:text-indigo-500::marker { color: #4338ca !important; }

  /* ── Dark backgrounds → light ─────────────────────────────────── */
  [class*="bg-white/"], [class*="bg-black/"],
  [class*="from-black"], [class*="from-[#"],
  [class*="via-[#"], [class*="to-[#"] {
    background: #ffffff !important;
    background-image: none !important;
  }
  .bg-white\\/3, .bg-white\\/5, .bg-white\\/8     { background: #f9fafb !important; }
  .bg-indigo-500\\/10, .bg-indigo-500\\/12        { background: #eef2ff !important; }
  .bg-purple-500\\/10, .bg-purple-500\\/12        { background: #faf5ff !important; }
  .bg-cyan-500\\/10,   .bg-cyan-500\\/12          { background: #ecfeff !important; }
  .bg-rose-500\\/10,   .bg-rose-500\\/12          { background: #fff1f2 !important; }
  .bg-green-500\\/10,  .bg-green-500\\/12         { background: #f0fdf4 !important; }
  [class*="border-white/"]       { border-color: #e5e7eb !important; }
  [class*="border-indigo-500/"]  { border-color: #c7d2fe !important; }
  [class*="border-purple-500/"]  { border-color: #e9d5ff !important; }
  [class*="border-cyan-500/"]    { border-color: #a5f3fc !important; }
  [class*="border-rose-500/"]    { border-color: #fecdd3 !important; }
  [class*="border-green-500/"]   { border-color: #bbf7d0 !important; }
  .from-indigo-500\\/12 { background: #eef2ff !important; }
  .from-purple-500\\/12 { background: #faf5ff !important; }
  .from-cyan-500\\/12   { background: #ecfeff !important; }
  .from-rose-500\\/12   { background: #fff1f2 !important; }
  .from-green-500\\/12  { background: #f0fdf4 !important; }

  /* ── Lists — professional alignment ───────────────────────────── */
  ul, ol {
    margin: 0 0 10px !important;
    padding-left: 1.75rem !important;
    list-style-position: outside !important;
  }
  ul { list-style-type: disc !important; }
  ol { list-style-type: decimal !important; }
  li {
    display: list-item !important;
    color: #374151 !important;
    padding-left: 0.2rem !important;
    margin-bottom: 4px !important;
    line-height: 1.6 !important;
  }
  li::marker { color: #4338ca !important; font-size: 1em !important; }
  li > ul, li > ol {
    margin: 4px 0 !important;
    padding-left: 1.25rem !important;
  }
  .ml-6 { margin-left: 0 !important; padding-left: 1.75rem !important; }
  .space-y-1   > li + li,
  .space-y-1\\.5 > li + li,
  .space-y-2   > li + li { margin-top: 0 !important; }
  .space-y-1   > li { margin-bottom: 4px !important; }
  .space-y-1\\.5 > li { margin-bottom: 6px !important; }
  .space-y-2   > li { margin-bottom: 8px !important; }

  /* ── Sections & cards ─────────────────────────────────────────── */
  section {
    margin-bottom: 20px !important;
  }
  .rounded-2xl { border-radius: 12px !important; }
  .mb-4 { margin-bottom: 12px !important; }

  /* ── Atomic blocks — never split (CSS hint, JS enforces it) ───── */
  [data-pdf-block="diagram"],
  [data-pdf-block="chart"],
  [data-pdf-block="atomic"],
  #mermaid-container,
  [id="mermaid-container"],
  [data-pdf-chart],
  .recharts-wrapper,
  [class*="recharts-wrapper"] {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    overflow: visible !important;
  }

  /* Mermaid diagram sizing & containment */
  #mermaid-container,
  [id="mermaid-container"] {
    padding: 20px !important;
    background: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 12px !important;
  }
  #mermaid-container svg,
  [id="mermaid-container"] svg {
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    max-height: 460px !important;
    display: block !important;
    margin: 0 auto !important;
  }

  /* Recharts container */
  [data-pdf-chart] > div { overflow: visible !important; }

  /* ── Code blocks ──────────────────────────────────────────────── */
  code {
    background: #f3f4f6 !important;
    color: #4338ca !important;
    padding: 2px 5px !important;
    border-radius: 4px !important;
    font-size: 12px !important;
  }
  pre {
    background: #f8fafc !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 8px !important;
    padding: 12px 16px !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  /* ── Color dots (question section bullets) ────────────────────── */
  .bg-indigo-400, .bg-indigo-500 { background-color: #4338ca !important; }
  .bg-purple-400, .bg-purple-500 { background-color: #7c3aed !important; }
  .bg-cyan-400,   .bg-cyan-500   { background-color: #0e7490 !important; }

  /* ── Spacing utilities ────────────────────────────────────────── */
  .space-y-8 > * + * { margin-top: 18px !important; }
  .space-y-6 > * + * { margin-top: 14px !important; }
  .space-y-4 > * + * { margin-top: 10px !important; }
  .p-5, .p-6, .sm\\:p-6 { padding: 16px !important; }
`

/* ────────────────────────────────────────────────────────────────────────────
 * 4. CLONE PATCH (runs inside html2canvas onclone callback)
 * ──────────────────────────────────────────────────────────────────────────── */

function patchClone(doc, captureWidth) {
  // 4a. Replace oklch/oklab in <style> tags
  doc.querySelectorAll('style').forEach((el) => {
    const t = el.textContent
    if (t.includes('oklch') || t.includes('oklab')) el.textContent = replaceModernColors(t)
  })

  // 4b. Replace oklch/oklab in inline style attributes
  doc.querySelectorAll('[style]').forEach((el) => {
    const s = el.getAttribute('style')
    if (s && (s.includes('oklch') || s.includes('oklab'))) {
      el.setAttribute('style', replaceModernColors(s))
    }
  })

  // 4c. Forward :root variable overrides
  const rs = window.getComputedStyle(document.documentElement)
  const ov = []
  for (let i = 0; i < rs.length; i++) {
    const p = rs[i]
    if (!p.startsWith('--')) continue
    const v = rs.getPropertyValue(p).trim()
    if (v.includes('oklch') || v.includes('oklab')) {
      ov.push(`${p}: ${replaceModernColors(v)};`)
    }
  }
  if (ov.length) {
    const s = doc.createElement('style')
    s.textContent = `:root { ${ov.join(' ')} }`
    doc.head.appendChild(s)
  }

  // 4d. Hide UI-only elements (e.g., toolbar)
  doc.querySelectorAll('[data-pdf-hide]').forEach((el) => { el.style.display = 'none' })

  // 4e. Fix gradient clip-text (renders blank in canvas)
  doc.querySelectorAll('.bg-clip-text, .text-transparent').forEach((el) => {
    el.style.backgroundImage      = 'none'
    el.style.webkitBackgroundClip = 'unset'
    el.style.backgroundClip       = 'unset'
    el.style.webkitTextFillColor  = '#1e1b4b'
    el.style.color                = '#1e1b4b'
  })

  // 4f. Inject the print stylesheet
  const print = doc.createElement('style')
  print.id = '__pdf_print__'
  print.textContent = PRINT_STYLESHEET
  doc.head.appendChild(print)

  // 4g. Lock root width — prevents responsive collapse during capture
  const root = doc.body.firstElementChild
  if (root) {
    root.style.width    = captureWidth + 'px'
    root.style.minWidth = captureWidth + 'px'
    root.style.maxWidth = captureWidth + 'px'
    root.style.background = '#ffffff'
    root.style.color      = '#111827'
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * 5. SVG DIMENSION FREEZE
 *    html2canvas sometimes treats width/height="100%" as 0 → invisible SVG.
 *    Convert to absolute pixel attributes from getBoundingClientRect, then
 *    restore on cleanup.
 * ──────────────────────────────────────────────────────────────────────────── */

function fixSvgDimensions(container) {
  const restorers = []
  container.querySelectorAll('svg').forEach((svg) => {
    const rect = svg.getBoundingClientRect()
    const ow = svg.getAttribute('width')
    const oh = svg.getAttribute('height')
    if (rect.width > 0 && rect.height > 0) {
      svg.setAttribute('width',  String(rect.width))
      svg.setAttribute('height', String(rect.height))
    }
    restorers.push(() => {
      if (ow !== null) svg.setAttribute('width',  ow); else svg.removeAttribute('width')
      if (oh !== null) svg.setAttribute('height', oh); else svg.removeAttribute('height')
    })
  })
  return () => restorers.forEach((fn) => fn())
}

/* ────────────────────────────────────────────────────────────────────────────
 * 6. RENDER WAIT — deterministic, multi-stage
 *    Replaces fragile single-setTimeout with explicit readiness checks.
 * ──────────────────────────────────────────────────────────────────────────── */

async function waitForFonts() {
  if (document.fonts && typeof document.fonts.ready?.then === 'function') {
    try { await document.fonts.ready } catch { /* ignore */ }
  }
}

async function waitForImages(element) {
  const images = element.querySelectorAll('img')
  const tasks  = Array.from(images).map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve()
    return new Promise((resolve) => {
      const done = () => {
        img.removeEventListener('load',  done)
        img.removeEventListener('error', done)
        resolve()
      }
      img.addEventListener('load',  done)
      img.addEventListener('error', done)
      setTimeout(done, 1500)  // per-image safety timeout
    })
  })
  await Promise.all(tasks)
}

/** Poll until predicate returns true or timeout elapses. */
async function pollReady(predicate, timeoutMs = RENDER_WAIT_TIMEOUT, intervalMs = 80) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    let ready = false
    try { ready = predicate() } catch { ready = false }
    if (ready) return true
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return false
}

async function waitForSvgs(element) {
  await pollReady(() => {
    const svgs = element.querySelectorAll('svg')
    if (svgs.length === 0) return true
    return Array.from(svgs).every((svg) => {
      const r = svg.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    })
  })
}

async function waitForCharts(element) {
  await pollReady(() => {
    const wrappers = element.querySelectorAll('[data-pdf-chart], .recharts-wrapper')
    if (wrappers.length === 0) return true
    return Array.from(wrappers).every((w) => {
      // Recharts is done when an SVG with non-zero size is mounted inside
      const svg = w.querySelector('svg')
      if (!svg) return false
      const r = svg.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    })
  })
}

function nextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
}

async function waitForRenderComplete(element) {
  await waitForFonts()
  await waitForImages(element)
  await waitForSvgs(element)
  await waitForCharts(element)
  await nextPaint()
  await new Promise((r) => setTimeout(r, 200))   // final settle
}

/* ────────────────────────────────────────────────────────────────────────────
 * 7. ATOMIC BLOCK INVENTORY
 *    Identifies blocks that must NOT be split across pages, in CSS pixels
 *    relative to the export root (multiplied by SCALE inside the planner).
 * ──────────────────────────────────────────────────────────────────────────── */

const ATOMIC_SELECTORS = [
  '[data-pdf-block="diagram"]',
  '[data-pdf-block="chart"]',
  '[data-pdf-block="atomic"]',
  '#mermaid-container',
  '[data-pdf-chart]',
  '.recharts-wrapper',
].join(',')

function getAtomicBlocks(rootElement) {
  const rootRect = rootElement.getBoundingClientRect()
  const list = []
  const seen = new Set()

  rootElement.querySelectorAll(ATOMIC_SELECTORS).forEach((el) => {
    if (seen.has(el)) return
    seen.add(el)
    const rect = el.getBoundingClientRect()
    if (rect.height <= 0) return
    list.push({
      cssTop:    rect.top    - rootRect.top,
      cssBottom: rect.bottom - rootRect.top,
      cssHeight: rect.height,
    })
  })

  // Sort top-down and remove descendants (a chart inside a section already covers it)
  list.sort((a, b) => a.cssTop - b.cssTop)
  const filtered = []
  for (const b of list) {
    const containedBy = filtered.find((p) => p.cssTop <= b.cssTop && p.cssBottom >= b.cssBottom)
    if (!containedBy) filtered.push(b)
  }
  return filtered
}

/** Heading positions — used to prevent orphan headings at page bottom. */
function getHeadingPositions(rootElement) {
  const rootRect = rootElement.getBoundingClientRect()
  const headings = []
  rootElement.querySelectorAll('h1, h2, h3').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.height <= 0) return
    headings.push({ cssTop: r.top - rootRect.top })
  })
  return headings.sort((a, b) => a.cssTop - b.cssTop)
}

/* ────────────────────────────────────────────────────────────────────────────
 * 8. PAGINATION ENGINE
 *    Decides where each page begins and ends in canvas pixels.
 * ──────────────────────────────────────────────────────────────────────────── */

function planPages({ canvasHeight, pageHeightPx, atomic, headings, scale }) {
  // Convert CSS-px coordinates to canvas-px (account for SCALE)
  const atomicPx = atomic.map((b) => ({
    top:    b.cssTop    * scale,
    bottom: b.cssBottom * scale,
    height: b.cssHeight * scale,
  }))
  const headingPx = headings.map((h) => h.cssTop * scale)

  const pages = []
  let cursor = 0
  let safetyCounter = 0
  const MAX_PAGES = 50  // hard guard against runaway loops

  while (cursor < canvasHeight && safetyCounter < MAX_PAGES) {
    safetyCounter++
    let pageEnd = Math.min(cursor + pageHeightPx, canvasHeight)

    // ── Last page: take the remainder ────────────────────────────────────
    if (pageEnd >= canvasHeight) {
      pages.push({ startY: cursor, endY: canvasHeight })
      break
    }

    // ── Rule 1: never split an atomic block ──────────────────────────────
    // Find a block that *starts after cursor* but *would be cut* by pageEnd.
    const splitting = atomicPx.find((b) =>
      b.top    > cursor   &&
      b.top    < pageEnd  &&
      b.bottom > pageEnd
    )

    if (splitting) {
      const beforeBlock = splitting.top - ATOMIC_BREAK_GAP

      if (beforeBlock > cursor) {
        const filledRatio = (beforeBlock - cursor) / pageHeightPx
        // If breaking before block leaves a reasonably-filled page, do it.
        // If the page would be very empty, still break (better empty page than
        // splitting an atomic block).
        pageEnd = beforeBlock
      }
      // else: block starts at/before cursor and is taller than a page —
      //       must split (rare; mermaid max-height keeps SVGs ≤ 460px).
    } else {
      // ── Rule 2: orphan heading prevention ──────────────────────────────
      // If a heading sits within the last HEADING_GUARD_PX of the page, push
      // the break up to the heading so it starts the next page.
      const orphan = headingPx.find((y) =>
        y > pageEnd - HEADING_GUARD_PX &&
        y < pageEnd &&
        y > cursor + pageHeightPx * 0.25       // require ≥25% page already filled
      )
      if (orphan != null) {
        pageEnd = orphan - 4  // small visual gap above heading
      }
    }

    // ── Safety: never produce zero / negative page advance ───────────────
    if (pageEnd <= cursor) {
      pageEnd = Math.min(cursor + pageHeightPx, canvasHeight)
    }

    pages.push({ startY: cursor, endY: pageEnd })
    cursor = pageEnd
  }

  return pages
}

/* ────────────────────────────────────────────────────────────────────────────
 * 9. BLANK-PAGE DETECTION
 *    Samples the ENTIRE candidate page (5 stripes), not a corner.
 *    Used only as last-resort guard against truly empty trailing pages.
 * ──────────────────────────────────────────────────────────────────────────── */

function isPageEmpty(canvas, startY, endY) {
  const height = endY - startY
  if (height < 24) return true   // less than ~24 canvas px = clearly nothing

  const ctx = canvas.getContext('2d')
  const W   = canvas.width

  const STRIPES  = 5
  const STRIPE_H = 4
  let totalSamples = 0
  let whiteSamples = 0

  for (let s = 0; s < STRIPES; s++) {
    const denom = STRIPES > 1 ? (STRIPES - 1) : 1
    const yPos  = Math.max(0,
      Math.min(canvas.height - STRIPE_H,
        startY + Math.floor((height - STRIPE_H) * (s / denom))
      )
    )
    let imgData
    try {
      imgData = ctx.getImageData(0, yPos, W, STRIPE_H).data
    } catch {
      // CORS-tainted canvas — bail to "not empty" to avoid losing real content
      return false
    }
    // Sample every 4th pixel for performance (every 16 bytes)
    for (let i = 0; i < imgData.length; i += 16) {
      totalSamples++
      if (imgData[i] > 248 && imgData[i + 1] > 248 && imgData[i + 2] > 248) {
        whiteSamples++
      }
    }
  }
  return (whiteSamples / totalSamples) > 0.995  // >99.5% white = truly empty
}

/* ────────────────────────────────────────────────────────────────────────────
 * 10. CANVAS UTILITIES
 * ──────────────────────────────────────────────────────────────────────────── */

function cropCanvas(src, startY, endY) {
  const h = Math.max(1, endY - startY)
  const c = document.createElement('canvas')
  c.width = src.width
  c.height = h
  c.getContext('2d').drawImage(src, 0, startY, src.width, h, 0, 0, src.width, h)
  return c
}

/* ────────────────────────────────────────────────────────────────────────────
 * 11. HEADER & FOOTER
 *     Footer occupies the reserved FOOTER_H_MM zone — content image height
 *     is always ≤ CONTENT_H_MM, so there is no possibility of overlap.
 * ──────────────────────────────────────────────────────────────────────────── */

function injectHeader(container, topic) {
  const el = document.createElement('div')
  el.id = '__pdf_hdr__'
  el.style.cssText = `
    background: linear-gradient(135deg, #0f0f1a 0%, #1e1b4b 100%);
    padding: 20px 28px 18px; margin-bottom: 28px; border-radius: 14px;
    display: flex; align-items: center; justify-content: space-between;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `
  el.innerHTML = `
    <div>
      <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:3px">ExamCraft</div>
      <div style="font-size:11px;color:#818cf8">AI-powered exam-oriented notes &amp; revision</div>
    </div>
    <div style="text-align:right">
      ${topic ? `<div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:3px">${topic}</div>` : ''}
      <div style="font-size:11px;color:#94a3b8">
        ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
      </div>
    </div>`
  container.insertBefore(el, container.firstChild)
  return () => el.remove()
}

function drawFooter(pdf, n, total) {
  // White block over reserved footer zone (covers any tiny canvas overflow)
  pdf.setFillColor(255, 255, 255)
  pdf.rect(0, A4_H_MM - FOOTER_H_MM, A4_W_MM, FOOTER_H_MM, 'F')

  // Separator line — 9.5mm from bottom
  pdf.setDrawColor(99, 102, 241)
  pdf.setLineWidth(0.35)
  pdf.line(10, A4_H_MM - 9.5, A4_W_MM - 10, A4_H_MM - 9.5)

  // Footer text
  pdf.setFontSize(7.5)
  pdf.setTextColor(160, 160, 168)
  pdf.text(
    'ExamCraft · Generated ' + new Date().toLocaleDateString('en-IN'),
    10,
    A4_H_MM - 4.5
  )
  pdf.setTextColor(99, 102, 241)
  pdf.text('Page ' + n + ' / ' + total, A4_W_MM - 28, A4_H_MM - 4.5)
}

/* ────────────────────────────────────────────────────────────────────────────
 * 12. PUBLIC API: exportToPdf(element, filename, topic)
 * ──────────────────────────────────────────────────────────────────────────── */

let __exportInFlight = false  // export lock — prevents double-clicks colliding

export async function exportToPdf(element, filename = 'ExamCraft', topic = '') {
  if (!element) throw new Error('exportToPdf: element is required')
  if (__exportInFlight) return    // silently ignore concurrent calls
  __exportInFlight = true

  try {
    // Lazy-load heavy deps so they don't bloat the initial bundle
    const [h2c, jpdf] = await Promise.all([import('html2canvas'), import('jspdf')])
    const html2canvas = h2c.default
    const { jsPDF }   = jpdf

    // Snapshot original inline styles for restoration
    const orig = {
      background: element.style.background,
      padding:    element.style.padding,
      width:      element.style.width,
      minWidth:   element.style.minWidth,
      maxWidth:   element.style.maxWidth,
      boxSizing:  element.style.boxSizing,
    }

    // Lock the export container to a stable, viewport-independent width so
    // capture is identical on mobile, tablet, desktop, and CI.
    element.style.background = '#ffffff'
    element.style.padding    = '24px'
    element.style.width      = CAPTURE_WIDTH + 'px'
    element.style.minWidth   = CAPTURE_WIDTH + 'px'
    element.style.maxWidth   = CAPTURE_WIDTH + 'px'
    element.style.boxSizing  = 'border-box'

    // Apply pre-capture transformations
    const removeHeader  = injectHeader(element, topic)
    const restoreVars   = injectCssVariableOverrides()
    const restoreGCS    = patchGetComputedStyle()
    const restoreStyles = patchLiveStyles()

    // Wait for everything to be visually complete BEFORE we measure or capture
    await waitForRenderComplete(element)

    // Freeze SVG dimensions AFTER render wait (so getBoundingClientRect is real)
    const restoreSvgs = fixSvgDimensions(element)

    // Inventory atomic blocks & headings while DOM still has live geometry
    const atomic   = getAtomicBlocks(element)
    const headings = getHeadingPositions(element)

    let canvas
    try {
      canvas = await html2canvas(element, {
        scale:           SCALE,
        useCORS:         true,
        allowTaint:      true,
        backgroundColor: '#ffffff',
        logging:         false,
        windowWidth:     CAPTURE_WIDTH + 48,
        x: 0, y: 0,
        width:  element.scrollWidth,
        height: element.scrollHeight,
        onclone: (d) => patchClone(d, CAPTURE_WIDTH),
      })
    } finally {
      // Always restore — even on capture failure
      removeHeader()
      restoreSvgs()
      restoreVars()
      restoreGCS()
      restoreStyles()
      Object.assign(element.style, orig)
    }

    // ── Plan pages using atomic-block-aware engine ──────────────────────────
    const pageHeightPx = Math.round((CONTENT_H_MM / A4_W_MM) * canvas.width)

    let pages = planPages({
      canvasHeight: canvas.height,
      pageHeightPx,
      atomic,
      headings,
      scale: SCALE,
    })

    // ── Filter out provably empty pages (full-page sample, not corner) ──────
    pages = pages.filter(({ startY, endY }) => !isPageEmpty(canvas, startY, endY))

    // Failsafe: at least one page
    if (pages.length === 0) pages = [{ startY: 0, endY: canvas.height }]

    // ── Build the PDF ───────────────────────────────────────────────────────
    const pdf = new jsPDF('p', 'mm', 'a4')

    pages.forEach(({ startY, endY }, i) => {
      if (i > 0) pdf.addPage()

      const strip = cropCanvas(canvas, startY, endY)
      const data  = strip.toDataURL('image/png', 1.0)

      // Strip height in mm — clamped to CONTENT_H_MM so it can NEVER overlap footer.
      const naturalHmm = (strip.height * A4_W_MM) / canvas.width
      const placedHmm  = Math.min(naturalHmm, CONTENT_H_MM)

      pdf.addImage(data, 'PNG', 0, 0, A4_W_MM, placedHmm, '', 'FAST')
      drawFooter(pdf, i + 1, pages.length)
    })

    pdf.save(filename + '-' + Date.now() + '.pdf')
  } finally {
    __exportInFlight = false
  }
}