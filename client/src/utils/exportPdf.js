/**
 * exportPdf.js — html2canvas + jsPDF
 *
 * ROOT CAUSE OF oklab ERROR:
 * html2canvas crashes at parseTree() reading getComputedStyle() from the
 * LIVE DOM before onclone() is ever called. Patching only the cloned doc
 * is too late. This file patches ALL <style> tags in the live document
 * HEAD before html2canvas runs, then restores them after.
 */

const A4_W_MM       = 210
const A4_H_MM       = 297
const CAPTURE_WIDTH = 960
const SCALE         = 2

// ─── OKLab → linear sRGB → gamma sRGB ────────────────────────────────────────
function oklabToRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b
  const ll = l_ ** 3, mm = m_ ** 3, ss = s_ ** 3
  const rL =  4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss
  const gL = -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss
  const bL = -0.0041960863 * ll - 0.7034186147 * mm + 1.7076147010 * ss
  const g  = (x) => Math.round(Math.max(0, Math.min(1,
    x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)) * 255)
  return `rgb(${g(rL)},${g(gL)},${g(bL)})`
}

// oklch uses polar coords — convert to Lab then delegate
function oklchToRgb(L, C, H) {
  const rad = (H * Math.PI) / 180
  return oklabToRgb(L, C * Math.cos(rad), C * Math.sin(rad))
}

function parseVal(v) {
  if (!v || v === 'none') return 0
  if (typeof v === 'string' && v.endsWith('%')) return parseFloat(v) / 100
  return parseFloat(v)
}

function withAlpha(rgbStr, alpha) {
  if (!alpha || alpha === '1' || alpha === '100%') return rgbStr
  const a = parseVal(alpha)
  const m = rgbStr.match(/\d+/g)
  return m ? `rgba(${m[0]},${m[1]},${m[2]},${a})` : rgbStr
}

const OKLCH_RE = /oklch\(\s*([^\s)]+)\s+([^\s)]+)\s+([^\s)/]+)(?:\s*\/\s*([^\s)]+))?\s*\)/gi
const OKLAB_RE = /oklab\(\s*([^\s)]+)\s+([^\s)]+)\s+([^\s)/]+)(?:\s*\/\s*([^\s)]+))?\s*\)/gi

function replaceModernColors(str) {
  let out = str.replace(OKLCH_RE, (_, l, c, h, alpha) =>
    withAlpha(oklchToRgb(parseVal(l), parseVal(c), parseVal(h)), alpha)
  )
  out = out.replace(OKLAB_RE, (_, l, a, b, alpha) =>
    withAlpha(oklabToRgb(parseVal(l), parseVal(a), parseVal(b)), alpha)
  )
  return out
}

// ─── KEY FIX: Patch live <style> tags BEFORE html2canvas runs ─────────────────
// html2canvas calls getComputedStyle() on the live DOM during parseTree() —
// this happens BEFORE onclone(). So we must replace unsupported color functions
// in the real document's stylesheets first, then restore them afterwards.
function patchLiveStyles() {
  const patches = []

  document.querySelectorAll('style').forEach((el) => {
    const original = el.textContent
    if (original.includes('oklch') || original.includes('oklab')) {
      el.textContent = replaceModernColors(original)
      patches.push({ el, original })
    }
  })

  // Return restore function
  return () => patches.forEach(({ el, original }) => { el.textContent = original })
}

// ─── Patch cloned document (secondary pass — catches any missed inline styles) ──
function patchClone(clonedDoc, captureWidth) {
  // 1. Fix remaining oklch/oklab in <style> tags of the clone
  clonedDoc.querySelectorAll('style').forEach((el) => {
    const t = el.textContent
    if (t.includes('oklch') || t.includes('oklab'))
      el.textContent = replaceModernColors(t)
  })

  // 2. Fix inline style attributes
  clonedDoc.querySelectorAll('[style]').forEach((el) => {
    const s = el.getAttribute('style')
    if (s && (s.includes('oklch') || s.includes('oklab')))
      el.setAttribute('style', replaceModernColors(s))
  })

  // 3. Hide toolbar / button elements
  clonedDoc.querySelectorAll('[data-pdf-hide]').forEach((el) => {
    el.style.display = 'none'
  })

  // 4. Fix gradient clip-text (renders as opaque block in html2canvas)
  clonedDoc.querySelectorAll('.bg-clip-text, .text-transparent').forEach((el) => {
    el.style.backgroundImage      = 'none'
    el.style.webkitBackgroundClip = 'unset'
    el.style.backgroundClip       = 'unset'
    el.style.webkitTextFillColor  = '#4338ca'
    el.style.color                = '#4338ca'
  })

  // 5. Lock root to CAPTURE_WIDTH — prevents viewport-dependent scaling
  const root = clonedDoc.body.firstElementChild
  if (root) {
    root.style.width    = captureWidth + 'px'
    root.style.minWidth = captureWidth + 'px'
    root.style.maxWidth = captureWidth + 'px'
  }
}

