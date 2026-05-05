import axios from "axios"
import { serverUrl } from "../App"
import { setUserData } from "../redux/userSlice"

export const getCurrentUser = async (dispatch) => {
  try {
    const result = await axios.get(serverUrl + "/api/user/currentuser", { withCredentials: true })
    dispatch(setUserData(result.data))
  } catch (error) {
    console.log(error)
  }
}

export const generateNotes = async (payload) => {
  try {
    const result = await axios.post(serverUrl + "/api/notes/generate-notes", payload, { withCredentials: true })
    return result.data
  } catch (error) {
    console.log(error)
  }
}

/**
 * Safely captures the Mermaid SVG from the DOM as a base64 PNG.
 * Returns null (never throws) if no diagram is present or anything fails.
 */
const captureDiagramPng = async () => {
  try {
    const container = document.getElementById("mermaid-container")
    if (!container) return null

    const svgEl = container.querySelector("svg")
    if (!svgEl) return null

    const bbox = svgEl.getBoundingClientRect()
    const w = Math.max(bbox.width || 0, 400)
    const h = Math.max(bbox.height || 0, 200)

    // Clone and prepare SVG for rasterisation
    const clone = svgEl.cloneNode(true)
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
    clone.setAttribute("width", String(w))
    clone.setAttribute("height", String(h))

    // White background so the PNG renders cleanly in the PDF
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    bg.setAttribute("width", "100%")
    bg.setAttribute("height", "100%")
    bg.setAttribute("fill", "white")
    clone.insertBefore(bg, clone.firstChild)

    const svgString = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)

    return await new Promise((resolve) => {
      const img = new Image()

      img.onload = () => {
        try {
          const scale = 2 // retina quality
          const canvas = document.createElement("canvas")
          canvas.width  = w * scale
          canvas.height = h * scale
          const ctx = canvas.getContext("2d")
          ctx.scale(scale, scale)
          ctx.fillStyle = "white"
          ctx.fillRect(0, 0, w, h)
          ctx.drawImage(img, 0, 0, w, h)
          URL.revokeObjectURL(url)
          resolve(canvas.toDataURL("image/png"))
        } catch (e) {
          URL.revokeObjectURL(url)
          resolve(null)
        }
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }

      img.src = url
    })
  } catch {
    return null  // never propagate — diagram capture is optional
  }
}

/**
 * Downloads a professional PDF with diagrams and charts embedded.
 * The diagram (if rendered on screen) is captured as a PNG and sent
 * to the server so it can be embedded as a real image in the PDF.
 */
export const downloadPdf = async (result) => {
  // Capture diagram (null if none rendered — that's fine)
  const diagramPng = await captureDiagramPng()

  const response = await axios.post(
    serverUrl + "/api/pdf/generate-pdf",
    { result, diagramPng },
    { responseType: "blob", withCredentials: true }
  )

  const blob = new Blob([response.data], { type: "application/pdf" })
  const url  = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href     = url
  link.download = `ExamNotesAI-${Date.now()}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}