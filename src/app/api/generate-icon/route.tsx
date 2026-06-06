import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const size = parseInt(searchParams.get("size") ?? "512");

  // Proportional helper — all values expressed relative to 512px master
  const p = (n: number) => n * (size / 512);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          background: "linear-gradient(135deg, #22c55e 0%, #14532d 100%)",
          borderRadius: p(112),
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* ── drop shadow ── */}
        <div
          style={{
            position: "absolute",
            bottom: p(114),
            left: p(126),
            width: p(260),
            height: p(32),
            background: "#14532d",
            opacity: 0.18,
            borderRadius: "50%",
          }}
        />

        {/* ── left ear handle ── */}
        <div
          style={{
            position: "absolute",
            left: p(64),
            top: p(247),
            width: p(47),
            height: p(34),
            background: "#f0fdf4",
            border: `${p(13)}px solid #14532d`,
            borderRadius: p(17),
          }}
        />

        {/* ── right ear handle ── */}
        <div
          style={{
            position: "absolute",
            left: p(402),
            top: p(247),
            width: p(47),
            height: p(34),
            background: "#f0fdf4",
            border: `${p(13)}px solid #14532d`,
            borderRadius: p(17),
          }}
        />

        {/* ── pot body (cream, rounded bottom) ── */}
        <div
          style={{
            position: "absolute",
            left: p(64),
            top: p(213),
            width: p(384),
            height: p(185),
            background: "#f0fdf4",
            border: `${p(13)}px solid #14532d`,
            borderRadius: `${p(24)}px ${p(24)}px ${p(90)}px ${p(90)}px`,
          }}
        />

        {/* ── lid band ── */}
        <div
          style={{
            position: "absolute",
            left: p(74),
            top: p(187),
            width: p(364),
            height: p(42),
            background: "#16a34a",
            border: `${p(13)}px solid #14532d`,
            borderRadius: `${p(50)}px ${p(50)}px ${p(8)}px ${p(8)}px`,
          }}
        />

        {/* ── lid arch (narrower, arching above band) ── */}
        <div
          style={{
            position: "absolute",
            left: p(114),
            top: p(153),
            width: p(284),
            height: p(50),
            background: "#16a34a",
            border: `${p(13)}px solid #14532d`,
            borderRadius: `${p(60)}px ${p(60)}px 0 0`,
          }}
        />

        {/* ── sprout stem ── */}
        <div
          style={{
            position: "absolute",
            left: p(248),
            top: p(107),
            width: p(16),
            height: p(52),
            background: "#14532d",
            borderRadius: p(8),
          }}
        />

        {/* ── left leaf ── */}
        <div
          style={{
            position: "absolute",
            left: p(212),
            top: p(78),
            width: p(30),
            height: p(50),
            background: "#4ade80",
            border: `${p(6)}px solid #14532d`,
            borderRadius: `${p(15)}px ${p(15)}px ${p(4)}px ${p(15)}px`,
            transform: "rotate(-32deg)",
            transformOrigin: "bottom right",
          }}
        />

        {/* ── right leaf ── */}
        <div
          style={{
            position: "absolute",
            left: p(270),
            top: p(78),
            width: p(30),
            height: p(50),
            background: "#4ade80",
            border: `${p(6)}px solid #14532d`,
            borderRadius: `${p(15)}px ${p(15)}px ${p(15)}px ${p(4)}px`,
            transform: "rotate(32deg)",
            transformOrigin: "bottom left",
          }}
        />

        {/* ── knob (connects stem to lid) ── */}
        <div
          style={{
            position: "absolute",
            left: p(239),
            top: p(134),
            width: p(34),
            height: p(34),
            background: "#14532d",
            borderRadius: "50%",
          }}
        />

        {/* ── left eye ── */}
        <div
          style={{
            position: "absolute",
            left: p(201),
            top: p(252),
            width: p(32),
            height: p(32),
            background: "#14532d",
            borderRadius: "50%",
          }}
        />

        {/* ── left eye shine ── */}
        <div
          style={{
            position: "absolute",
            left: p(212),
            top: p(257),
            width: p(10),
            height: p(10),
            background: "#ffffff",
            borderRadius: "50%",
          }}
        />

        {/* ── right eye ── */}
        <div
          style={{
            position: "absolute",
            left: p(279),
            top: p(252),
            width: p(32),
            height: p(32),
            background: "#14532d",
            borderRadius: "50%",
          }}
        />

        {/* ── right eye shine ── */}
        <div
          style={{
            position: "absolute",
            left: p(291),
            top: p(257),
            width: p(10),
            height: p(10),
            background: "#ffffff",
            borderRadius: "50%",
          }}
        />

        {/* ── smile (half-circle bottom border) ── */}
        <div
          style={{
            position: "absolute",
            left: p(210),
            top: p(295),
            width: p(92),
            height: p(46),
            border: `${p(9)}px solid #14532d`,
            borderTop: "none",
            borderRadius: `0 0 ${p(46)}px ${p(46)}px`,
          }}
        />

        {/* ── left blush ── */}
        <div
          style={{
            position: "absolute",
            left: p(167),
            top: p(280),
            width: p(38),
            height: p(20),
            background: "#fb7185",
            opacity: 0.55,
            borderRadius: "50%",
          }}
        />

        {/* ── right blush ── */}
        <div
          style={{
            position: "absolute",
            left: p(307),
            top: p(280),
            width: p(38),
            height: p(20),
            background: "#fb7185",
            opacity: 0.55,
            borderRadius: "50%",
          }}
        />
      </div>
    ),
    { width: size, height: size }
  );
}
