import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';

export type MinerPhase = 'idle' | 'arming' | 'hashing' | 'transitioning';

interface Miner3DProps {
  phase: MinerPhase;
}

// ─── Geometry ─────────────────────────────────────────────────────────────────
//
//  S9 proportions: wide and flat  (~2:1 width-to-height)
//    W=250  H=135  D=120
//    Two fans at (W/4, H/2) and (3W/4, H/2)  r=50
//
//  Cable plate: a borderless 3D element in the same Z-plane as the front face,
//  butted against its left edge. Contains two concentric coaxial arc loops.
//    CW=80  — cable plate width
//    marginLeft = −(W/2 + CW) = −205  →  right edge aligns with front-face left edge
//
//  Arc geometry (viewBox "0 0 CW H", arcs start at x=CW):
//    Both arcs share center ≈ (55, 67.5).
//    Inner: r=35  from (80,43) → (80,92)   leftmost x=20
//    Outer: r=52  from (80,22) → (80,113)  leftmost x=3
//    All within 0–80 viewport — no overflow needed.
//
// ──────────────────────────────────────────────────────────────────────────────

const W  = 250;
const H  = 135;
const D  = 120;
const R  = 50;   // fan radius
const CW = 80;   // cable plate width

const DEF_ROT = { x: -10, y: 18 };

// Six-blade impeller path centred at (0,0)
function bladePath(r: number): string {
  const ir = r * 0.18, or = r * 0.88, sw = r * 0.28;
  return (
    `M 0 -${ir} ` +
    `C  ${sw} -${r * 0.42},  ${sw * 1.6} -${or * 0.88},  ${sw * 0.45} -${or} ` +
    `C -${sw * 0.45} -${or}, -${sw} -${r * 0.42}, 0 -${ir} Z`
  );
}

const BLADE  = bladePath(R);
const ANGLES = [0, 60, 120, 180, 240, 300] as const;

// ─── Fan ──────────────────────────────────────────────────────────────────────
// Defined outside Miner3D — keeps component type stable across renders.

function Fan({ cx, cy, dur, active }: {
  cx: number; cy: number; dur: string; active: boolean;
}) {
  return (
    <>
      {/* Bezel */}
      <circle cx={cx} cy={cy} r={R}        strokeWidth={0.95} />
      {/* Guard ring */}
      <circle cx={cx} cy={cy} r={R * 0.80} strokeWidth={0.45} strokeOpacity={0.38} />
      {/* Spinning impeller */}
      <g transform={`translate(${cx},${cy})`}>
        <g style={{
          animation:       `sv2-fan-spin ${dur} linear infinite`,
          transformBox:    'fill-box',
          transformOrigin: 'center',
        }}>
          {ANGLES.map(a => (
            <path
              key={a}
              transform={`rotate(${a})`}
              d={BLADE}
              fill={`hsl(var(--primary) / ${active ? '0.22' : '0.09'})`}
              strokeWidth={0.45}
            />
          ))}
        </g>
      </g>
      {/* Hub */}
      <circle cx={cx} cy={cy} r={R * 0.12}  strokeWidth={0.7} />
      <circle cx={cx} cy={cy} r={R * 0.055} fill="hsl(var(--primary) / 0.9)" stroke="none" />
    </>
  );
}

// ─── Miner3D ──────────────────────────────────────────────────────────────────

