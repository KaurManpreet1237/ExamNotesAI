/**
 * exportPdf.js — html2canvas + jsPDF
 *
 * Fixes all 3 PDF issues:
 *   1. oklch/oklab → rgb() (4-layer interception)
 *   2. Faded text: dark theme grays invisible on white PDF
 *   3. Numbered list misalignment
 *   4. Diagram/chart cut at page breaks
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
  // Converts dark theme to print-ready. Fixes list alignment. Prevents diagram cut.
  const print = doc.createElement('style')
  print.id = '__pdf_print__'
  print.textContent = `

    /* ═══════════════════════════════════════════════════
       GLOBAL BACKGROUND & ROOT
    ═══════════════════════════════════════════════════ */
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* ═══════════════════════════════════════════════════
       TEXT COLORS — convert all gray-* to readable dark
    ═══════════════════════════════════════════════════ */

    /* h1/h2/h3 dark theme → readable dark */
    h1, h2, h3, h4, h5, h6 {
      color: #1e1b4b !important;
    }

    /* Tailwind text-gray-* classes used in FinalResult */
    .text-gray-100, .text-gray-200, .text-gray-300 {
      color: #1f2937 !important;
    }
    .text-gray-400, .text-gray-500 {
      color: #374151 !important;
    }
    .text-gray-600, .text-gray-700 {
      color: #4b5563 !important;
    }

    /* Accent colors — darken for white bg readability */
    .text-indigo-300, .text-indigo-400 { color: #4338ca !important; }
    .text-purple-300, .text-purple-400 { color: #7c3aed !important; }
    .text-cyan-300,   .text-cyan-400   { color: #0e7490 !important; }
    .text-green-300,  .text-green-400  { color: #15803d !important; }
    .text-rose-300,   .text-rose-400   { color: #be123c !important; }
    .text-amber-300,  .text-amber-400  { color: #b45309 !important; }
    .text-white { color: #111827 !important; }

    /* marker colors */
    .marker\\:text-indigo-400::marker { color: #4338ca !important; }
    .marker\\:text-indigo-500::marker { color: #4338ca !important; }

    /* ═══════════════════════════════════════════════════
       DARK BACKGROUNDS → WHITE
    ═══════════════════════════════════════════════════ */
    [class*="bg-white/"], [class*="bg-black/"],
    [class*="from-black"], [class*="from-[#"],
    [class*="via-[#"], [class*="to-[#"] {
      background: #ffffff !important;
      background-image: none !important;
    }

    /* Specific section cards */
    .bg-white\\/3, .bg-white\\/5, .bg-white\\/8 {
      background: #f9fafb !important;
    }
    .bg-indigo-500\\/10, .bg-indigo-500\\/12 {
      background: #eef2ff !important;
    }
    .bg-purple-500\\/10, .bg-purple-500\\/12 {
      background: #faf5ff !important;
    }
    .bg-cyan-500\\/10, .bg-cyan-500\\/12 {
      background: #ecfeff !important;
    }
    .bg-rose-500\\/10, .bg-rose-500\\/12 {
      background: #fff1f2 !important;
    }
    .bg-green-500\\/10, .bg-green-500\\/12 {
      background: #f0fdf4 !important;
    }

    /* Dark borders → light */
    [class*="border-white/"] { border-color: #e5e7eb !important; }
    [class*="border-indigo-500/"] { border-color: #c7d2fe !important; }
    [class*="border-purple-500/"] { border-color: #e9d5ff !important; }
    [class*="border-cyan-500/"]   { border-color: #a5f3fc !important; }
    [class*="border-rose-500/"]   { border-color: #fecdd3 !important; }

    /* ═══════════════════════════════════════════════════
       NUMBERED & BULLETED LIST ALIGNMENT FIX
       The misalignment happens because Tailwind uses
       ml-6 (margin-left) instead of padding-left.
       html2canvas renders margin-left differently than
       padding-left for list markers. Fix: use padding.
    ═══════════════════════════════════════════════════ */
    ol, ul {
      margin-left:  0       !important;
      padding-left: 1.5rem  !important;
      list-style-position: outside !important;
    }
    ol { list-style-type: decimal !important; }
    ul { list-style-type: disc    !important; }
    li {
      padding-left:  0.1rem !important;
      margin-bottom: 0.3rem !important;
      display:       list-item !important;
      color: #374151 !important;
    }
    ol li { color: #374151 !important; }
    li::marker { color: #4338ca !important; }

    /* ml-6 override — the specific Tailwind class used in FinalResult */
    .ml-6 { margin-left: 0 !important; padding-left: 1.5rem !important; }

    /* ═══════════════════════════════════════════════════
       DIAGRAM & CHART — prevent cutting at page breaks
    ═══════════════════════════════════════════════════ */

    /* Mermaid diagram container */
    #mermaid-container,
    [id="mermaid-container"] {
      page-break-inside: avoid !important;
      break-inside:      avoid !important;
      overflow:          visible !important;
    }
    /* Mermaid SVG — fill container width */
    #mermaid-container svg,
    [id="mermaid-container"] svg {
      width:      100%  !important;
      max-width:  100%  !important;
      height:     auto  !important;
      overflow:   visible !important;
    }
    /* Chart wrapper */
    .recharts-wrapper,
    [class*="recharts-wrapper"] {
      page-break-inside: avoid !important;
      break-inside:      avoid !important;
    }
    /* Section containers keep together */
    section {
      page-break-inside: avoid !important;
      break-inside:      avoid !important;
    }
    /* The white card that wraps diagram/chart in Notes/History */
    .rounded-2xl {
      page-break-inside: avoid !important;
      break-inside:      avoid !important;
    }

    /* ═══════════════════════════════════════════════════
       SECTION HEADER BARS
    ═══════════════════════════════════════════════════ */
    .from-indigo-500\\/12 { background: #eef2ff !important; }
    .from-purple-500\\/12 { background: #faf5ff !important; }
    .from-cyan-500\\/12   { background: #ecfeff !important; }
    .from-rose-500\\/12   { background: #fff1f2 !important; }
    .from-green-500\\/12  { background: #f0fdf4 !important; }

    /* ═══════════════════════════════════════════════════
       CODE BLOCKS
    ═══════════════════════════════════════════════════ */
    code {
      background: #f3f4f6 !important;
      color:      #4338ca !important;
      padding:    2px 5px !important;
      border-radius: 4px !important;
    }

    /* ═══════════════════════════════════════════════════
       SMALL COLOUR DOTS (question section bullets)
    ═══════════════════════════════════════════════════ */
    .bg-indigo-400, .bg-indigo-500 { background-color: #4338ca !important; }
    .bg-purple-400, .bg-purple-500 { background-color: #7c3aed !important; }
    .bg-cyan-400,   .bg-cyan-500   { background-color: #0e7490 !important; }
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

// ─── Smart page break ─────────────────────────────────────────────────────────
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

function cropCanvas(src, startY, endY) {
  const h = endY - startY
  const c = document.createElement('canvas')
  c.width = src.width; c.height = h
  c.getContext('2d').drawImage(src, 0, startY, src.width, h, 0, 0, src.width, h)
  return c
}

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

  await new Promise((r) => setTimeout(r, 400))

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

  const pageH  = Math.round((A4_H_MM / A4_W_MM) * canvas.width)
  const pages  = []
  let   startY = 0
  while (startY < canvas.height) {
    let endY = Math.min(startY + pageH, canvas.height)
    if (endY < canvas.height) {
      endY = findSafeBreak(canvas, endY, 80)
      if (endY <= startY) endY = Math.min(startY + pageH, canvas.height)
    }
    pages.push({ startY, endY })
    startY = endY
  }

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