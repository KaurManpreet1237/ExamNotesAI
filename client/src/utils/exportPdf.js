/**
 * exportPdf.js — html2canvas + jsPDF
 *
 * Professional PDF export with all layout fixes:
 *   1. oklch/oklab → rgb() (4-layer interception)
 *   2. Faded text: dark theme grays invisible on white PDF
 *   3. Numbered/bulleted list alignment
 *   4. Diagram/chart cut at page breaks
 *   5. Footer collision — content reserved above footer zone
 *   6. Blank page prevention
 *   7. Diagram oversizing — max-height constrained
 *   8. Professional typography rhythm
 */

const A4_W_MM       = 210
const A4_H_MM       = 297
const FOOTER_H_MM   = 14          // footer zone reserved at bottom
const CONTENT_H_MM  = A4_H_MM - FOOTER_H_MM  // 283mm usable per page
const CAPTURE_WIDTH = 960
const SCALE         = 2

// ─── Color converters ─────────────────────────────────────────────────────────
function oklabToRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b
  const ll = l_ ** 3, mm = m_ ** 3, ss = s_ ** 3
  const rL =  4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss
  const gL = -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss
  const bL = -0.0041960863 * ll - 0.7034186147 * mm + 1.7076147010 * ss
  const g  = (x) => Math.round(Math.max(0, Math.min(1,
    x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1/2.4) - 0.055)) * 255)
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

// ─── Layer 1: :root CSS variable override ────────────────────────────────────
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

// ─── Layer 2: getComputedStyle proxy ─────────────────────────────────────────
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

// ─── Layer 3: live <style> tag patching ──────────────────────────────────────
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

