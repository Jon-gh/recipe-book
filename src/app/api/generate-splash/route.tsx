import { ImageResponse } from "next/og";

export const runtime = "edge";

// Generates a branded PWA splash screen featuring Cocotte.
// Usage: GET /api/generate-splash?w=1290&h=2796
// Run once per device size to produce static PNGs, then delete this route.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const w = parseInt(searchParams.get("w") ?? "1290");
  const h = parseInt(searchParams.get("h") ?? "2796");

  // Cocotte is sized relative to the shorter dimension
  const base = Math.min(w, h);
  const p = (n: number) => n * (base / 512);

  // Center the pot vertically with slight upward bias
  const potTop = h * 0.3;

  return new ImageResponse(
    (
      <div
        style={{
          width: w,
          height: h,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#16a34a",
          position: "relative",
        }}
      >
        {/* subtle radial glow behind Cocotte */}
        <div
          style={{
            position: "absolute",
            top: potTop - p(60),
            left: w / 2 - p(220),
            width: p(440),
            height: p(440),
            background:
              "radial-gradient(ellipse at center, rgba(255,255,255,0.12) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />

        {/* ── Cocotte ── */}
        <div style={{ position: "relative", width: p(512), height: p(480), display: "flex" }}>
          {/* shadow */}
          <div
            style={{
              position: "absolute",
              bottom: p(100),
              left: p(126),
              width: p(260),
              height: p(32),
              background: "#0f4c22",
              opacity: 0.3,
              borderRadius: "50%",
            }}
          />

          {/* left ear */}
          <div
            style={{
              position: "absolute",
              left: p(64),
              top: p(247),
              width: p(47),
              height: p(34),
              background: "#f0fdf4",
              border: `${p(13)}px solid #0f4c22`,
              borderRadius: p(17),
            }}
          />

          {/* right ear */}
          <div
            style={{
              position: "absolute",
              left: p(402),
              top: p(247),
              width: p(47),
              height: p(34),
              background: "#f0fdf4",
              border: `${p(13)}px solid #0f4c22`,
              borderRadius: p(17),
            }}
          />

          {/* body */}
          <div
            style={{
              position: "absolute",
              left: p(64),
              top: p(213),
              width: p(384),
              height: p(185),
              background: "#f0fdf4",
              border: `${p(13)}px solid #0f4c22`,
              borderRadius: `${p(24)}px ${p(24)}px ${p(90)}px ${p(90)}px`,
            }}
          />

          {/* lid band */}
          <div
            style={{
              position: "absolute",
              left: p(74),
              top: p(187),
              width: p(364),
              height: p(42),
              background: "#22c55e",
              border: `${p(13)}px solid #0f4c22`,
              borderRadius: `${p(50)}px ${p(50)}px ${p(8)}px ${p(8)}px`,
            }}
          />

          {/* lid arch */}
          <div
            style={{
              position: "absolute",
              left: p(114),
              top: p(153),
              width: p(284),
              height: p(50),
              background: "#22c55e",
              border: `${p(13)}px solid #0f4c22`,
              borderRadius: `${p(60)}px ${p(60)}px 0 0`,
            }}
          />

          {/* stem */}
          <div
            style={{
              position: "absolute",
              left: p(248),
              top: p(107),
              width: p(16),
              height: p(52),
              background: "#0f4c22",
              borderRadius: p(8),
            }}
          />

          {/* left leaf */}
          <div
            style={{
              position: "absolute",
              left: p(212),
              top: p(78),
              width: p(30),
              height: p(50),
              background: "#4ade80",
              border: `${p(6)}px solid #0f4c22`,
              borderRadius: `${p(15)}px ${p(15)}px ${p(4)}px ${p(15)}px`,
              transform: "rotate(-32deg)",
              transformOrigin: "bottom right",
            }}
          />

          {/* right leaf */}
          <div
            style={{
              position: "absolute",
              left: p(270),
              top: p(78),
              width: p(30),
              height: p(50),
              background: "#4ade80",
              border: `${p(6)}px solid #0f4c22`,
              borderRadius: `${p(15)}px ${p(15)}px ${p(15)}px ${p(4)}px`,
              transform: "rotate(32deg)",
              transformOrigin: "bottom left",
            }}
          />

          {/* knob */}
          <div
            style={{
              position: "absolute",
              left: p(239),
              top: p(134),
              width: p(34),
              height: p(34),
              background: "#0f4c22",
              borderRadius: "50%",
            }}
          />

          {/* left eye */}
          <div style={{ position: "absolute", left: p(201), top: p(252), width: p(32), height: p(32), background: "#0f4c22", borderRadius: "50%" }} />
          <div style={{ position: "absolute", left: p(212), top: p(257), width: p(10), height: p(10), background: "#fff", borderRadius: "50%" }} />

          {/* right eye */}
          <div style={{ position: "absolute", left: p(279), top: p(252), width: p(32), height: p(32), background: "#0f4c22", borderRadius: "50%" }} />
          <div style={{ position: "absolute", left: p(291), top: p(257), width: p(10), height: p(10), background: "#fff", borderRadius: "50%" }} />

          {/* smile */}
          <div
            style={{
              position: "absolute",
              left: p(210),
              top: p(295),
              width: p(92),
              height: p(46),
              border: `${p(9)}px solid #0f4c22`,
              borderTop: "none",
              borderRadius: `0 0 ${p(46)}px ${p(46)}px`,
            }}
          />

          {/* blush left */}
          <div style={{ position: "absolute", left: p(167), top: p(280), width: p(38), height: p(20), background: "#fb7185", opacity: 0.55, borderRadius: "50%" }} />

          {/* blush right */}
          <div style={{ position: "absolute", left: p(307), top: p(280), width: p(38), height: p(20), background: "#fb7185", opacity: 0.55, borderRadius: "50%" }} />
        </div>

        {/* app title */}
        <div
          style={{
            marginTop: p(48),
            color: "#ffffff",
            fontSize: p(72),
            fontWeight: 700,
            letterSpacing: "-0.02em",
            opacity: 0.95,
          }}
        >
          Recipe Book
        </div>
      </div>
    ),
    { width: w, height: h }
  );
}
