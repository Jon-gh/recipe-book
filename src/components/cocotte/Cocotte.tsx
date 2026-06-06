"use client";

import CocotteBody, { CocotteLid } from "./CocotteBody";

export type CocottePose = "wave" | "stir" | "hold-basket" | "cheer" | "shrug";

type Props = {
  pose: CocottePose;
  size?: number;
  className?: string;
  label?: string;
};

// ── per-pose steam/face/arms/props fragments ──────────────────────────────────

function WavePose() {
  return (
    <>
      {/* gentle curling steam */}
      <g className="cocotte-steam" fill="none" stroke="#9ca3af" strokeWidth="4" strokeLinecap="round" opacity="0.7">
        <path d="M84 54 q-7 -8 0 -16 q7 -8 0 -16" />
        <path d="M100 52 q-7 -8 0 -16 q7 -8 0 -16" />
        <path d="M116 54 q-7 -8 0 -16 q7 -8 0 -16" />
      </g>
      {/* happy eyes */}
      <circle cx="85" cy="130" r="6" fill="#14532d" /><circle cx="87" cy="128" r="2" fill="#fff" />
      <circle cx="115" cy="130" r="6" fill="#14532d" /><circle cx="117" cy="128" r="2" fill="#fff" />
      {/* smile */}
      <path d="M90 142 q10 9 20 0" fill="none" stroke="#14532d" strokeWidth="3.5" strokeLinecap="round" />
      {/* blush */}
      <ellipse cx="75" cy="140" rx="6" ry="3.4" fill="#fb7185" opacity="0.55" />
      <ellipse cx="125" cy="140" rx="6" ry="3.4" fill="#fb7185" opacity="0.55" />
      {/* left arm down */}
      <path d="M50 152 q-12 8 -12 18" fill="none" stroke="#16a34a" strokeWidth="9" strokeLinecap="round" />
      <circle cx="38" cy="172" r="6.5" fill="#16a34a" stroke="#14532d" strokeWidth="3" />
      {/* right arm waving */}
      <path d="M152 150 q16 -10 20 -38" fill="none" stroke="#16a34a" strokeWidth="9" strokeLinecap="round" />
      <circle cx="172" cy="106" r="7" fill="#16a34a" stroke="#14532d" strokeWidth="3" />
      {/* swish lines by waving hand */}
      <path d="M183 98 q6 4 4 12" fill="none" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <path d="M189 102 q5 5 2 12" fill="none" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
    </>
  );
}

function StirPose() {
  return (
    <>
      {/* bubbling steam circles */}
      <g className="cocotte-steam" fill="#9ca3af" opacity="0.6">
        <circle cx="92" cy="48" r="3.5" />
        <circle cx="101" cy="38" r="4.5" />
        <circle cx="110" cy="49" r="3.5" />
        <circle cx="98" cy="30" r="3" />
      </g>
      {/* focused eyes */}
      <circle cx="85" cy="130" r="6" fill="#14532d" /><circle cx="87" cy="128" r="2" fill="#fff" />
      <circle cx="115" cy="130" r="6" fill="#14532d" /><circle cx="117" cy="128" r="2" fill="#fff" />
      {/* small O mouth */}
      <circle cx="100" cy="143" r="3.2" fill="none" stroke="#14532d" strokeWidth="3" />
      {/* blush */}
      <ellipse cx="75" cy="140" rx="6" ry="3.4" fill="#fb7185" opacity="0.55" />
      <ellipse cx="125" cy="140" rx="6" ry="3.4" fill="#fb7185" opacity="0.55" />
      {/* left arm down */}
      <path d="M50 152 q-10 6 -11 16" fill="none" stroke="#16a34a" strokeWidth="9" strokeLinecap="round" />
      <circle cx="38" cy="170" r="6.5" fill="#16a34a" stroke="#14532d" strokeWidth="3" />
      {/* right arm holding spoon */}
      <path d="M150 150 q12 2 18 -6" fill="none" stroke="#16a34a" strokeWidth="9" strokeLinecap="round" />
      <circle cx="170" cy="142" r="6.5" fill="#16a34a" stroke="#14532d" strokeWidth="3" />
      {/* wooden spoon */}
      <line x1="170" y1="142" x2="122" y2="150" stroke="#d97706" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="118" cy="152" rx="6.5" ry="8" fill="#f59e0b" stroke="#d97706" strokeWidth="2.5" />
      {/* stir swirl */}
      <path d="M103 162 q15 9 30 0" fill="none" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
    </>
  );
}

