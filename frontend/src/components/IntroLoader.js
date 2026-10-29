// frontend/src/components/IntroLoader.js
// First-visit intro: the emblem spins up inside a tachometer, the needle revs
// to redline, and the car launches off screen before the page is revealed.
// Plays once per browser session, is skippable, and is skipped entirely on
// /admin pages and for visitors who prefer reduced motion.
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const TOTAL_MS = 3000;
const TICKS = 21; // tach marks from 0 to redline

export default function IntroLoader() {
  const pathname = usePathname();
  const [phase, setPhase] = useState("play"); // play | leaving | done

  useEffect(() => {
    const root = document.documentElement;
    const skip =
      root.dataset.intro === "skip" ||
      (pathname && pathname.startsWith("/admin")) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (skip) {
      setPhase("done");
      root.classList.add("intro-done");
      return;
    }

    try { sessionStorage.setItem("ap_intro_seen", "1"); } catch (e) {}
    document.body.style.overflow = "hidden";

    const leave = setTimeout(() => setPhase("leaving"), TOTAL_MS - 600);
    const done = setTimeout(() => finish(), TOTAL_MS);
    return () => { clearTimeout(leave); clearTimeout(done); document.body.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    setPhase("done");
    document.body.style.overflow = "";
    document.documentElement.classList.add("intro-done");
  };

  if (phase === "done") return null;

  // Tach ticks laid out on a 240° arc, last quarter in redline.
  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const angle = -210 + (240 / (TICKS - 1)) * i;
    const rad = (angle * Math.PI) / 180;
    const major = i % 5 === 0;
    const r1 = major ? 132 : 138;
    const r2 = 150;
    return {
      i,
      red: i >= TICKS - 5,
      major,
      // Rounded so server and browser render identical SVG (no hydration mismatch).
      x1: +(170 + r1 * Math.cos(rad)).toFixed(2), y1: +(170 + r1 * Math.sin(rad)).toFixed(2),
      x2: +(170 + r2 * Math.cos(rad)).toFixed(2), y2: +(170 + r2 * Math.sin(rad)).toFixed(2),
    };
  });

  return (
    <div
      className={`intro ${phase === "leaving" ? "intro--leaving" : ""}`}
      role="presentation"
      onClick={finish}
    >
      <div className="intro__stage">
        <svg className="intro__tach" viewBox="0 0 340 340" aria-hidden="true">
          <circle cx="170" cy="170" r="160" className="intro__ring" />
          {ticks.map((t) => (
            <line
              key={t.i}
              x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              className={`intro__tick ${t.red ? "is-red" : ""} ${t.major ? "is-major" : ""}`}
              style={{ animationDelay: `${900 + t.i * 32}ms` }}
            />
          ))}
          <g className="intro__needle">
            <line x1="170" y1="170" x2="170" y2="52" />
            <circle cx="170" cy="170" r="7" />
          </g>
        </svg>

        <div className="intro__emblem">
          <img src="/brand-emblem.png" alt="" width="388" height="224" />
        </div>

        <div className="intro__launch" aria-hidden="true">
          <span className="intro__streak" />
          <span className="intro__streak" />
          <span className="intro__streak" />
          <img className="intro__car" src="/brand-car.png" alt="" width="388" height="140" />
        </div>

        <p className="intro__name">Auto Pro Repairs Sales &amp; Services</p>
      </div>

      <div className="intro__shutter intro__shutter--top" />
      <div className="intro__shutter intro__shutter--bottom" />
      <button type="button" className="intro__skip" onClick={finish}>Skip intro</button>
    </div>
  );
}
