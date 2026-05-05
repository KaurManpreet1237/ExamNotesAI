import axios from "axios"
import { serverUrl } from "../App"
import { setUserData } from "../redux/userSlice"

export const getCurrentUser = async (dispatch) => {
  try {
    const result = await axios.get(serverUrl + "/api/user/currentuser", { withCredentials: true })
    dispatch(setUserData(result.data))
  } catch (e) { console.log(e) }
}

export const generateNotes = async (payload) => {
  try {
    const result = await axios.post(serverUrl + "/api/notes/generate-notes", payload, { withCredentials: true })
    return result.data
  } catch (e) { console.log(e) }
}

/**
 * Finds the rendered Mermaid SVG in #mermaid-container, draws it onto a
 * canvas at 2x scale for crispness, and returns a base64 PNG data URL.
 * Returns null (never throws) if no diagram is visible or anything fails.
 */
const captureDiagramPng = () =>
  new Promise((resolve) => {
    try {
      const container = document.getElementById("mermaid-container")
      if (!container) { resolve(null); return }

      const svg = container.querySelector("svg")
      if (!svg) { resolve(null); return }

      // Let the browser finish any pending layout before measuring
      requestAnimationFrame(() => {
        try {
          const rect = svg.getBoundingClientRect()
          const W = Math.max(rect.width  || svg.viewBox?.baseVal?.width  || 0, 300)
          const H = Math.max(rect.height || svg.viewBox?.baseVal?.height || 0, 200)

          // Clone SVG, inject white background, set explicit dimensions
          const clone = svg.cloneNode(true)
          clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
          clone.setAttribute("width",  String(W))
          clone.setAttribute("height", String(H))

          const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect")
          bg.setAttribute("width",  "100%")
          bg.setAttribute("height", "100%")
          bg.setAttribute("fill",   "white")
          clone.insertBefore(bg, clone.firstChild)

          const svgStr = new XMLSerializer().serializeToString(clone)
          const blob   = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" })
          const url    = URL.createObjectURL(blob)

          const img = new Image()

          img.onload = () => {
            try {
              const scale  = 2           // retina quality
              const canvas = document.createElement("canvas")
              canvas.width  = W * scale
              canvas.height = H * scale
              const ctx = canvas.getContext("2d")
              ctx.scale(scale, scale)
              ctx.fillStyle = "white"
              ctx.fillRect(0, 0, W, H)
              ctx.drawImage(img, 0, 0, W, H)
              URL.revokeObjectURL(url)
              resolve(canvas.toDataURL("image/png"))
            } catch (e) {
              URL.revokeObjectURL(url)
              resolve(null)
            }
          }

          img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
          img.src = url

        } catch (e) { resolve(null) }
      })
    } catch (e) { resolve(null) }
  })

/**
 * Downloads a professional PDF.
 * Automatically captures the rendered diagram SVG from the DOM
 * and embeds it as a crisp PNG in the PDF.
 */
export const downloadPdf = async (result) => {
  // Wait a short moment so any pending SVG renders finish, then capture
  const diagramPng = await new Promise((resolve) => {
    setTimeout(async () => {
      const png = await captureDiagramPng()
      resolve(png)
    }, 150)
  })

  const response = await axios.post(
    serverUrl + "/api/pdf/generate-pdf",
    { result, diagramPng },
    { responseType: "blob", withCredentials: true }
  )

  const blob = new Blob([response.data], { type: "application/pdf" })
  const url  = window.URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = "ExamCraft-" + Date.now() + ".pdf"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}