function HoldBasketPose() {
  return (
    <>
      {/* single thin sleepy wisp */}
      <g className="cocotte-steam">
        <path d="M94 52 q9 -5 18 0" fill="none" stroke="#9ca3af" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      </g>
      {/* gentle/expectant eyes */}
      <circle cx="85" cy="128" r="6" fill="#14532d" /><circle cx="87" cy="126" r="2" fill="#fff" />
      <circle cx="115" cy="128" r="6" fill="#14532d" /><circle cx="117" cy="126" r="2" fill="#fff" />
      {/* small smile */}
      <path d="M92 140 q8 6 16 0" fill="none" stroke="#14532d" strokeWidth="3.5" strokeLinecap="round" />
      {/* blush */}
      <ellipse cx="75" cy="138" rx="6" ry="3.4" fill="#fb7185" opacity="0.55" />
      <ellipse cx="125" cy="138" rx="6" ry="3.4" fill="#fb7185" opacity="0.55" />
      {/* arms reaching down to basket */}
      <path d="M52 152 q6 8 22 6" fill="none" stroke="#16a34a" strokeWidth="9" strokeLinecap="round" />
      <path d="M148 152 q-6 8 -22 6" fill="none" stroke="#16a34a" strokeWidth="9" strokeLinecap="round" />
      {/* empty basket */}
      <path d="M82 154 q18 -16 36 0" fill="none" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M78 154 L122 154 L116 176 L84 176 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="3" strokeLinejoin="round" />
      <path d="M92 154 L90 176 M108 154 L110 176" stroke="#94a3b8" strokeWidth="2" opacity="0.7" />
      <path d="M80 164 L120 164" stroke="#94a3b8" strokeWidth="2" opacity="0.7" />
      {/* hand circles over basket */}
      <circle cx="76" cy="158" r="6" fill="#16a34a" stroke="#14532d" strokeWidth="3" />
      <circle cx="124" cy="158" r="6" fill="#16a34a" stroke="#14532d" strokeWidth="3" />
    </>
  );
}

function CheerPose() {
  return (
    <>
      {/* hearts + confetti */}
      <g className="cocotte-steam">
        <path transform="translate(82,42)" d="M0 0 C -4 -6 -12 -1 0 8 C 12 -1 4 -6 0 0 Z" fill="#ef4444" />
        <path transform="translate(120,38)" d="M0 0 C -3.5 -5 -10 -1 0 7 C 10 -1 3.5 -5 0 0 Z" fill="#ec4899" />
        <circle cx="100" cy="28" r="3.5" fill="#f59e0b" />
        <rect x="64" y="50" width="6" height="6" rx="1.5" fill="#22c55e" transform="rotate(20 67 53)" />
        <rect x="132" y="52" width="6" height="6" rx="1.5" fill="#38bdf8" transform="rotate(-15 135 55)" />
      </g>
      {/* big joy eyes (arched) */}
      <path d="M80 132 q5 -7 10 0" fill="none" stroke="#14532d" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M110 132 q5 -7 10 0" fill="none" stroke="#14532d" strokeWidth="3.5" strokeLinecap="round" />
      {/* open mouth smile with blush */}
      <path d="M86 138 Q100 156 114 138 Z" fill="#14532d" />
      <path d="M94 148 q6 6 12 0 Z" fill="#fb7185" />
      <ellipse cx="74" cy="142" rx="6.5" ry="3.6" fill="#fb7185" opacity="0.7" />
      <ellipse cx="126" cy="142" rx="6.5" ry="3.6" fill="#fb7185" opacity="0.7" />
      {/* arms up V */}
      <path d="M50 150 q-12 -14 -18 -34" fill="none" stroke="#16a34a" strokeWidth="9" strokeLinecap="round" />
      <circle cx="30" cy="112" r="7" fill="#16a34a" stroke="#14532d" strokeWidth="3" />
      <path d="M150 150 q12 -14 18 -34" fill="none" stroke="#16a34a" strokeWidth="9" strokeLinecap="round" />
      <circle cx="170" cy="112" r="7" fill="#16a34a" stroke="#14532d" strokeWidth="3" />
    </>
  );
}

