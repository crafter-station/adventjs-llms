import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default async function Icon() {
  const fontData = await readFile(
    join(
      process.cwd(),
      "src/app/fonts/DepartureMono/DepartureMono-Regular.otf",
    ),
  );

  return new ImageResponse(
    <div
      style={{
        fontSize: 18,
        background: "#e5e5e5",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#841424",
        fontWeight: "bold",
        fontFamily: "Departure Mono",
      }}
    >
      A0
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Departure Mono",
          data: fontData,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
