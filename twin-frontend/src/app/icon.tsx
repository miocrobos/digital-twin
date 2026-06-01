import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#f0f5f1",
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
        }}
      >
        <div style={{ display: "flex", position: "relative", width: 16, height: 24 }}>
          {/* left backbone */}
          <div
            style={{
              position: "absolute",
              left: 2,
              top: 0,
              width: 2.5,
              height: 24,
              background: "#3c4f3d",
              borderRadius: 2,
            }}
          />
          {/* right backbone */}
          <div
            style={{
              position: "absolute",
              right: 2,
              top: 0,
              width: 2.5,
              height: 24,
              background: "#3c4f3d",
              borderRadius: 2,
            }}
          />
          {/* rungs alternating green / orange */}
          {[2, 7, 13, 19].map((top, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 4,
                top,
                width: 8,
                height: 2.5,
                background: i % 2 === 0 ? "#3a9e56" : "#de8246",
                borderRadius: 1,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
