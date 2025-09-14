import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CrochetRoundRecognition() {
  const PINK = "#E91E63";
  const GOLD = "#FFD700";
  const BLACK = "#111827";

  const WIDTH = 640;
  const HEIGHT = 720;
  const cx = WIDTH / 2;
  const cy = 340;

  const [round, setRound] = useState(1);
  const [count, setCount] = useState(12);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(null);
  const [ringR, setRingR] = useState(160);
  const END_ROUND = 5;
  const [showEnd, setShowEnd] = useState(false);

  const [stitches, setStitches] = useState([]);

  const [mouse, setMouse] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const svgRef = useRef(null);

  function countForRound(r) {
    if (r === 1) return 12;
    if (r === 2) return 18;
    if (r === 3) return 24;
    if (r === 4) return 30;
    if (r === 5) return 36;
    return 36;
  }
  function radiusForRound(r) {
    return 130 + r * 8;
  }

  function genRound(r) {
    const c = countForRound(r);
    const arr = Array.from({ length: c }, (_, i) => {
      const baseAngle = (360 / c) * i - 90 + 5;
      const rr = Math.random();
      const kind = rr < 0.72 ? "real" : rr < 0.84 ? "wrong_orient" : rr < 0.93 ? "too_wide" : "too_shallow";
      return { id: i, angle: baseAngle, kind, clicked: false };
    });
    setCount(c);
    setRingR(radiusForRound(r));
    setStitches(arr);
  }

  function start() {
    setScore(0);
    setLastCorrect(null);
    setRound(1);
    genRound(1);
    setShowEnd(false);
    setRunning(true);
  }

  function handleClick(s) {
    if (!running || s.clicked) return;
    setStitches((list) => list.map((x) => (x.id === s.id ? { ...x, clicked: true } : x)));
    if (s.kind === "real") {
      setScore((sc) => sc + 10);
      setLastCorrect(s.id);
    } else {
      setScore((sc) => Math.max(0, sc - 5));
      setLastCorrect(null);
    }
  }

  const toRad = (deg) => (deg * Math.PI) / 180;
  function pointOnRingDeg(deg, r = ringR) {
    const a = toRad(deg);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  const dist2 = (x1, y1, x2, y2) => (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);

  function stitchPath(kind) {
    let W = 44, H = 56;
    if (kind === "too_wide") W *= 1.3;
    if (kind === "too_shallow") H *= 0.75;
    const bl = { x: 0, y: 0 };
    const tl = { x: -W / 2, y: -H };
    const tr = { x: W / 2, y: -H };
    return `M ${bl.x} ${bl.y} L ${tl.x} ${tl.y} M ${bl.x} ${bl.y} L ${tr.x} ${tr.y}`;
  }

  const remainingReal = useMemo(() => stitches.filter((s) => s.kind === "real" && !s.clicked).length, [stitches]);
  useEffect(() => {
    if (!running) return;
    if (remainingReal === 0 && stitches.length > 0) {
      if (round >= END_ROUND) {
        setRunning(false);
        setShowEnd(true);
      } else {
        const next = round + 1;
        setRound(next);
        setLastCorrect(null);
        genRound(next);
      }
    }
  }, [remainingReal, running, stitches.length, round]);

  function onSvgMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setMouse({ x: mx, y: my });
    const SNAP2 = 28 * 28;
    let bestId = null;
    let bestD2 = Infinity;
    for (const s of stitches) {
      const base = pointOnRingDeg(s.angle, ringR);
      const d2 = dist2(mx, my, base.x, base.y);
      if (d2 < bestD2 && d2 < SNAP2) {
        bestD2 = d2;
        bestId = s.id;
      }
    }
    setHoverId(bestId);
  }

  const ordered = useMemo(() => [...stitches].sort((a, b) => a.angle - b.angle), [stitches]);

  return (
    <div className="w-full flex flex-col items-center gap-4 p-6" style={{ fontFamily: "Georgia, 'Times New Roman', serif", backgroundImage: "url('https://wallpapers.com/images/hd/kate-spade-white-hearts-erxoa1ltp1qmbwnn.jpg')", backgroundSize: "cover" }}>
      <h1 className="text-2xl font-bold tracking-wide" style={{ color: BLACK }}>Crochet Round — Spot the SC</h1>

      <div className="flex items-center gap-6 p-3 rounded-xl shadow-sm" style={{ border: `2px solid ${GOLD}`, background: "#fff" }}>
        <div className="font-semibold" style={{ color: BLACK }}>Round <span style={{ color: PINK }}>{round}</span>/<span>{END_ROUND}</span></div>
        <div className="font-semibold" style={{ color: BLACK }}>Stitches <span className="ml-2">{count}</span></div>
        {!running ? (
          <button onClick={start} className="px-4 py-2 rounded-xl shadow" style={{ background: BLACK, color: "#fff", border: `2px solid ${BLACK}` }}> {showEnd ? "Play again" : "Start"} </button>
        ) : (
          <button onClick={() => setRunning(false)} className="px-4 py-2 rounded-xl shadow" style={{ background: BLACK, color: "#fff", border: `2px solid ${BLACK}` }}>Pause</button>
        )}
      </div>

      <div className="relative bg-[#f5f5dc] rounded-2xl shadow-lg p-4">
        <svg ref={svgRef} width={WIDTH} height={HEIGHT} className="rounded-2xl shadow" style={{ background: "#f5f5dc" }}
          onMouseMove={onSvgMouseMove} onMouseLeave={() => { setMouse(null); setHoverId(null); }}
          onClick={() => { if (hoverId != null) { const s = stitches.find((st) => st.id === hoverId); if (s) handleClick(s); } }}
        >
          <circle cx={cx} cy={cy} r={ringR + 70} fill="none" stroke={GOLD} strokeWidth={2} />
          <circle cx={cx} cy={cy} r={ringR - 70} fill="none" stroke="#f3f4f6" strokeDasharray="3 8" />

          {ordered.map((s) => {
            const base = pointOnRingDeg(s.angle, ringR);
            const inwardDeg = s.angle + 180;
            const rotDeg = s.kind === "wrong_orient" ? s.angle + 90 : inwardDeg;
            const d = stitchPath(s.kind);

            const isCorrectClicked = s.clicked && s.kind === "real";
            const isHover = hoverId === s.id && !s.clicked;
            const strokeColor = s.clicked ? (s.kind === "real" ? GOLD : "#F8BBD0") : isHover ? PINK : BLACK;
            const strokeW = isHover ? 5.5 : 4;

            return (
              <g key={s.id} onClick={() => handleClick(s)} style={{ cursor: "pointer" }}>
                <motion.path d={d} transform={`translate(${base.x}, ${base.y}) rotate(${rotDeg})`} fill="none" stroke={strokeColor} strokeWidth={strokeW} strokeLinecap="round" style={isHover ? { filter: `drop-shadow(0 0 6px ${GOLD})` } : undefined} />
                <AnimatePresence>
                  {isCorrectClicked && lastCorrect === s.id && (
                    <Sparkle x={base.x} y={base.y - 18} color={GOLD} key={`sp-${s.id}`} />
                  )}
                </AnimatePresence>
              </g>
            );
          })}

          {mouse && (
            <image href="https://athriftynotion.com/cdn/shop/files/SizeNCrochetHook_800x.png?v=1753294266" x={mouse.x - 40} y={mouse.y - 40} width={100} height={100} pointerEvents="none" />
          )}
        </svg>
      </div>

      <AnimatePresence>
        {showEnd && (
          <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md text-center" style={{ border: `3px solid ${GOLD}`, color: BLACK }} initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}>
              <h2 className="text-xl font-bold mt-1">Cat complete! 🐱✨</h2>
              <p className="text-sm opacity-80 mt-1">You finished Round 5 (R1–R5 of the pattern). Beautiful work!</p>
              <div className="mt-4 flex justify-center gap-2">
                <button onClick={() => setShowEnd(false)} className="px-4 py-2 rounded-xl" style={{ background: "#fff", border: `2px solid ${BLACK}`, color: BLACK }}>Close</button>
                <button onClick={start} className="px-4 py-2 rounded-xl" style={{ background: BLACK, color: "#fff", border: `2px solid ${BLACK}` }}>Play again</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-center max-w-[640px]" style={{ color: BLACK }}>Move the <b>hook</b> over a stitch to highlight it, then click to select. Finish each round to grow the circle. After Round 5, a celebratory message pops up.</p>
    </div>
  );
}

function Sparkle({ x, y, color = "#FFD700" }) {
  const rays = 8;
  const radius = 18;
  const items = Array.from({ length: rays }, (_, i) => {
    const a = (i * 2 * Math.PI) / rays;
    const x2 = x + radius * Math.cos(a);
    const y2 = y + radius * Math.sin(a);
    return { x2, y2 };
  });
  return (
    <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
      {items.map((p, i) => (
        <motion.line key={i} x1={x} y1={y} x2={p.x2} y2={p.y2} stroke={color} strokeWidth={2} />
      ))}
      <motion.circle cx={x} cy={y} r={4} fill={color} />
    </motion.g>
  );
}
