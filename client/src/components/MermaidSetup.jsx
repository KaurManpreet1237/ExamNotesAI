import React, { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, theme: "default" })

const cleanChart = (d) => {
  if (!d) return ""
  let c = d.replace(/\r\n/g, "\n").trim()
  if (!c.startsWith("graph")) c = "graph TD\n" + c
  return c
}

const fixNodes = (d) => {
  let idx = 0
  const seen = new Map()
  return d.replace(/\[(.*?)\]/g, (_, label) => {
    const k = label.trim()
    if (seen.has(k)) return seen.get(k)
    idx++
    const node = `N${idx}["${k}"]`
    seen.set(k, node)
    return node
  })
}

// id="mermaid-container" is READ by api.js captureDiagramPng() to
// find the SVG and convert it to a PNG for PDF embedding.
// DO NOT remove or rename this id.
function MermaidSetup({ diagram }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!diagram || !ref.current) return
    const render = async () => {
      try {
        ref.current.innerHTML = ""
        const id  = "mermaid-" + Math.random().toString(36).slice(2, 9)
        const svg = await mermaid.render(id, fixNodes(cleanChart(diagram)))
        ref.current.innerHTML = svg.svg || svg
      } catch (e) {
        console.error("Mermaid error:", e)
      }
    }
    render()
  }, [diagram])

  return (
    <div
      id="mermaid-container"
      className="bg-white border border-gray-100 rounded-2xl p-5 overflow-x-auto
        shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <div ref={ref} className="flex justify-center" />
    </div>
  )
}

export default MermaidSetup