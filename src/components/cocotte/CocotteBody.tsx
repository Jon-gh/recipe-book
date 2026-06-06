// Shared constant geometry: round-belly Dutch-oven body and ear handles.
// The lid+sprout is separate so the shrug pose can tilt it independently.
// Port of mockup body A2 + topper T2 from design/mascot/pot-poses.html.
export default function CocotteBody() {
  return (
    <>
      {/* drop shadow */}
      <ellipse cx="100" cy="180" rx="50" ry="6" fill="#14532d" opacity="0.10" />

      {/* ear handles */}
      <rect x="26" y="122" width="18" height="13" rx="6.5" fill="#16a34a" stroke="#14532d" strokeWidth="5" />
      <rect x="156" y="122" width="18" height="13" rx="6.5" fill="#16a34a" stroke="#14532d" strokeWidth="5" />

      {/* round belly body */}
      <path
        d="M46 109 Q100 105 154 109 Q176 132 150 162 Q100 176 50 162 Q24 132 46 109 Z"
        fill="#16a34a"
        stroke="#14532d"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </>
  );
}

// Separate component so it can be transformed per-pose (e.g. tilted for shrug).
export function CocotteLid({ transform }: { transform?: string }) {
  return (
    <g transform={transform}>
      <path d="M34 102 Q100 80 166 102 Z" fill="#22c55e" stroke="#14532d" strokeWidth="5" strokeLinejoin="round" />
      <rect x="30" y="99" width="140" height="11" rx="5.5" fill="#22c55e" stroke="#14532d" strokeWidth="5" />
      <line x1="100" y1="82" x2="100" y2="68" stroke="#14532d" strokeWidth="3" strokeLinecap="round" />
      <g transform="translate(100,68) rotate(-32)">
        <path d="M0 0 C -6 -4 -6 -14 0 -18 C 6 -14 6 -4 0 0 Z" fill="#4ade80" stroke="#14532d" strokeWidth="2.5" strokeLinejoin="round" />
      </g>
      <g transform="translate(100,68) rotate(32)">
        <path d="M0 0 C -6 -4 -6 -14 0 -18 C 6 -14 6 -4 0 0 Z" fill="#4ade80" stroke="#14532d" strokeWidth="2.5" strokeLinejoin="round" />
      </g>
      <circle cx="100" cy="82" r="6.5" fill="#14532d" />
    </g>
  );
}
