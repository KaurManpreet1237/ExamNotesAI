/**
 * exportPdf.js — Frontend PDF export using html2canvas + jsPDF
 *
 * KEY FIX: Tailwind v4 uses oklch() for all color variables.
 * html2canvas can't parse oklch(). We convert them in onclone()
 * before html2canvas touches the DOM.
 */

const A4_W_MM = 210
const A4_H_MM = 297
const SCALE   = 2

// ─── oklch → rgb converter ────────────────────────────────────────────────────
// Tailwind v4 CSS custom properties look like:
//   --color-indigo-600: oklch(0.4577 0.2368 264.376);
// Browser returns those as-is in stylesheets, and html2canvas crashes.
// This function converts oklch(L C H) → rgb(r, g, b) exactly.

function oklchToRgbStr(l, c, h) {
  // Handle "none" keyword — treat as 0
  const L = typeof l === "string" ? 0 : Number(l)
  const C = typeof c === "string" ? 0 : Number(c)
  const H = typeof h === "string" ? 0 : Number(h)

  const hRad = (H * Math.PI) / 180
  const a    = C * Math.cos(hRad)
  const b    = C * Math.sin(hRad)

  // OKLab → linear sRGB
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b

  const ll = l_ ** 3
  const mm = m_ ** 3
  const ss = s_ ** 3

  const rLin =  4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss
  const gLin = -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss
  const bLin = -0.0041960863 * ll - 0.7034186147 * mm + 1.7076147010 * ss

  // Linear → gamma (sRGB transfer function)
  const toGamma = (x) => {
    const clamped = Math.max(0, Math.min(1, x))
    const g = clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055
    return Math.round(g * 255)
  }

  return `rgb(${toGamma(rLin)}, ${toGamma(gLin)}, ${toGamma(bLin)})`
}

// Regex that matches oklch( ... ) including:
//   oklch(0.5 0.2 240)
//   oklch(51.5% 0.2 240)
//   oklch(none 0.2 240)
//   oklch(0.5 0.2 240 / 0.5)  ← with alpha
const OKLCH_RE = /oklch\(\s*([^\s)]+)\s+([^\s)]+)\s+([^\s)/]+)(?:\s*\/\s*([^\s)]+))?\s*\)/gi

function replaceOklch(str) {
  return str.replace(OKLCH_RE, (match, l, c, h, alpha) => {
    // Strip % from L if present
    const lVal = typeof l === "string" && l.endsWith("%")
      ? parseFloat(l) / 100
      : l === "none" ? 0 : parseFloat(l)
    const cVal = c === "none" ? 0 : parseFloat(c)
    const hVal = h === "none" ? 0 : parseFloat(h)

    const rgbStr = oklchToRgbStr(lVal, cVal, hVal)

    if (alpha !== undefined && alpha !== "1" && alpha !== "100%") {
      // Add alpha channel
      const a = alpha.endsWith("%")
        ? parseFloat(alpha) / 100
        : parseFloat(alpha)
      const { r, g, b } = (() => {
        const m = rgbStr.match(/rgb\((\d+), (\d+), (\d+)\)/)
        return m ? { r: m[1], g: m[2], b: m[3] } : { r: 0, g: 0, b: 0 }
      })()
      return `rgba(${r}, ${g}, ${b}, ${a})`
    }
    return rgbStr
  })
}

// ─── Patch all stylesheets in the cloned document ─────────────────────────────
// Called inside html2canvas onclone — modifies the clone, not the live page.
function patchCloneStyles(clonedDoc) {
  // 1. Patch <style> tag content
  clonedDoc.querySelectorAll("style").forEach((el) => {
    if (el.textContent.includes("oklch")) {
      el.textContent = replaceOklch(el.textContent)
    }
  })

  // 2. Patch inline style attributes on any element
  clonedDoc.querySelectorAll("[style]").forEach((el) => {
    if (el.getAttribute("style").includes("oklch")) {
      el.setAttribute("style", replaceOklch(el.getAttribute("style")))
    }
  })

  // 3. Patch any <link rel=stylesheet> that we can access (same-origin only)
  //    For cross-origin sheets we can't access textContent, so we skip silently.
  try {
    Array.from(clonedDoc.styleSheets).forEach((sheet) => {
      try {
        const rules = Array.from(sheet.cssRules || [])
        rules.forEach((rule) => {
          if (rule.cssText && rule.cssText.includes("oklch")) {
            // Can't directly patch cssRules — the style element approach above
            // handles same-origin injected styles. External sheets are read-only.
          }
        })
      } catch (_) { /* cross-origin sheet — skip */ }
    })
  } catch (_) {}
}