export function Miner3D({ phase }: Miner3DProps) {
  const [rot, setRot]       = useState(DEF_ROT);
  const [dragging, setDrag] = useState(false);
  const drag = useRef<{ px: number; py: number; rx: number; ry: number } | null>(null);

  const isArming  = phase === 'arming';
  const isHashing = phase === 'hashing' || phase === 'transitioning';
  const isActive  = isArming || isHashing;

  // Fan speed: idle is calm, arming is noticeably fast, hashing is a blur
  const fanDur = isHashing ? '0.04s' : isArming ? '0.4s' : '3.2s';

  // Glow builds dramatically as phase escalates
  const glow = isHashing
    ? '0 0 24px hsl(var(--primary) / 0.82), 0 0 52px hsl(var(--primary) / 0.28)'
    : isArming
      ? '0 0 13px hsl(var(--primary) / 0.54)'
      : '0 0 3px hsl(var(--primary) / 0.12)';

  // ── Drag-to-rotate ──────────────────────────────────────────────────────────
  const onPD = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, rx: rot.x, ry: rot.y };
    setDrag(true);
  };
  const onPM = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setRot({
      x: Math.max(-35, Math.min(20, drag.current.rx - (e.clientY - drag.current.py) * 0.3)),
      y: drag.current.ry + (e.clientX - drag.current.px) * 0.4,
    });
  };
  const onPU = () => { drag.current = null; setDrag(false); };

  // ── Style helpers ───────────────────────────────────────────────────────────
  const C   = 'hsl(var(--primary))';
  const bOp = isActive ? '0.90' : '0.72';

  const face = (w: number, h: number, ml: number, mt: number, t: string): CSSProperties => ({
    position:           'absolute',
    top:                '50%',
    left:               '50%',
    width:              w,
    height:             h,
    marginLeft:         ml,
    marginTop:          mt,
    boxSizing:          'border-box',
    border:             `1px solid hsl(var(--primary) / ${bOp})`,
    background:         'hsl(var(--primary) / 0.015)',
    backfaceVisibility: 'hidden',
    boxShadow:          glow,
    transition:         'box-shadow 0.4s ease',
    transform:          t,
  });

  const svgCommon = {
    fill:           'none'                    as const,
    stroke:         C,
    shapeRendering: 'geometricPrecision'      as const,
    style:          { display: 'block' }      as CSSProperties,
    'aria-hidden':  true                      as const,
  };

  return (
    <div
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        width:          '100%',
        maxWidth:       640,
        height:         280,
        flexShrink:     0,
        cursor:         dragging ? 'grabbing' : 'grab',
        userSelect:     'none',
        touchAction:    'none',
      }}
      onPointerDown={onPD}
      onPointerMove={onPM}
      onPointerUp={onPU}
      onPointerCancel={onPU}
      onDoubleClick={() => setRot(DEF_ROT)}
    >
      <div style={{ perspective: '900px' }}>
        <div style={{
          width:          W,
          height:         H,
          position:       'relative',
          transformStyle: 'preserve-3d',
          transform:      `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          transition:     dragging ? 'none' : 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>

          {/* ══════════════════════════════════════════════════════════════════
              CABLE PLATE
              Sits in the same Z-plane as the front face, left of it.
              Right edge (x=CW) aligns with the front face's left edge.
              Two concentric coaxial loops, both centred at ≈(55, H/2).
          ══════════════════════════════════════════════════════════════════ */}
          <div style={{
            position:           'absolute',
            top:                '50%',
            left:               '50%',
            width:              CW,
            height:             H,
            marginLeft:         -(W / 2 + CW),
            marginTop:          -H / 2,
            background:         'transparent',
            border:             'none',
            backfaceVisibility: 'hidden',
            pointerEvents:      'none',
            transform:          `translateZ(${D / 2}px)`,
          }}>
            <svg viewBox={`0 0 ${CW} ${H}`} width={CW} height={H} {...svgCommon}>
              <g style={{
                opacity:    isHashing ? 0.88 : isArming ? 0.66 : 0.44,
                transition: 'opacity 0.4s ease',
              }}>
                {/* Inner loop  r=35  centre≈(55, 67.5)  leftmost x=20 */}
                <path d={`M ${CW} 43 A 35 35 0 1 0 ${CW} 92`}  strokeWidth={1.0} />
                {/* Outer loop  r=52  centre≈(55, 67.5)  leftmost x=3  */}
                <path d={`M ${CW} 22 A 52 52 0 1 0 ${CW} 113`} strokeWidth={1.0} />
                {/* Connector studs where loops meet the chassis */}
                <circle cx={CW} cy={43}  r={3.2} fill={C} stroke="none" />
                <circle cx={CW} cy={92}  r={3.2} fill={C} stroke="none" />
                <circle cx={CW} cy={22}  r={2.2} fill={C} stroke="none" />
                <circle cx={CW} cy={113} r={2.2} fill={C} stroke="none" />
              </g>
            </svg>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              MAIN CHASSIS
          ══════════════════════════════════════════════════════════════════ */}

          {/* Front — two fans */}
          <div style={face(W, H, -W / 2, -H / 2, `translateZ(${D / 2}px)`)}>
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} {...svgCommon}>
              <Fan cx={W / 4}     cy={H / 2} dur={fanDur} active={isActive} />
              <Fan cx={3 * W / 4} cy={H / 2} dur={fanDur} active={isActive} />
              {/* Divider between fan bays */}
              <line x1={W / 2} y1={6} x2={W / 2} y2={H - 6}
                strokeWidth={0.35} strokeOpacity={0.18} />
              {/* Status strip */}
              <line x1={6} y1={H - 13} x2={W - 6} y2={H - 13}
                strokeWidth={0.35} strokeOpacity={0.18} />
              {/* LED indicator */}
              <circle cx={W - 11} cy={H - 6.5} r={2.8}
                strokeWidth={0.65} strokeOpacity={0.65} />
              {isActive && (
                <circle cx={W - 11} cy={H - 6.5} r={1.8} fill={C} stroke="none" />
              )}
            </svg>
          </div>

          {/* Back */}
          <div style={face(W, H, -W / 2, -H / 2,
            `rotateY(180deg) translateZ(${D / 2}px)`)} />

          {/* Right — exhaust vent lines */}
          <div style={face(D, H, -D / 2, -H / 2,
            `rotateY(90deg) translateZ(${W / 2}px)`)}>
            <svg viewBox={`0 0 ${D} ${H}`} width={D} height={H} {...svgCommon}>
              {[0.25, 0.50, 0.75].map(t => (
                <line key={t}
                  x1={8} y1={H * t} x2={D - 8} y2={H * t}
                  strokeWidth={0.55} strokeOpacity={0.42} />
              ))}
            </svg>
          </div>

          {/* Left */}
          <div style={face(D, H, -D / 2, -H / 2,
            `rotateY(-90deg) translateZ(${W / 2}px)`)} />

          {/* Top */}
          <div style={face(W, D, -W / 2, -D / 2,
            `rotateX(-90deg) translateZ(${H / 2}px)`)} />

          {/* Bottom */}
          <div style={face(W, D, -W / 2, -D / 2,
            `rotateX(90deg) translateZ(${H / 2}px)`)} />

        </div>
      </div>
    </div>
  );
}