// ─── Layer 4: onclone — color + layout comprehensive fix ─────────────────────
function patchClone(doc, captureWidth) {

  // 4a. Fix oklch/oklab in cloned styles
  doc.querySelectorAll('style').forEach((el) => {
    const t = el.textContent
    if (t.includes('oklch') || t.includes('oklab')) el.textContent = replaceModernColors(t)
  })
  doc.querySelectorAll('[style]').forEach((el) => {
    const s = el.getAttribute('style')
    if (s && (s.includes('oklch') || s.includes('oklab'))) el.setAttribute('style', replaceModernColors(s))
  })

  // 4b. Inject :root variable overrides into clone
  const rs = window.getComputedStyle(document.documentElement)
  const ov = []
  for (let i = 0; i < rs.length; i++) {
    const p = rs[i]
    if (!p.startsWith('--')) continue
    const v = rs.getPropertyValue(p).trim()
    if (v.includes('oklch') || v.includes('oklab')) ov.push(`${p}: ${replaceModernColors(v)};`)
  }
  if (ov.length) {
    const s = doc.createElement('style')
    s.textContent = `:root { ${ov.join(' ')} }`
    doc.head.appendChild(s)
  }

  // 4c. Hide toolbar
  doc.querySelectorAll('[data-pdf-hide]').forEach((el) => { el.style.display = 'none' })

  // 4d. Fix gradient clip-text
  doc.querySelectorAll('.bg-clip-text, .text-transparent').forEach((el) => {
    el.style.backgroundImage      = 'none'
    el.style.webkitBackgroundClip = 'unset'
    el.style.backgroundClip       = 'unset'
    el.style.webkitTextFillColor  = '#1e1b4b'
    el.style.color                = '#1e1b4b'
  })

  // 4e. THE KEY PRINT STYLESHEET
  const print = doc.createElement('style')
  print.id = '__pdf_print__'
  print.textContent = `

    /* ═══════════════════════════════════════════════════
       GLOBAL RESET FOR PRINT
    ═══════════════════════════════════════════════════ */
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box !important;
    }

    /* ═══════════════════════════════════════════════════
       BODY & ROOT BASELINE
    ═══════════════════════════════════════════════════ */
    body {
      background: #ffffff !important;
      color: #111827 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif !important;
      font-size: 14px !important;
      line-height: 1.6 !important;
    }

    /* ═══════════════════════════════════════════════════
       TYPOGRAPHY HIERARCHY — Professional spacing system
       H1 → H2 → H3 → body: consistent rhythm
    ═══════════════════════════════════════════════════ */
    h1 {
      color: #1e1b4b !important;
      font-size: 22px !important;
      font-weight: 800 !important;
      margin-top: 28px !important;
      margin-bottom: 14px !important;
      padding-bottom: 8px !important;
      border-bottom: 2px solid #e0e7ff !important;
      line-height: 1.3 !important;
    }
    h2 {
      color: #1e1b4b !important;
      font-size: 17px !important;
      font-weight: 700 !important;
      margin-top: 22px !important;
      margin-bottom: 10px !important;
      line-height: 1.35 !important;
    }
    h3 {
      color: #374151 !important;
      font-size: 15px !important;
      font-weight: 600 !important;
      margin-top: 16px !important;
      margin-bottom: 8px !important;
      line-height: 1.4 !important;
    }
    h4, h5, h6 {
      color: #374151 !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      margin-top: 12px !important;
      margin-bottom: 6px !important;
    }

    /* Prevent orphaned headings — keep heading with its first content */
    h1, h2, h3, h4 {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    /* ═══════════════════════════════════════════════════
       PARAGRAPH & TEXT
    ═══════════════════════════════════════════════════ */
    p {
      color: #374151 !important;
      margin-top: 0 !important;
      margin-bottom: 10px !important;
      line-height: 1.65 !important;
    }
    strong, b {
      color: #111827 !important;
      font-weight: 700 !important;
    }

    /* ═══════════════════════════════════════════════════
       TEXT COLORS — convert dark theme grays to readable
    ═══════════════════════════════════════════════════ */
    .text-gray-100, .text-gray-200, .text-gray-300 {
      color: #1f2937 !important;
    }
    .text-gray-400, .text-gray-500 {
      color: #374151 !important;
    }
    .text-gray-600, .text-gray-700 {
      color: #4b5563 !important;
    }
    .text-indigo-300, .text-indigo-400 { color: #4338ca !important; }
    .text-purple-300, .text-purple-400 { color: #7c3aed !important; }
    .text-cyan-300,   .text-cyan-400   { color: #0e7490 !important; }
    .text-green-300,  .text-green-400  { color: #15803d !important; }
    .text-rose-300,   .text-rose-400   { color: #be123c !important; }
    .text-amber-300,  .text-amber-400  { color: #b45309 !important; }
    .text-white { color: #111827 !important; }

    .marker\\:text-indigo-400::marker { color: #4338ca !important; }
    .marker\\:text-indigo-500::marker { color: #4338ca !important; }

    /* ═══════════════════════════════════════════════════
       DARK BACKGROUNDS → LIGHT
    ═══════════════════════════════════════════════════ */
    [class*="bg-white/"], [class*="bg-black/"],
    [class*="from-black"], [class*="from-[#"],
    [class*="via-[#"], [class*="to-[#"] {
      background: #ffffff !important;
      background-image: none !important;
    }
    .bg-white\\/3, .bg-white\\/5, .bg-white\\/8 {
      background: #f9fafb !important;
    }
    .bg-indigo-500\\/10, .bg-indigo-500\\/12 { background: #eef2ff !important; }
    .bg-purple-500\\/10, .bg-purple-500\\/12 { background: #faf5ff !important; }
    .bg-cyan-500\\/10,   .bg-cyan-500\\/12   { background: #ecfeff !important; }
    .bg-rose-500\\/10,   .bg-rose-500\\/12   { background: #fff1f2 !important; }
    .bg-green-500\\/10,  .bg-green-500\\/12  { background: #f0fdf4 !important; }

    [class*="border-white/"] { border-color: #e5e7eb !important; }
    [class*="border-indigo-500/"] { border-color: #c7d2fe !important; }
    [class*="border-purple-500/"] { border-color: #e9d5ff !important; }
    [class*="border-cyan-500/"]   { border-color: #a5f3fc !important; }
    [class*="border-rose-500/"]   { border-color: #fecdd3 !important; }

    /* ═══════════════════════════════════════════════════
       BULLET & NUMBERED LIST — Professional alignment
       Root cause: html2canvas renders margin-left
       differently from padding-left for list markers.
       Fix: force padding-left + outside positioning.
    ═══════════════════════════════════════════════════ */
    ul, ol {
      margin: 0 !important;
      margin-bottom: 10px !important;
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
    ol li { color: #374151 !important; }
    li::marker {
      color: #4338ca !important;
      font-size: 1em !important;
    }

    /* Nested lists — tighter indent for second level */
    li > ul, li > ol {
      margin-top: 4px !important;
      margin-bottom: 4px !important;
      padding-left: 1.25rem !important;
    }

    /* Tailwind ml-6 override: the most common list wrapper */
    .ml-6 {
      margin-left: 0 !important;
      padding-left: 1.75rem !important;
    }

    /* space-y utilities on lists — normalize to margin-bottom */
    .space-y-1   > li + li,
    .space-y-1\\.5 > li + li,
    .space-y-2   > li + li {
      margin-top: 0 !important;
    }
    .space-y-1   > li { margin-bottom: 4px  !important; }
    .space-y-1\\.5 > li { margin-bottom: 6px  !important; }
    .space-y-2   > li { margin-bottom: 8px  !important; }

    /* ═══════════════════════════════════════════════════
       SECTION CARDS — consistent spacing
    ═══════════════════════════════════════════════════ */
    section {
      margin-bottom: 20px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* The rounded card wrapping notes/diagram/chart */
    .rounded-2xl {
      border-radius: 12px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* Section header bars */
    .from-indigo-500\\/12 { background: #eef2ff !important; }
    .from-purple-500\\/12 { background: #faf5ff !important; }
    .from-cyan-500\\/12   { background: #ecfeff !important; }
    .from-rose-500\\/12   { background: #fff1f2 !important; }
    .from-green-500\\/12  { background: #f0fdf4 !important; }

    /* Section header bottom margin */
    .mb-4 { margin-bottom: 12px !important; }

    /* ═══════════════════════════════════════════════════
       MERMAID DIAGRAM — prevent cut & size control
       Max-height prevents oversized diagrams from
       overflowing into footer or next page.
    ═══════════════════════════════════════════════════ */
    #mermaid-container,
    [id="mermaid-container"] {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      overflow: visible !important;
      padding: 20px !important;
      background: #ffffff !important;
      border: 1px solid #e5e7eb !important;
      border-radius: 12px !important;
    }

    /* SVG: constrain height so diagram fits in one page safely */
    #mermaid-container svg,
    [id="mermaid-container"] svg {
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      max-height: 420px !important;
      overflow: visible !important;
      display: block !important;
      margin: 0 auto !important;
    }

    /* ═══════════════════════════════════════════════════
       RECHARTS — prevent cut + stable sizing
    ═══════════════════════════════════════════════════ */
    .recharts-wrapper,
    [class*="recharts-wrapper"],
    [data-pdf-chart] {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      overflow: visible !important;
    }

    /* Chart outer container */
    [data-pdf-chart] > div {
      overflow: visible !important;
    }

    /* ═══════════════════════════════════════════════════
       CODE BLOCKS
    ═══════════════════════════════════════════════════ */
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
      overflow: visible !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* ═══════════════════════════════════════════════════
       COLOUR DOTS (question section bullets)
    ═══════════════════════════════════════════════════ */
    .bg-indigo-400, .bg-indigo-500 { background-color: #4338ca !important; }
    .bg-purple-400, .bg-purple-500 { background-color: #7c3aed !important; }
    .bg-cyan-400,   .bg-cyan-500   { background-color: #0e7490 !important; }

    /* ═══════════════════════════════════════════════════
       SPACING UTILITIES — tighten vertical rhythm
    ═══════════════════════════════════════════════════ */
    .space-y-8 > * + * { margin-top: 18px !important; }
    .space-y-6 > * + * { margin-top: 14px !important; }
    .space-y-4 > * + * { margin-top: 10px !important; }
    .p-5, .p-6, .sm\\:p-6 { padding: 16px !important; }

    /* ═══════════════════════════════════════════════════
       STAR RATING ROWS in Sub Topics
    ═══════════════════════════════════════════════════ */
    .mb-4 > div:first-child {
      margin-bottom: 6px !important;
    }
  `
  doc.head.appendChild(print)

  // 4f. Lock root width for consistent A4 scaling
  const root = doc.body.firstElementChild
  if (root) {
    root.style.width    = captureWidth + 'px'
    root.style.minWidth = captureWidth + 'px'
    root.style.maxWidth = captureWidth + 'px'
    root.style.background = '#ffffff'
    root.style.color      = '#111827'
  }
}