function ShrugPose() {
  return (
    <>
      {/* small sputter drops */}
      <g className="cocotte-steam" fill="#9ca3af" opacity="0.5">
        <circle cx="86" cy="48" r="4" />
        <circle cx="80" cy="55" r="3" />
      </g>
      {/* oops eyes */}
      <circle cx="85" cy="130" r="6" fill="#14532d" /><circle cx="87" cy="128" r="2" fill="#fff" />
      <circle cx="115" cy="130" r="5" fill="#14532d" /><circle cx="116" cy="128" r="1.8" fill="#fff" />
      {/* wavy uncertain mouth */}
      <path d="M91 143 q4 4 8 0 q4 -4 9 0" fill="none" stroke="#14532d" strokeWidth="3" strokeLinecap="round" />
      {/* blush */}
      <ellipse cx="75" cy="140" rx="6" ry="3.4" fill="#fb7185" opacity="0.55" />
      <ellipse cx="125" cy="140" rx="6" ry="3.4" fill="#fb7185" opacity="0.55" />
      {/* sweat drop */}
      <path d="M132 122 q4 6 0 10 q-4 -4 0 -10 Z" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
      {/* arms shrug, palms out */}
      <path d="M50 148 q-16 0 -20 10" fill="none" stroke="#16a34a" strokeWidth="9" strokeLinecap="round" />
      <circle cx="28" cy="160" r="6.5" fill="#16a34a" stroke="#14532d" strokeWidth="3" />
      <path d="M150 148 q16 0 20 10" fill="none" stroke="#16a34a" strokeWidth="9" strokeLinecap="round" />
      <circle cx="172" cy="160" r="6.5" fill="#16a34a" stroke="#14532d" strokeWidth="3" />
    </>
  );
}

// ── main component ─────────────────────────────────────────────────────────────

const ANIMATION_CLASS: Record<CocottePose, string> = {
  wave: "cocotte-bob",
  stir: "cocotte-bob",
  "hold-basket": "cocotte-bob",
  cheer: "cocotte-hop",
  shrug: "cocotte-bob",
};

export default function Cocotte({ pose, size = 160, className = "", label }: Props) {
  const isDecorative = !label;
  const animClass = ANIMATION_CLASS[pose];

  // shrug needs a tilted lid; all other poses use the standard lid transform
  const lidTransform = pose === "shrug" ? "rotate(-9 100 100)" : undefined;

  return (
    <svg
      width={size}
      height={Math.round(size * 1.12)}
      viewBox="0 0 200 200"
      role={isDecorative ? undefined : "img"}
      aria-label={isDecorative ? undefined : label}
      aria-hidden={isDecorative ? true : undefined}
      className={`${animClass} ${className}`.trim()}
    >
      {/* shared body (no lid — rendered separately so shrug can tilt it) */}
      <CocotteBody />

      {/* lid rendered above body, optionally tilted */}
      <CocotteLid transform={lidTransform} />

      {/* per-pose layer */}
      {pose === "wave" && <WavePose />}
      {pose === "stir" && <StirPose />}
      {pose === "hold-basket" && <HoldBasketPose />}
      {pose === "cheer" && <CheerPose />}
      {pose === "shrug" && <ShrugPose />}
    </svg>
  );
}
