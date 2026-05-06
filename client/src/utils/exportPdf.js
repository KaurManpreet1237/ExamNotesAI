/**
 * exportPdf.js — Frontend PDF export (html2canvas + jsPDF)
 *
 * FIXES in this version:
 *   1. Buttons hidden before capture via data-pdf-hide attribute
 *   2. Gradient clip-text fixed → solid colour in clone
 *   3. Smart page breaks — scans pixel rows to avoid cutting mid-sentence
 *   4. oklch() → rgb() conversion for Tailwind v4
 */

const A4_W_MM = 210
const A4_H_MM = 297
const SCALE   = 2       // retina quality

// ─── oklch → rgb ──────────────────────────────────────────────────────────────
function oklchToRgb(l, c, h) {
  const L = isNaN(+l) ? 0 : +l
  const C = isNaN(+c) ? 0 : +c
  const H = isNaN(+h) ? 0 : +h
  const r  = (H * Math.PI) / 180
  const a  = C * Math.cos(r)
  const b  = C * Math.sin(r)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b
  const ll = l_ ** 3, mm = m_ ** 3, ss = s_ ** 3
  const rL =  4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss
  const gL = -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss
  const bL = -0.0041960863 * ll - 0.7034186147 * mm + 1.7076147010 * ss
  const g  = (x) => Math.round(Math.max(0, Math.min(1, x <= 0.0031308
    ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)) * 255)
  return `rgb(${g(rL)}, ${g(gL)}, ${g(bL)})`
}

const OKLCH_RE = /oklch\(\s*([^\s)]+)\s+([^\s)]+)\s+([^\s)/]+)(?:\s*\/\s*([^\s)]+))?\s*\)/gi

function replaceOklch(str) {
  return str.replace(OKLCH_RE, (_, l, c, h, alpha) => {
    const lv = l.endsWith?.('%') ? parseFloat(l) / 100 : l === 'none' ? 0 : parseFloat(l)
    const cv = c === 'none' ? 0 : parseFloat(c)
    const hv = h === 'none' ? 0 : parseFloat(h)
    const rgb = oklchToRgb(lv, cv, hv)
    if (alpha && alpha !== '1' && alpha !== '100%') {
      const a = alpha.endsWith?.('%') ? parseFloat(alpha) / 100 : parseFloat(alpha)
      const m = rgb.match(/\d+/g)
      return m ? `rgba(${m[0]}, ${m[1]}, ${m[2]}, ${a})` : rgb
    }
    return rgb
  })
}

// ─── Patch cloned document ────────────────────────────────────────────────────
function patchClone(clonedDoc) {
  // 1. Fix oklch in all <style> tags
  clonedDoc.querySelectorAll('style').forEach((el) => {
    if (el.textContent.includes('oklch')) {
      el.textContent = replaceOklch(el.textContent)
    }
  })

  // 2. Fix inline oklch
  clonedDoc.querySelectorAll('[style]').forEach((el) => {
    const s = el.getAttribute('style')
    if (s.includes('oklch')) el.setAttribute('style', replaceOklch(s))
  })

  // 3. Hide elements marked data-pdf-hide (buttons, toolbars etc.)
  clonedDoc.querySelectorAll('[data-pdf-hide]').forEach((el) => {
    el.style.display = 'none'
  })

  // 4. Fix gradient clip-text — html2canvas renders it as a solid block.
  //    Replace with a plain solid indigo colour.
  clonedDoc.querySelectorAll('.bg-clip-text').forEach((el) => {
    el.style.backgroundImage  = 'none'
    el.style.webkitBackgroundClip = 'unset'
    el.style.backgroundClip   = 'unset'
    el.style.webkitTextFillColor = '#4338ca'
    el.style.color            = '#4338ca'
    el.style.opacity          = '1'
  })

  // 5. Also patch any element that has text-transparent (Tailwind)
  //    which makes text invisible in html2canvas
  clonedDoc.querySelectorAll('.text-transparent').forEach((el) => {
    el.style.color = '#4338ca'
    el.style.webkitTextFillColor = '#4338ca'
    el.style.backgroundImage = 'none'
  })
}

// ─── Fix SVG dimensions ───────────────────────────────────────────────────────
function fixSvgDimensions(container) {
  const svgs = container.querySelectorAll('svg')
  const restore = []
  svgs.forEach((svg) => {
    const rect = svg.getBoundingClientRect()
    const ow = svg.getAttribute('width')
    const oh = svg.getAttribute('height')
    if (rect.width > 0 && rect.height > 0) {
      svg.setAttribute('width',  String(rect.width))
      svg.setAttribute('height', String(rect.height))
    }
    restore.push(() => {
      if (ow !== null) svg.setAttribute('width', ow);  else svg.removeAttribute('width')
      if (oh !== null) svg.setAttribute('height', oh); else svg.removeAttribute('height')
    })
  })
  return () => restore.forEach((fn) => fn())
}

// ─── Smart page breaks ────────────────────────────────────────────────────────
// Scans pixel rows near the expected page boundary and finds the row
// with the most white pixels — i.e. a gap between content blocks.
// This prevents sentences from being cut mid-line.