// ─── SVG dimensions ───────────────────────────────────────────────────────────
function fixSvgDimensions(container) {
  const svgs = container.querySelectorAll('svg')
  const res  = []
  svgs.forEach((svg) => {
    const rect = svg.getBoundingClientRect()
    const ow = svg.getAttribute('width'), oh = svg.getAttribute('height')
    if (rect.width > 0 && rect.height > 0) {
      svg.setAttribute('width',  String(rect.width))
      svg.setAttribute('height', String(rect.height))
    }
    res.push(() => {
      if (ow !== null) svg.setAttribute('width',  ow); else svg.removeAttribute('width')
      if (oh !== null) svg.setAttribute('height', oh); else svg.removeAttribute('height')
    })
  })
  return () => res.forEach((fn) => fn())
}

// ─── Smart page break — find whitest row near target ─────────────────────────
function findSafeBreak(canvas, targetY, searchPx = 60) {
  const ctx  = canvas.getContext('2d')
  const W    = canvas.width
  const top  = Math.max(0, targetY - searchPx)
  const len  = Math.min(canvas.height, targetY + searchPx) - top
  if (len <= 0) return targetY
  const data = ctx.getImageData(0, top, W, len).data
  let bestRow = targetY, bestScore = -1
  const step  = Math.max(1, Math.floor(W / 300))
  for (let row = 0; row < len; row++) {
    let white = 0, total = 0
    for (let x = 0; x < W; x += step) {
      const i = (row * W + x) * 4
      if ((data[i] + data[i+1] + data[i+2]) / 3 > 240) white++
      total++
    }
    const score = white / total
    if (score > bestScore) { bestScore = score; bestRow = top + row }
  }
  return bestRow
}

