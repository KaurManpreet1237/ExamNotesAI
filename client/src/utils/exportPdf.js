/**
 * exportPdf.js — html2canvas + jsPDF
 *
 * KEY FIX: Force capture width to 960px so text renders at normal
 * density. Without this, narrow mobile viewports produce giant text
 * because the narrow canvas gets stretched to fill A4 width.
 */

const A4_W_MM       = 210
const A4_H_MM       = 297
const CAPTURE_WIDTH = 960    // ← forces desktop-width capture regardless of viewport
const SCALE         = 2      // retina quality

// ─── oklch → rgb ──────────────────────────────────────────────────────────────
// Tailwind v4 uses oklch() everywhere; html2canvas can't parse it.
function oklchToRgb(l, c, h) {
  const L = isNaN(+l) ? 0 : +l
  const C = isNaN(+c) ? 0 : +c
  const H = isNaN(+h) ? 0 : +h
  const rad = (H * Math.PI) / 180
  const a   = C * Math.cos(rad)
  const b   = C * Math.sin(rad)
  const l_  = L + 0.3963377774 * a + 0.2158037573 * b
  const m_  = L - 0.1055613458 * a - 0.0638541728 * b
  const s_  = L - 0.0894841775 * a - 1.2914855480 * b
  const ll  = l_ ** 3, mm = m_ ** 3, ss = s_ ** 3
  const rL  =  4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss
  const gL  = -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss
  const bL  = -0.0041960863 * ll - 0.7034186147 * mm + 1.7076147010 * ss
  const g   = (x) => Math.round(Math.max(0, Math.min(1,
    x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1/2.4) - 0.055)) * 255)
  return `rgb(${g(rL)},${g(gL)},${g(bL)})`
}

const OKLCH_RE = /oklch\(\s*([^\s)]+)\s+([^\s)]+)\s+([^\s)/]+)(?:\s*\/\s*([^\s)]+))?\s*\)/gi

function replaceOklch(str) {
  return str.replace(OKLCH_RE, (_, l, c, h, alpha) => {
    const lv = typeof l === 'string' && l.endsWith('%') ? parseFloat(l)/100 : l === 'none' ? 0 : parseFloat(l)
    const cv = c === 'none' ? 0 : parseFloat(c)
    const hv = h === 'none' ? 0 : parseFloat(h)
    const rgb = oklchToRgb(lv, cv, hv)
    if (alpha && alpha !== '1' && alpha !== '100%') {
      const a = alpha.endsWith?.('%') ? parseFloat(alpha)/100 : parseFloat(alpha)
      const m = rgb.match(/\d+/g)
      return m ? `rgba(${m[0]},${m[1]},${m[2]},${a})` : rgb
    }
    return rgb
  })
}