// ─── Fix SVG dimensions ───────────────────────────────────────────────────────
// html2canvas can't measure SVGs without explicit width/height attributes.
function fixSvgDimensions(container) {
  const svgs = container.querySelectorAll("svg")
  const restores = []
  svgs.forEach((svg) => {
    const rect = svg.getBoundingClientRect()
    const w = svg.getAttribute("width")
    const h = svg.getAttribute("height")
    if (rect.width > 0 && rect.height > 0) {
      svg.setAttribute("width",  String(rect.width))
      svg.setAttribute("height", String(rect.height))
    }
    restores.push(() => {
      if (w !== null) svg.setAttribute("width",  w); else svg.removeAttribute("width")
      if (h !== null) svg.setAttribute("height", h); else svg.removeAttribute("height")
    })
  })
  return () => restores.forEach((fn) => fn())
}

// ─── Inject professional print header ────────────────────────────────────────
function injectHeader(container, topic) {
  const el = document.createElement("div")
  el.id = "__pdf-hdr__"
  // Use only rgb/hex — no oklch — so html2canvas can render it
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
      <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;margin-bottom:3px">
        ExamCraft
      </div>
      <div style="font-size:11px;color:#818cf8;letter-spacing:0.3px">
        AI-powered exam-oriented notes &amp; revision
      </div>
    </div>
    <div style="text-align:right">
      ${topic ? `<div style="font-size:13px;font-weight:600;color:#ffffff;margin-bottom:3px">${topic}</div>` : ""}
      <div style="font-size:11px;color:#94a3b8">
        ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
      </div>
    </div>
  `
  container.insertBefore(el, container.firstChild)
  return () => el.remove()
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function exportToPdf(element, filename = "ExamCraft", topic = "") {
  // Lazy-load heavy libs — only pulled in when download is clicked
  const [h2cMod, jsPDFMod] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ])
  const html2canvas = h2cMod.default
  const { jsPDF }   = jsPDFMod

  // Store + set container styles
  const origBg  = element.style.background
  const origPad = element.style.padding
  element.style.background = "#ffffff"
  element.style.padding    = "20px"

  const removeHeader = injectHeader(element, topic)
  const restoreSvgs  = fixSvgDimensions(element)

  // Let React finish painting (important for charts)
  await new Promise((r) => setTimeout(r, 350))

  let canvas
  try {
    canvas = await html2canvas(element, {
      scale:           SCALE,
      useCORS:         true,
      allowTaint:      true,
      backgroundColor: "#ffffff",
      logging:         false,
      x:      0,
      y:      0,
      width:  element.scrollWidth,
      height: element.scrollHeight,

      // ── THE KEY FIX ───────────────────────────────────────────────────────
      // html2canvas clones the DOM before rendering. onclone runs on that
      // clone so we can patch oklch() → rgb() without touching the live page.
      onclone: (clonedDoc) => {
        patchCloneStyles(clonedDoc)
      },
      // ──────────────────────────────────────────────────────────────────────
    })
  } finally {
    removeHeader()
    restoreSvgs()
    element.style.background = origBg
    element.style.padding    = origPad
  }

  // Build PDF
  const pdf          = new jsPDF("p", "mm", "a4")
  const imgData      = canvas.toDataURL("image/png", 1.0)
  const imgWidthMM   = A4_W_MM
  const imgHeightMM  = (canvas.height * imgWidthMM) / canvas.width
  const totalPages   = Math.ceil(imgHeightMM / A4_H_MM)

  const addFooter = (n, total) => {
    // White strip to mask any content bleeding into footer
    pdf.setFillColor(255, 255, 255)
    pdf.rect(0, A4_H_MM - 12, A4_W_MM, 12, "F")
    // Accent line
    pdf.setDrawColor(99, 102, 241)
    pdf.setLineWidth(0.4)
    pdf.line(10, A4_H_MM - 10, A4_W_MM - 10, A4_H_MM - 10)
    // Footer text
    pdf.setFontSize(7.5)
    pdf.setTextColor(150, 150, 150)
    pdf.text("ExamCraft · Generated " + new Date().toLocaleDateString("en-IN"), 10, A4_H_MM - 5)
    pdf.setTextColor(99, 102, 241)
    pdf.text("Page " + n + " / " + total, A4_W_MM - 24, A4_H_MM - 5)
  }

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) pdf.addPage()
    pdf.addImage(imgData, "PNG", 0, -(p * A4_H_MM), imgWidthMM, imgHeightMM, "", "FAST")
    addFooter(p + 1, totalPages)
  }

  pdf.save(filename + "-" + Date.now() + ".pdf")
}