// ─── Fix SVG dimensions ───────────────────────────────────────────────────────
function fixSvgDimensions(container) {
  const svgs    = container.querySelectorAll('svg')
  const restore = []
  svgs.forEach((svg) => {
    const rect = svg.getBoundingClientRect()
    const ow   = svg.getAttribute('width')
    const oh   = svg.getAttribute('height')
    if (rect.width > 0 && rect.height > 0) {
      svg.setAttribute('width',  String(rect.width))
      svg.setAttribute('height', String(rect.height))
    }
    restore.push(() => {
      if (ow !== null) svg.setAttribute('width',  ow); else svg.removeAttribute('width')
      if (oh !== null) svg.setAttribute('height', oh); else svg.removeAttribute('height')
    })
  })
  return () => restore.forEach((fn) => fn())
}

// ─── Smart page break ─────────────────────────────────────────────────────────
function findSafeBreak(canvas, targetY, searchPx = 60) {
  const ctx  = canvas.getContext('2d')
  const W    = canvas.width
  const top  = Math.max(0, targetY - searchPx)
  const len  = Math.min(canvas.height, targetY + searchPx) - top
  if (len <= 0) return targetY
  const data  = ctx.getImageData(0, top, W, len).data
  let bestRow = targetY, bestScore = -1
  const step  = Math.max(1, Math.floor(W / 300))
  for (let row = 0; row < len; row++) {
    let white = 0, total = 0
    for (let x = 0; x < W; x += step) {
      const i = (row * W + x) * 4
      if ((data[i] + data[i + 1] + data[i + 2]) / 3 > 240) white++
      total++
    }
    const score = white / total
    if (score > bestScore) { bestScore = score; bestRow = top + row }
  }
  return bestRow
}

function cropCanvas(src, startY, endY) {
  const h   = endY - startY
  const out = document.createElement('canvas')
  out.width  = src.width
  out.height = h
  out.getContext('2d').drawImage(src, 0, startY, src.width, h, 0, 0, src.width, h)
  return out
}

function injectHeader(container, topic) {
  const el  = document.createElement('div')
  el.id     = '__pdf_hdr__'
  el.style.cssText = `
    background: linear-gradient(135deg, #0f0f1a 0%, #1e1b4b 100%);
    padding: 20px 28px 18px;
    margin-bottom: 28px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
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
        ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  `
  container.insertBefore(el, container.firstChild)
  return () => el.remove()
}

function addFooter(pdf, n, total) {
  pdf.setFillColor(255, 255, 255)
  pdf.rect(0, A4_H_MM - 11, A4_W_MM, 11, 'F')
  pdf.setDrawColor(99, 102, 241)
  pdf.setLineWidth(0.4)
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
  const [h2cMod, jsPDFMod] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])
  const html2canvas = h2cMod.default
  const { jsPDF }   = jsPDFMod

  // Snapshot original inline styles
  const origStyles = {
    background: element.style.background,
    padding:    element.style.padding,
    width:      element.style.width,
    minWidth:   element.style.minWidth,
    maxWidth:   element.style.maxWidth,
    boxSizing:  element.style.boxSizing,
  }

  // Force desktop-width render (prevents mobile scaling)
  element.style.background = '#ffffff'
  element.style.padding    = '24px'
  element.style.width      = CAPTURE_WIDTH + 'px'
  element.style.minWidth   = CAPTURE_WIDTH + 'px'
  element.style.maxWidth   = CAPTURE_WIDTH + 'px'
  element.style.boxSizing  = 'border-box'

  const removeHeader    = injectHeader(element, topic)
  const restoreSvgs     = fixSvgDimensions(element)

  // ── CRITICAL: patch live <style> tags NOW, before html2canvas parseTree ──
  const restoreLiveStyles = patchLiveStyles()

  // Let Recharts/Mermaid finish painting
  await new Promise((r) => setTimeout(r, 400))

  let fullCanvas
  try {
    fullCanvas = await html2canvas(element, {
      scale:           SCALE,
      useCORS:         true,
      allowTaint:      true,
      backgroundColor: '#ffffff',
      logging:         false,
      windowWidth:     CAPTURE_WIDTH + 48,
      x:               0,
      y:               0,
      width:           element.scrollWidth,
      height:          element.scrollHeight,
      onclone:         (clonedDoc) => patchClone(clonedDoc, CAPTURE_WIDTH),
    })
  } finally {
    // Always restore — even if capture throws
    removeHeader()
    restoreSvgs()
    restoreLiveStyles()               // ← restore original Tailwind styles
    Object.assign(element.style, origStyles)
  }

  // Build pages with smart breaks
  const pageHeightPx = Math.round((A4_H_MM / A4_W_MM) * fullCanvas.width)
  const pages  = []
  let   startY = 0
  while (startY < fullCanvas.height) {
    let endY = Math.min(startY + pageHeightPx, fullCanvas.height)
    if (endY < fullCanvas.height) {
      endY = findSafeBreak(fullCanvas, endY, 80)
      if (endY <= startY) endY = Math.min(startY + pageHeightPx, fullCanvas.height)
    }
    pages.push({ startY, endY })
    startY = endY
  }

  const pdf = new jsPDF('p', 'mm', 'a4')
  pages.forEach(({ startY, endY }, i) => {
    if (i > 0) pdf.addPage()
    const strip         = cropCanvas(fullCanvas, startY, endY)
    const stripData     = strip.toDataURL('image/png', 1.0)
    const stripHeightMM = (strip.height * A4_W_MM) / fullCanvas.width
    pdf.addImage(stripData, 'PNG', 0, 0, A4_W_MM, stripHeightMM, '', 'FAST')
    addFooter(pdf, i + 1, pages.length)
  })

  pdf.save(filename + '-' + Date.now() + '.pdf')
}