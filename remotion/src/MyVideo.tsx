import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

export const myVideoSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  videoSrc: z
    .string()
    .describe("File in public/ — e.g. myvideo.mp4. Leave empty for none."),
});

export const MyVideo: React.FC<z.infer<typeof myVideoSchema>> = ({
  title,
  subtitle,
  videoSrc,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const titleIn = interpolate(frame, [0, fps * 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleOut = interpolate(
    frame,
    [fps * 3, fps * 3.6],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const titleOpacity = Math.min(titleIn, titleOut);

  const fadeOut = interpolate(
    frame,
    [durationInFrames - fps * 0.5, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        background: videoSrc
          ? "black"
          : "linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)",
      }}
    >
      {videoSrc ? (
        <AbsoluteFill style={{ opacity: fadeOut }}>
          <OffthreadVideo src={staticFile(videoSrc)} />
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          opacity: titleOpacity,
        }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.55)",
            padding: "40px 80px",
            borderRadius: 20,
            textAlign: "center",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "white",
          }}
        >
          <div style={{ fontSize: 120, fontWeight: 800 }}>{title}</div>
          <div style={{ fontSize: 48, opacity: 0.8, marginTop: 20 }}>
            {subtitle}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
