import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const size = parseInt(searchParams.get("size") ?? "512");

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#16a34a",
          borderRadius: size * 0.22,
        }}
      >
        <div
          style={{
            fontSize: size * 0.52,
            lineHeight: 1,
          }}
        >
          🍽
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
