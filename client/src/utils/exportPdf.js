/**
 * exportPdf.js — html2canvas + jsPDF  (Final production version)
 *
 * All issues fixed:
 *   1. oklch/oklab → rgb  (4 interception layers)
 *   2. Faded dark-theme text on white PDF
 *   3. List alignment (margin vs padding)
 *   4. Diagram / chart NOT cut — section positions measured before capture,
 *      page breaks placed around sections never through them
 *   5. Diagram NOT oversized — Mermaid SVG capped to 450px height max
 *   6. Chart always fully rendered — explicit 300px capture height
 */

const A4_W_MM       = 210
const A4_H_MM       = 297
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
  const g  = x => Math.round(Math.max(0, Math.min(1,
    x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1/2.4) - 0.055)) * 255)
  return `rgb(${g(rL)},${g(gL)},${g(bL)})`
}
const oklchToRgb = (L, C, H) => {
  const r = H * Math.PI / 180
  return oklabToRgb(L, C * Math.cos(r), C * Math.sin(r))
}
const parseVal = v => {
  if (!v || v === 'none') return 0
  if (typeof v === 'string' && v.endsWith('%')) return parseFloat(v) / 100
  return parseFloat(v)
}
const withAlpha = (rgb, alpha) => {
  if (!alpha || alpha === '1' || alpha === '100%') return rgb
  const m = rgb.match(/\d+/g)
  return m ? `rgba(${m[0]},${m[1]},${m[2]},${parseVal(alpha)})` : rgb
}

const OKLCH_RE = /oklch\(\s*([^\s)]+)\s+([^\s)]+)\s+([^\s)/]+)(?:\s*\/\s*([^\s)]+))?\s*\)/gi
const OKLAB_RE = /oklab\(\s*([^\s)]+)\s+([^\s)]+)\s+([^\s)/]+)(?:\s*\/\s*([^\s)]+))?\s*\)/gi

function replaceModernColors(str) {
  if (typeof str !== 'string') return str
  if (!str.includes('oklch') && !str.includes('oklab')) return str
  return str
    .replace(OKLCH_RE, (_, l, c, h, a) => withAlpha(oklchToRgb(parseVal(l), parseVal(c), parseVal(h)), a))
    .replace(OKLAB_RE, (_, l, a, b, al) => withAlpha(oklabToRgb(parseVal(l), parseVal(a), parseVal(b)), al))
}

// ─── Layer 1: :root CSS variable injection ───────────────────────────────────
function injectCssVariableOverrides() {
  const rs = window.getComputedStyle(document.documentElement)
  const ov = []
  for (let i = 0; i < rs.length; i++) {
    const p = rs[i]; if (!p.startsWith('--')) continue
    const v = rs.getPropertyValue(p).trim()
    if (v.includes('oklch') || v.includes('oklab')) ov.push(`${p}:${replaceModernColors(v)};`)
  }
  if (!ov.length) return () => {}
  const s = document.createElement('style')
  s.id = '__pdf_vars__'
  s.textContent = `:root{${ov.join('')}}`
  document.head.appendChild(s)
  return () => s.remove()
}