// ─── Patch cloned document ────────────────────────────────────────────────────
function patchClone(clonedDoc, captureWidth) {
  // 1. Fix oklch in <style> tags
  clonedDoc.querySelectorAll('style').forEach((el) => {
    if (el.textContent.includes('oklch'))
      el.textContent = replaceOklch(el.textContent)
  })

  // 2. Fix inline oklch
  clonedDoc.querySelectorAll('[style]').forEach((el) => {
    const s = el.getAttribute('style')
    if (s && s.includes('oklch')) el.setAttribute('style', replaceOklch(s))
  })

  // 3. Hide buttons / toolbar elements
  clonedDoc.querySelectorAll('[data-pdf-hide]').forEach((el) => {
    el.style.display = 'none'
  })

  // 4. Fix gradient clip-text → plain colour
  clonedDoc.querySelectorAll('.bg-clip-text, .text-transparent').forEach((el) => {
    el.style.backgroundImage       = 'none'
    el.style.webkitBackgroundClip  = 'unset'
    el.style.backgroundClip        = 'unset'
    el.style.webkitTextFillColor   = '#4338ca'
    el.style.color                 = '#4338ca'
  })

  // 5. Force the root element to CAPTURE_WIDTH so nothing is narrow-viewport scaled
  const root = clonedDoc.body.firstElementChild
  if (root) {
    root.style.width    = captureWidth + 'px'
    root.style.minWidth = captureWidth + 'px'
    root.style.maxWidth = captureWidth + 'px'
  }
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

// ─── Smart page break ─────────────────────────────────────────────────────────
// Scans pixel rows near the expected cut point and finds the whitest row
// so sentences are never sliced mid-line.
function findSafeBreak(canvas, targetY, searchPx = 60) {
  const ctx  = canvas.getContext('2d')
  const W    = canvas.width
  const top  = Math.max(0, targetY - searchPx)
  const len  = Math.min(canvas.height, targetY + searchPx) - top
  if (len <= 0) return targetY

  const data = ctx.getImageData(0, top, W, len).data
  let bestRow = targetY, bestScore = -1
  const step = Math.max(1, Math.floor(W / 300))

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
  const h   = endY - startY
  const out = document.createElement('canvas')
  out.width  = src.width
  out.height = h
  out.getContext('2d').drawImage(src, 0, startY, src.width, h, 0, 0, src.width, h)
  return out
}

// ─── Inject branded header ────────────────────────────────────────────────────
function injectHeader(container, topic) {
  const el = document.createElement('div')
  el.id = '__pdf_hdr__'
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
        ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
      </div>
    </div>
  `
  container.insertBefore(el, container.firstChild)
  return () => el.remove()
}

// ─── Footer on every jsPDF page ───────────────────────────────────────────────
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

  // Save original inline styles so we can restore them
  const origStyles = {
    background: element.style.background,
    padding:    element.style.padding,
    width:      element.style.width,
    minWidth:   element.style.minWidth,
    maxWidth:   element.style.maxWidth,
    boxSizing:  element.style.boxSizing,
  }

  // ── Force desktop width before capture ───────────────────────────────────
  // This is the critical fix: without this, a 390px mobile viewport produces
  // a narrow canvas that gets stretched to A4, making text appear huge.
  element.style.background = '#ffffff'
  element.style.padding    = '24px'
  element.style.width      = CAPTURE_WIDTH + 'px'
  element.style.minWidth   = CAPTURE_WIDTH + 'px'
  element.style.maxWidth   = CAPTURE_WIDTH + 'px'
  element.style.boxSizing  = 'border-box'

  const removeHeader = injectHeader(element, topic)
  const restoreSvgs  = fixSvgDimensions(element)

  // Wait for React / Recharts / Mermaid to finish painting
  await new Promise((r) => setTimeout(r, 400))

  let fullCanvas
  try {
    fullCanvas = await html2canvas(element, {
      scale:           SCALE,
      useCORS:         true,
      allowTaint:      true,
      backgroundColor: '#ffffff',
      logging:         false,
      // Match the forced width so html2canvas sees the full layout
      windowWidth:  CAPTURE_WIDTH + 48,  // +48 for the padding we added
      x:      0,
      y:      0,
      width:  element.scrollWidth,
      height: element.scrollHeight,
      onclone: (clonedDoc) => patchClone(clonedDoc, CAPTURE_WIDTH),
    })
  } finally {
    // Always restore — even if capture fails
    removeHeader()
    restoreSvgs()
    Object.assign(element.style, origStyles)
  }

  // ── Page-break calculation ────────────────────────────────────────────────
  const pageHeightPx = Math.round((A4_H_MM / A4_W_MM) * fullCanvas.width)

  // Build smart-break pages
  const pages  = []
  let startY   = 0
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
    const strip        = cropCanvas(fullCanvas, startY, endY)
    const stripData    = strip.toDataURL('image/png', 1.0)
    const stripHeightMM = (strip.height * A4_W_MM) / fullCanvas.width
    pdf.addImage(stripData, 'PNG', 0, 0, A4_W_MM, stripHeightMM, '', 'FAST')
    addFooter(pdf, i + 1, pages.length)
  })

  pdf.save(filename + '-' + Date.now() + '.pdf')
}