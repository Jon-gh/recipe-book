import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const size = parseInt(searchParams.get("size") ?? "512");

  const p = (n: number) => n * size; // proportional unit

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: "linear-gradient(135deg, #22c55e 0%, #14532d 100%)",
          borderRadius: p(0.22),
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Book */}
        <div
          style={{
            display: "flex",
            width: p(0.64),
            height: p(0.5),
            borderRadius: p(0.025),
            overflow: "hidden",
            boxShadow: `0 ${p(0.012)}px ${p(0.04)}px rgba(0,0,0,0.3)`,
          }}
        >
          {/* Left page */}
          <div
            style={{
              flex: 1,
              backgroundColor: "white",
              display: "flex",
              flexDirection: "column",
              padding: `${p(0.04)}px ${p(0.038)}px`,
              gap: p(0.018),
            }}
          >
            {/* Title */}
            <div
              style={{
                height: p(0.028),
                backgroundColor: "#16a34a",
                borderRadius: p(0.014),
                width: "72%",
              }}
            />
            {/* Divider */}
            <div
              style={{
                height: p(0.005),
                backgroundColor: "#bbf7d0",
                borderRadius: p(0.003),
                width: "90%",
                marginBottom: p(0.004),
              }}
            />
            {/* Recipe lines */}
            {([0.68, 0.82, 0.58, 0.75, 0.62, 0.78, 0.54] as number[]).map(
              (w, i) => (
                <div
                  key={i}
                  style={{
                    height: p(0.018),
                    backgroundColor: "#86efac",
                    borderRadius: p(0.009),
                    width: `${w * 100}%`,
                  }}
                />
              )
            )}
          </div>

          {/* Spine */}
          <div
            style={{
              width: p(0.042),
              backgroundColor: "#166534",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Spine highlight */}
            <div
              style={{
                width: p(0.012),
                height: "100%",
                backgroundColor: "#16a34a",
                opacity: 0.45,
                marginLeft: p(0.008),
              }}
            />
          </div>

          {/* Right page */}
          <div
            style={{
              flex: 1,
              backgroundColor: "#f0fdf4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Fork */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {/* Tines */}
              <div
                style={{
                  display: "flex",
                  gap: p(0.018),
                  marginBottom: 0,
                }}
              >
                {([0, 1, 2] as number[]).map((i) => (
                  <div
                    key={i}
                    style={{
                      width: p(0.024),
                      height: p(0.13),
                      backgroundColor: "#16a34a",
                      borderRadius: p(0.012),
                    }}
                  />
                ))}
              </div>
              {/* Shoulder */}
              <div
                style={{
                  width: p(0.108),
                  height: p(0.026),
                  backgroundColor: "#16a34a",
                  borderRadius: p(0.013),
                }}
              />
              {/* Handle */}
              <div
                style={{
                  width: p(0.042),
                  height: p(0.19),
                  backgroundColor: "#16a34a",
                  borderRadius: p(0.021),
                }}
              />
            </div>
          </div>
        </div>

        {/* Red bookmark ribbon at top of spine */}
        <div
          style={{
            position: "absolute",
            top: p(0.25),
            left: p(0.5) - p(0.016),
            width: p(0.032),
            height: p(0.07),
            backgroundColor: "#dc2626",
            borderRadius: `${p(0.004)}px ${p(0.004)}px 0 0`,
          }}
        />
      </div>
    ),
    { width: size, height: size }
  );
}