// ─── Blank page detection ─────────────────────────────────────────────────────
function isPageMostlyEmpty(canvas, startY, endY) {
  // A page is "empty" if it's under 30px tall, OR if 99%+ pixels are white
  const height = endY - startY
  if (height < 30) return true

  const ctx      = canvas.getContext('2d')
  const sampleH  = Math.min(height, 80)         // sample first 80px rows
  const sampleW  = Math.min(canvas.width, 200)   // sample 200px columns
  const data     = ctx.getImageData(0, startY, sampleW, sampleH).data
  let whiteCount = 0
  const total    = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 248 && data[i+1] > 248 && data[i+2] > 248) whiteCount++
  }
  return (whiteCount / total) > 0.985
}

// ─── Canvas crop ──────────────────────────────────────────────────────────────
function cropCanvas(src, startY, endY) {
  const h = endY - startY
  const c = document.createElement('canvas')
  c.width = src.width; c.height = h
  c.getContext('2d').drawImage(src, 0, startY, src.width, h, 0, 0, src.width, h)
  return c
}

// ─── Header injection ─────────────────────────────────────────────────────────
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

// ─── Footer renderer ──────────────────────────────────────────────────────────
// The footer occupies the bottom FOOTER_H_MM of each A4 page.
// Content images are placed from y=0 and sized to CONTENT_H_MM max,
// so content never reaches the footer zone.
function addFooter(pdf, n, total) {
  // White background block over footer zone
  pdf.setFillColor(255, 255, 255)
  pdf.rect(0, A4_H_MM - FOOTER_H_MM, A4_W_MM, FOOTER_H_MM, 'F')

  // Separator line — sits 10mm from bottom
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export async function exportToPdf(element, filename = 'ExamCraft', topic = '') {
  const [h2c, jpdf] = await Promise.all([import('html2canvas'), import('jspdf')])
  const html2canvas  = h2c.default
  const { jsPDF }    = jpdf

  const orig = {
    background: element.style.background,
    padding:    element.style.padding,
    width:      element.style.width,
    minWidth:   element.style.minWidth,
    maxWidth:   element.style.maxWidth,
    boxSizing:  element.style.boxSizing,
  }

  element.style.background = '#ffffff'
  element.style.padding    = '24px'
  element.style.width      = CAPTURE_WIDTH + 'px'
  element.style.minWidth   = CAPTURE_WIDTH + 'px'
  element.style.maxWidth   = CAPTURE_WIDTH + 'px'
  element.style.boxSizing  = 'border-box'

  const removeHeader  = injectHeader(element, topic)
  const restoreSvgs   = fixSvgDimensions(element)
  const restoreVars   = injectCssVariableOverrides()
  const restoreGCS    = patchGetComputedStyle()
  const restoreStyles = patchLiveStyles()

  // Wait for Recharts + Mermaid to fully paint
  await new Promise((r) => setTimeout(r, 450))

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
    removeHeader(); restoreSvgs(); restoreVars(); restoreGCS(); restoreStyles()
    Object.assign(element.style, orig)
  }

  // ── Page height in canvas pixels — based on CONTENT area only ──
  // KEY FIX: use CONTENT_H_MM (not A4_H_MM) so content never
  // reaches the footer zone. Footer sits safely below content.
  const pageH = Math.round((CONTENT_H_MM / A4_W_MM) * canvas.width)

  const rawPages = []
  let startY = 0

  while (startY < canvas.height) {
    let endY = Math.min(startY + pageH, canvas.height)
    if (endY < canvas.height) {
      // Search ±80px for a clean white break row
      const safeY = findSafeBreak(canvas, endY, 80)
      // Only use safe break if it's within a reasonable range
      // Prevents findSafeBreak from eating too much content (causing empty pages)
      if (safeY > startY && (safeY - startY) <= pageH * 1.05) {
        endY = safeY
      }
    }
    // Guard: never create a zero-height page
    if (endY <= startY) endY = Math.min(startY + pageH, canvas.height)
    rawPages.push({ startY, endY })
    startY = endY
  }

  // ── Filter out blank/empty pages ──────────────────────────────────────────
  // This removes the trailing blank page that can appear when
  // findSafeBreak creates a tiny leftover strip at the end.
  const pages = rawPages.filter(({ startY: s, endY: e }) =>
    !isPageMostlyEmpty(canvas, s, e)
  )

  // Safety: always keep at least one page
  if (pages.length === 0 && rawPages.length > 0) pages.push(rawPages[0])

  // ── Build PDF ─────────────────────────────────────────────────────────────
  const pdf = new jsPDF('p', 'mm', 'a4')

  pages.forEach(({ startY: s, endY: e }, i) => {
    if (i > 0) pdf.addPage()

    const strip = cropCanvas(canvas, s, e)
    const data  = strip.toDataURL('image/png', 1.0)

    // Image height in mm — will always be ≤ CONTENT_H_MM
    // because strip height ≤ pageH canvas pixels
    const hMM = (strip.height * A4_W_MM) / canvas.width

    // Place content image from top — capped at CONTENT_H_MM
    pdf.addImage(data, 'PNG', 0, 0, A4_W_MM, Math.min(hMM, CONTENT_H_MM), '', 'FAST')

    // Footer drawn in reserved zone below CONTENT_H_MM
    addFooter(pdf, i + 1, pages.length)
  })

  pdf.save(filename + '-' + Date.now() + '.pdf')
}