function findSafeBreak(canvas, targetY, searchPx = 80) {
  const ctx = canvas.getContext('2d')
  const W   = canvas.width
  const top = Math.max(0, targetY - searchPx)
  const len = Math.min(canvas.height, targetY + searchPx) - top

  if (len <= 0) return targetY

  const data = ctx.getImageData(0, top, W, len).data
  let bestRow = targetY
  let bestScore = -1
  const step = Math.max(1, Math.floor(W / 300))   // sample ~300 pixels per row

  for (let row = 0; row < len; row++) {
    let white = 0
    let total = 0
    for (let x = 0; x < W; x += step) {
      const i = (row * W + x) * 4
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
      if (brightness > 238) white++
      total++
    }
    const score = white / total
    if (score > bestScore) {
      bestScore = score
      bestRow   = top + row
    }
  }
  return bestRow
}

// Slice the full canvas into page-sized strips at safe break points
function buildPages(canvas, pageHeightPx) {
  const pages  = []
  let startY   = 0
  const total  = canvas.height

  while (startY < total) {
    let endY = Math.min(startY + pageHeightPx, total)

    // Only search for a better break if this isn't the last page
    if (endY < total) {
      endY = findSafeBreak(canvas, endY, 80)
      // Safety: don't go backwards past startY
      if (endY <= startY) endY = Math.min(startY + pageHeightPx, total)
    }

    pages.push({ startY, endY })
    startY = endY
  }
  return pages
}

// Crop one strip from the full canvas into a new canvas
function cropCanvas(source, startY, endY) {
  const h   = endY - startY
  const out = document.createElement('canvas')
  out.width  = source.width
  out.height = h
  out.getContext('2d').drawImage(source, 0, startY, source.width, h, 0, 0, source.width, h)
  return out
}

// ─── Inject print header ──────────────────────────────────────────────────────
function injectHeader(container, topic) {
  const el = document.createElement('div')
  el.id = '__pdf_hdr__'
  // Use only rgb/hex — no oklch — so html2canvas renders correctly
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
      <div style="font-size:20px;font-weight:800;color:#ffffff;margin-bottom:3px">ExamCraft</div>
      <div style="font-size:11px;color:#818cf8">AI-powered exam-oriented notes &amp; revision</div>
    </div>
    <div style="text-align:right">
      ${topic ? `<div style="font-size:13px;font-weight:600;color:#ffffff;margin-bottom:3px">${topic}</div>` : ''}
      <div style="font-size:11px;color:#94a3b8">
        ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  `
  container.insertBefore(el, container.firstChild)
  return () => el.remove()
}

// ─── Add footer on each jsPDF page ───────────────────────────────────────────
function addFooter(pdf, pageNum, total) {
  // White strip to mask overflowing content
  pdf.setFillColor(255, 255, 255)
  pdf.rect(0, A4_H_MM - 11, A4_W_MM, 11, 'F')
  // Accent line
  pdf.setDrawColor(99, 102, 241)
  pdf.setLineWidth(0.4)
  pdf.line(10, A4_H_MM - 9, A4_W_MM - 10, A4_H_MM - 9)
  // Left text
  pdf.setFontSize(7.5)
  pdf.setTextColor(150, 150, 150)
  pdf.text('ExamCraft · Generated ' +
    new Date().toLocaleDateString('en-IN'), 10, A4_H_MM - 4)
  // Right page number
  pdf.setTextColor(99, 102, 241)
  pdf.text('Page ' + pageNum + ' / ' + total, A4_W_MM - 26, A4_H_MM - 4)
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function exportToPdf(element, filename = 'ExamCraft', topic = '') {
  const [h2cMod, jsPDFMod] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])
  const html2canvas = h2cMod.default
  const { jsPDF }   = jsPDFMod

  // Temporarily style the container for capture
  const origBg  = element.style.background
  const origPad = element.style.padding
  const origW   = element.style.width
  element.style.background = '#ffffff'
  element.style.padding    = '20px'
  element.style.width      = element.offsetWidth + 'px'   // lock width so layout doesn't shift

  const removeHeader = injectHeader(element, topic)
  const restoreSvgs  = fixSvgDimensions(element)

  // Let Recharts / Mermaid finish any deferred renders
  await new Promise((r) => setTimeout(r, 400))

  let fullCanvas
  try {
    fullCanvas = await html2canvas(element, {
      scale:           SCALE,
      useCORS:         true,
      allowTaint:      true,
      backgroundColor: '#ffffff',
      logging:         false,
      x:      0,
      y:      0,
      width:  element.scrollWidth,
      height: element.scrollHeight,
      onclone: (clonedDoc) => {
        patchClone(clonedDoc)
      },
    })
  } finally {
    // Always restore — even if capture throws
    removeHeader()
    restoreSvgs()
    element.style.background = origBg
    element.style.padding    = origPad
    element.style.width      = origW
  }

  // A4 page height in canvas pixels (at SCALE×)
  const pageHeightPx = Math.round((A4_H_MM / A4_W_MM) * fullCanvas.width)

  // Split the full canvas into smart-break pages
  const pages = buildPages(fullCanvas, pageHeightPx)
  const pdf   = new jsPDF('p', 'mm', 'a4')

  pages.forEach(({ startY, endY }, i) => {
    if (i > 0) pdf.addPage()

    const strip       = cropCanvas(fullCanvas, startY, endY)
    const stripData   = strip.toDataURL('image/png', 1.0)
    const stripHeightMM = (strip.height * A4_W_MM) / fullCanvas.width

    pdf.addImage(stripData, 'PNG', 0, 0, A4_W_MM, stripHeightMM, '', 'FAST')
    addFooter(pdf, i + 1, pages.length)
  })

  pdf.save(filename + '-' + Date.now() + '.pdf')
}