// ─── Layer 2: getComputedStyle proxy ─────────────────────────────────────────
function patchGetComputedStyle() {
  const orig = window.getComputedStyle
  window.getComputedStyle = function (...a) {
    const st = orig.apply(this, a)
    return new Proxy(st, {
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
  document.querySelectorAll('style').forEach(el => {
    const orig = el.textContent
    if (orig.includes('oklch') || orig.includes('oklab')) {
      el.textContent = replaceModernColors(orig)
      patches.push({ el, orig })
    }
  })
  return () => patches.forEach(({ el, orig }) => { el.textContent = orig })
}

// ─── Layer 4: onclone — colour + layout + diagram size ───────────────────────
function patchClone(doc, captureWidth) {
  // Fix oklch/oklab in cloned styles
  doc.querySelectorAll('style').forEach(el => {
    const t = el.textContent
    if (t.includes('oklch') || t.includes('oklab')) el.textContent = replaceModernColors(t)
  })
  doc.querySelectorAll('[style]').forEach(el => {
    const s = el.getAttribute('style')
    if (s && (s.includes('oklch') || s.includes('oklab'))) el.setAttribute('style', replaceModernColors(s))
  })

  // :root variable override in clone
  const rs = window.getComputedStyle(document.documentElement)
  const ov = []
  for (let i = 0; i < rs.length; i++) {
    const p = rs[i]; if (!p.startsWith('--')) continue
    const v = rs.getPropertyValue(p).trim()
    if (v.includes('oklch') || v.includes('oklab')) ov.push(`${p}:${replaceModernColors(v)};`)
  }
  if (ov.length) {
    const s = doc.createElement('style'); s.textContent = `:root{${ov.join('')}}`
    doc.head.appendChild(s)
  }

  // Hide toolbar
  doc.querySelectorAll('[data-pdf-hide]').forEach(el => { el.style.display = 'none' })

  // Fix gradient clip-text
  doc.querySelectorAll('.bg-clip-text,.text-transparent').forEach(el => {
    el.style.backgroundImage = 'none'
    el.style.webkitBackgroundClip = 'unset'
    el.style.backgroundClip = 'unset'
    el.style.webkitTextFillColor = '#1e1b4b'
    el.style.color = '#1e1b4b'
  })

  // ── FIX: Scale Mermaid SVG to fit page ────────────────────────────────────
  // Without this, the SVG renders at native size (often 800×700px) which makes
  // the diagram fill an entire PDF page.  Cap height at 420px.
  const MAX_DIAGRAM_HEIGHT = 420  // px at capture resolution
  const MAX_DIAGRAM_WIDTH  = captureWidth - 80

  const mermaidContainer = doc.querySelector('#mermaid-container')
  if (mermaidContainer) {
    const svg = mermaidContainer.querySelector('svg')
    if (svg) {
      // Try to get natural dimensions from viewBox or width/height attributes
      let nw = parseFloat(svg.getAttribute('width')  || 0)
      let nh = parseFloat(svg.getAttribute('height') || 0)
      const vb = svg.getAttribute('viewBox')
      if (vb) {
        const parts = vb.trim().split(/[\s,]+/).map(Number)
        if (parts.length >= 4) { nw = parts[2]; nh = parts[3] }
      }

      if (nw > 0 && nh > 0) {
        const scale = Math.min(MAX_DIAGRAM_WIDTH / nw, MAX_DIAGRAM_HEIGHT / nh, 1)
        const fw = Math.round(nw * scale)
        const fh = Math.round(nh * scale)
        svg.setAttribute('width',  String(fw))
        svg.setAttribute('height', String(fh))
        svg.style.width  = fw + 'px'
        svg.style.height = fh + 'px'
        svg.style.maxWidth = '100%'
        svg.style.display = 'block'
        svg.style.margin  = '0 auto'
      } else {
        // Fallback: CSS-only constraint
        svg.style.maxWidth  = MAX_DIAGRAM_WIDTH + 'px'
        svg.style.maxHeight = MAX_DIAGRAM_HEIGHT + 'px'
        svg.style.width  = '100%'
        svg.style.height = 'auto'
      }
    }
    // Constrain the container too
    mermaidContainer.style.maxHeight = (MAX_DIAGRAM_HEIGHT + 60) + 'px'
    mermaidContainer.style.overflow  = 'hidden'
  }

  // ── FIX: Ensure Recharts containers have explicit pixel height ─────────────
  doc.querySelectorAll('.recharts-wrapper').forEach(el => {
    if (!el.style.height || el.style.height === '' || el.style.height.includes('%')) {
      el.style.height = '300px'
    }
  })
  // Also target the parent container we put at 288px
  doc.querySelectorAll('[style*="height: 288px"], [style*="height:288px"]').forEach(el => {
    el.style.height = '300px'
    el.style.minHeight = '300px'
  })

  // ── PRINT STYLESHEET ───────────────────────────────────────────────────────
  const css = doc.createElement('style')
  css.id = '__pdf_print__'
  css.textContent = `
    *,*::before,*::after{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}

    /* Headings */
    h1,h2,h3,h4,h5,h6{color:#1e1b4b!important}

    /* Body text — dark theme grays → readable on white */
    .text-gray-100,.text-gray-200,.text-gray-300{color:#1f2937!important}
    .text-gray-400,.text-gray-500{color:#374151!important}
    .text-gray-600,.text-gray-700{color:#4b5563!important}
    p,li,span,td,th{color:#374151!important}

    /* Accent colours */
    .text-indigo-300,.text-indigo-400{color:#4338ca!important}
    .text-purple-300,.text-purple-400{color:#7c3aed!important}
    .text-cyan-300,.text-cyan-400{color:#0e7490!important}
    .text-green-300,.text-green-400{color:#15803d!important}
    .text-rose-300,.text-rose-400{color:#be123c!important}
    .text-amber-300,.text-amber-400{color:#b45309!important}
    .text-white{color:#111827!important}

    /* Dark backgrounds → white */
    [class*="bg-white/"],[class*="bg-black/"],
    [class*="from-black"],[class*="from-["]{
      background:#ffffff!important;background-image:none!important
    }
    .bg-white\\/3,.bg-white\\/5,.bg-white\\/8{background:#f9fafb!important}

    /* Dark borders → light */
    [class*="border-white/"]{border-color:#e5e7eb!important}
    [class*="border-indigo-500/"]{border-color:#c7d2fe!important}
    [class*="border-purple-500/"]{border-color:#e9d5ff!important}
    [class*="border-cyan-500/"]{border-color:#a5f3fc!important}
    [class*="border-rose-500/"]{border-color:#fecdd3!important}

    /* ── NUMBERED & BULLET LIST ALIGNMENT ────────────────────────────────
       Root cause: Tailwind uses ml-6 (margin-left) not padding-left.
       html2canvas treats margin-left differently — the marker floats.
       Fix: zero out margin-left, use padding-left only. */
    ol,ul{
      margin-left:0!important;
      padding-left:1.5rem!important;
      list-style-position:outside!important
    }
    ol{list-style-type:decimal!important}
    ul{list-style-type:disc!important}
    li{
      padding-left:0!important;
      margin-bottom:0.25rem!important;
      display:list-item!important;
      color:#374151!important
    }
    li::marker{color:#4338ca!important}
    .ml-6{margin-left:0!important;padding-left:1.5rem!important}

    /* Heading inside notes card */
    h1.text-indigo-400,h2.text-indigo-300{color:#4338ca!important}

    /* Section card backgrounds */
    .bg-indigo-500\\/10,.bg-indigo-500\\/12{background:#eef2ff!important}
    .bg-purple-500\\/10,.bg-purple-500\\/12{background:#faf5ff!important}
    .bg-cyan-500\\/10,.bg-cyan-500\\/12{background:#ecfeff!important}
    .bg-rose-500\\/10,.bg-rose-500\\/12{background:#fff1f2!important}
    .bg-green-500\\/10,.bg-green-500\\/12{background:#f0fdf4!important}

    /* Colour dots */
    .bg-indigo-400,.bg-indigo-500{background-color:#4338ca!important}
    .bg-purple-400,.bg-purple-500{background-color:#7c3aed!important}
    .bg-cyan-400,.bg-cyan-500{background-color:#0e7490!important}

    code{background:#f3f4f6!important;color:#4338ca!important;
         padding:2px 5px!important;border-radius:4px!important}
  `
  doc.head.appendChild(css)

  // Lock root width
  const root = doc.body.firstElementChild
  if (root) {
    root.style.width    = captureWidth + 'px'
    root.style.minWidth = captureWidth + 'px'
    root.style.maxWidth = captureWidth + 'px'
    root.style.background = '#ffffff'
    root.style.color      = '#111827'
  }
}

// ─── Measure section positions in the live DOM before capture ─────────────────
// Returns array of { top, bottom } in CANVAS pixels (already × SCALE).
function measureSections(element) {
  const elRect = element.getBoundingClientRect()
  const results = []

  // Selectors for "keep together" blocks
  const selectors = [
    '#mermaid-container',
    '.recharts-wrapper',
    // The white card wrapping each section in FinalResult
    '[id="mermaid-container"]',
  ]

  selectors.forEach(sel => {
    element.querySelectorAll(sel).forEach(el => {
      const r   = el.getBoundingClientRect()
      const top = (r.top - elRect.top) * SCALE
      const bot = (r.bottom - elRect.top) * SCALE
      if (bot - top > 20) results.push({ top, bottom: bot })
    })
  })

  // Also include parent section containers that are > 200px tall
  element.querySelectorAll('section').forEach(el => {
    const r   = el.getBoundingClientRect()
    const top = (r.top - elRect.top) * SCALE
    const bot = (r.bottom - elRect.top) * SCALE
    if (bot - top > 200) results.push({ top, bottom: bot })
  })

  return results
}

// ─── Section-aware page builder ───────────────────────────────────────────────
// Instead of only scanning for white rows (which can still land mid-diagram),
// we also know WHERE sections are and actively avoid them.
function buildPages(canvasHeight, pageHeightPx, sections) {
  const pages  = []
  let   startY = 0

  while (startY < canvasHeight) {
    let targetEnd = Math.min(startY + pageHeightPx, canvasHeight)

    if (targetEnd < canvasHeight) {
      // Check whether targetEnd falls INSIDE any section
      const hit = sections.find(s => s.top < targetEnd && s.bottom > targetEnd)

      if (hit) {
        if (hit.top > startY + pageHeightPx * 0.25) {
          // Section starts in the lower 75% of the page — break BEFORE it
          targetEnd = Math.max(startY + 1, hit.top - 10)
        } else {
          // Section starts near the top of the page — break AFTER it
          targetEnd = hit.bottom + 10
          if (targetEnd > canvasHeight) targetEnd = canvasHeight
        }
      }
      // Safety: never go backwards
      if (targetEnd <= startY) targetEnd = Math.min(startY + pageHeightPx, canvasHeight)
    }

    pages.push({ startY, endY: targetEnd })
    startY = targetEnd
  }
  return pages
}

// ─── SVG dimension fix for Recharts ──────────────────────────────────────────
function fixSvgDimensions(container) {
  const svgs = container.querySelectorAll('svg')
  const res  = []
  svgs.forEach(svg => {
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
  return () => res.forEach(fn => fn())
}

// ─── Canvas crop helper ───────────────────────────────────────────────────────
function cropCanvas(src, startY, endY) {
  const h = endY - startY
  const c = document.createElement('canvas')
  c.width = src.width; c.height = h
  c.getContext('2d').drawImage(src, 0, startY, src.width, h, 0, 0, src.width, h)
  return c
}

// ─── Branded PDF header ───────────────────────────────────────────────────────
function injectHeader(container, topic) {
  const el = document.createElement('div')
  el.id = '__pdf_hdr__'
  el.style.cssText = `
    background:linear-gradient(135deg,#0f0f1a 0%,#1e1b4b 100%);
    padding:20px 28px 18px;margin-bottom:28px;border-radius:14px;
    display:flex;align-items:center;justify-content:space-between;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  `
  el.innerHTML = `
    <div>
      <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:3px">ExamCraft</div>
      <div style="font-size:11px;color:#818cf8">AI-powered exam-oriented notes &amp; revision</div>
    </div>
    <div style="text-align:right">
      ${topic ? `<div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:3px">${topic}</div>` : ''}
      <div style="font-size:11px;color:#94a3b8">
        ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
      </div>
    </div>`
  container.insertBefore(el, container.firstChild)
  return () => el.remove()
}

function addFooter(pdf, n, total) {
  pdf.setFillColor(255, 255, 255)
  pdf.rect(0, A4_H_MM - 11, A4_W_MM, 11, 'F')
  pdf.setDrawColor(99, 102, 241); pdf.setLineWidth(0.4)
  pdf.line(10, A4_H_MM - 9, A4_W_MM - 10, A4_H_MM - 9)
  pdf.setFontSize(7.5)
  pdf.setTextColor(150, 150, 150)
  pdf.text('ExamCraft · Generated ' + new Date().toLocaleDateString('en-IN'), 10, A4_H_MM - 4)
  pdf.setTextColor(99, 102, 241)
  pdf.text('Page ' + n + ' / ' + total, A4_W_MM - 26, A4_H_MM - 4)
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

  // ── CRITICAL: measure section positions BEFORE html2canvas runs ──────────
  // After capture we only have a flat canvas — no DOM info.
  // Measure now while sections are still in the DOM with real getBoundingClientRect.
  await new Promise(r => setTimeout(r, 400))
  const sections = measureSections(element)

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
      onclone: d => patchClone(d, CAPTURE_WIDTH),
    })
  } finally {
    removeHeader(); restoreSvgs(); restoreVars(); restoreGCS(); restoreStyles()
    Object.assign(element.style, orig)
  }

  const pageHeightPx = Math.round((A4_H_MM / A4_W_MM) * canvas.width)

  // Build section-aware pages — never cuts through a diagram or chart
  const pages = buildPages(canvas.height, pageHeightPx, sections)

  const pdf = new jsPDF('p', 'mm', 'a4')
  pages.forEach(({ startY, endY }, i) => {
    if (i > 0) pdf.addPage()
    const strip  = cropCanvas(canvas, startY, endY)
    const data   = strip.toDataURL('image/png', 1.0)
    const hMM    = (strip.height * A4_W_MM) / canvas.width
    pdf.addImage(data, 'PNG', 0, 0, A4_W_MM, hMM, '', 'FAST')
    addFooter(pdf, i + 1, pages.length)
  })

  pdf.save(filename + '-' + Date.now() + '.pdf')
}