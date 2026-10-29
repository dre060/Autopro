// frontend/src/components/Motion.js
"use client";

import { useEffect, useRef, useState } from "react";

// Returns [ref, visible]; visible flips true once the element scrolls into view.
export function useInView(options = { threshold: 0.2 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { setVisible(true); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); io.disconnect(); }
    }, options);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, visible];
}

export function Reveal({ as: Tag = "div", className = "", delay = 0, children, ...rest }) {
  const [ref, visible] = useInView({ threshold: 0.05 });
  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// A small dashboard gauge: 240° arc that sweeps to `fill` (0–1) when seen.
export function GaugeStat({ value, label, fill = 0.8, red = false, delay = 0 }) {
  const [ref, visible] = useInView({ threshold: 0.4 });
  const r = 44;
  const arcLen = 2 * Math.PI * r * (240 / 360);
  // start at 150° (bottom-left), sweep clockwise 240°
  const polar = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return [60 + r * Math.cos(rad), 60 + r * Math.sin(rad)];
  };
  const [sx, sy] = polar(150);
  const [ex, ey] = polar(30);
  const d = `M ${sx} ${sy} A ${r} ${r} 0 1 1 ${ex} ${ey}`;
  return (
    <div ref={ref} className="flex flex-col items-center text-center">
      <div className="relative w-28 h-28 md:w-32 md:h-32">
        <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
          <path d={d} className="gauge-arc-track" />
          <path
            d={d}
            className="gauge-arc-fill"
            stroke={red ? "var(--ap-redline)" : "var(--ap-glow)"}
            strokeDasharray={arcLen}
            strokeDashoffset={visible ? arcLen * (1 - fill) : arcLen}
            style={{ transitionDelay: `${delay}ms` }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-2xl md:text-3xl pt-1">
          {value}
        </span>
      </div>
      <p className="mt-2 text-sm md:text-base text-gray-300 max-w-[11rem] leading-snug">{label}</p>
    </div>
  );
}
