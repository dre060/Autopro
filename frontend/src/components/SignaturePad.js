// frontend/src/components/SignaturePad.js — draw a signature with finger, stylus or mouse.
// Calls onChange(dataUrl | null). The PNG is trimmed and scaled to keep it small.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function SignaturePad({ onChange, height = 170, dark = false, label = "Sign here" }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const [empty, setEmpty] = useState(true);
  const lastWidth = useRef(0);

  const ink = dark ? "#f3f4f6" : "#111827";

  // Size the canvas to its box (crisp on high-DPI screens like the Fold).
  const resize = useCallback((force) => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const { width } = c.getBoundingClientRect();
    // Phones fire resize when the address bar hides; don't wipe the signature unless the width changed.
    if (force !== true && Math.abs(width - lastWidth.current) < 1) return;
    lastWidth.current = width;
    c.width = Math.round(width * ratio);
    c.height = Math.round(height * ratio);
    const ctx = c.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = ink;
    setEmpty(true);
    onChange?.(null);
  }, [height, ink, onChange]);

  useEffect(() => {
    resize(true);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const point = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, 1.1, 0, Math.PI * 2);
    ctx.fillStyle = ink;
    ctx.fill();
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const p = point(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setEmpty(false);
    onChange?.(exportPng(canvasRef.current, ink));
  };

  return (
    <div>
      <div className="relative rounded-lg border-2 border-dashed" style={{ borderColor: dark ? "rgba(255,255,255,.25)" : "#cbd5e1", background: dark ? "rgba(255,255,255,.03)" : "#fff" }}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height, touchAction: "none", display: "block", cursor: "crosshair" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
          aria-label="Signature pad"
        />
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm" style={{ color: dark ? "rgba(255,255,255,.35)" : "#94a3b8" }}>
            {label}
          </span>
        )}
        <span className="pointer-events-none absolute bottom-7 left-4 right-4 border-b" style={{ borderColor: dark ? "rgba(255,255,255,.2)" : "#e2e8f0" }} />
      </div>
      <div className="mt-1.5 flex justify-end">
        <button type="button" onClick={() => resize(true)} className="text-xs font-medium" style={{ color: dark ? "#9ca3af" : "#64748b" }}>
          Clear
        </button>
      </div>
    </div>
  );
}

// Crop to the ink, then export a black-on-transparent PNG at most 600px wide.
function exportPng(canvas, ink) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (data[(y * width + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return null;
  const pad = 12;
  minX = Math.max(minX - pad, 0); minY = Math.max(minY - pad, 0);
  maxX = Math.min(maxX + pad, width); maxY = Math.min(maxY + pad, height);
  const w = maxX - minX;
  const h = maxY - minY;
  const scale = Math.min(1, 600 / w);
  const out = document.createElement("canvas");
  out.width = Math.round(w * scale);
  out.height = Math.round(h * scale);
  const o = out.getContext("2d");
  o.drawImage(canvas, minX, minY, w, h, 0, 0, out.width, out.height);
  // Documents print on white, so always store dark ink.
  if (ink !== "#111827") {
    o.globalCompositeOperation = "source-in";
    o.fillStyle = "#111827";
    o.fillRect(0, 0, out.width, out.height);
  }
  return out.toDataURL("image/png");
}
