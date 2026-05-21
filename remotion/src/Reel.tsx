import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { z } from "zod";

const playfair = loadPlayfair("normal", { weights: ["400", "700", "900"] });
const inter = loadInter("normal", { weights: ["500", "700", "800"] });

const PLAYFAIR = playfair.fontFamily;
const INTER = inter.fontFamily;

const FPS = 30;
const OVERLAP = 15; // 0.5 s crossfade between clips

// (filename in public/, duration in frames, stage label or null)
const CLIPS: { src: string; dur: number; stage: string | null }[] = [
  { src: "Cooking/IMG_3310.mp4", dur: 150, stage: "prep" },
  { src: "Cooking/IMG_3311.mp4", dur: 120, stage: null },
  { src: "Cooking/IMG_3312.mp4", dur: 120, stage: null },
  { src: "Cooking/IMG_6670.mp4", dur: 120, stage: null },
  { src: "Cooking/IMG_6671.mp4", dur: 135, stage: "cook" },
  { src: "Cooking/IMG_6672.mp4", dur: 135, stage: null },
  { src: "Cooking/IMG_6675.mp4", dur: 135, stage: null },
  { src: "Cooking/IMG_6676.mp4", dur: 135, stage: "serve" },
  { src: "Cooking/IMG_6677.mp4", dur: 180, stage: null },
];

const STARTS: number[] = [];
let cursor = 0;
for (const c of CLIPS) {
  STARTS.push(cursor);
  cursor += c.dur - OVERLAP;
}
const TOTAL = cursor + OVERLAP;
export const reelDuration = TOTAL;

export const reelSchema = z.object({
  title: z.string(),
  endLine1: z.string(),
  endLine2: z.string(),
  audioSrc: z.string().describe("optional .mp3 in public/, blank for none"),
  audioVolume: z.number().min(0).max(1),
});

export const Reel: React.FC<z.infer<typeof reelSchema>> = ({
  title,
  endLine1,
  endLine2,
  audioSrc,
  audioVolume,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {CLIPS.map((c, i) => (
        <Sequence
          key={c.src}
          from={STARTS[i]}
          durationInFrames={c.dur}
          layout="none"
        >
          <Clip src={c.src} dur={c.dur} isFirst={i === 0} isLast={i === CLIPS.length - 1} />
        </Sequence>
      ))}

      <Vignette />

      <Sequence from={20} durationInFrames={110}>
        <TitleCard text={title} />
      </Sequence>

      {CLIPS.map((c, i) =>
        c.stage ? (
          <Sequence
            key={`badge-${i}`}
            from={STARTS[i] + 12}
            durationInFrames={75}
          >
            <StageBadge label={c.stage} />
          </Sequence>
        ) : null
      )}

      <Sequence from={TOTAL - 110} durationInFrames={110}>
        <EndCard line1={endLine1} line2={endLine2} />
      </Sequence>

      {audioSrc ? (
        <Audio src={staticFile(audioSrc)} volume={audioVolume} />
      ) : null}
    </AbsoluteFill>
  );
};

const Clip: React.FC<{
  src: string;
  dur: number;
  isFirst: boolean;
  isLast: boolean;
}> = ({ src, dur, isFirst, isLast }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, dur], [1.04, 1.1]);

  const fadeIn = isFirst
    ? interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" })
    : interpolate(frame, [0, OVERLAP], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = isLast
    ? interpolate(frame, [dur - 30, dur], [1, 0], { extrapolateLeft: "clamp" })
    : 1;
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ opacity }}>
      <OffthreadVideo
        src={staticFile(src)}
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          filter: "saturate(1.05) contrast(1.04)",
        }}
      />
    </AbsoluteFill>
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background:
        "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
    }}
  />
);

const TitleCard: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = text.split("");
  const fadeOut = interpolate(frame, [85, 110], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
        padding: 80,
      }}
    >
      <div
        style={{
          fontFamily: INTER,
          fontWeight: 500,
          fontSize: 34,
          letterSpacing: 14,
          color: "rgba(255,255,255,0.85)",
          textTransform: "uppercase",
          marginBottom: 30,
          opacity: interpolate(frame, [10, 30], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          textShadow: "0 2px 20px rgba(0,0,0,0.7)",
        }}
      >
        a homemade recipe
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: PLAYFAIR,
          fontWeight: 900,
          fontSize: 180,
          color: "white",
          letterSpacing: -4,
          lineHeight: 1,
          textShadow: "0 8px 40px rgba(0,0,0,0.7)",
        }}
      >
        {chars.map((ch, i) => {
          const delay = i * 3;
          const pop = spring({
            frame: frame - delay,
            fps,
            config: { damping: 14, mass: 0.7 },
          });
          const y = interpolate(pop, [0, 1], [60, 0]);
          const op = interpolate(pop, [0, 1], [0, 1]);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                transform: `translateY(${y}px)`,
                opacity: op,
                whiteSpace: "pre",
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const StageBadge: React.FC<{ label: string }> = ({ label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18 } });
  const exit = spring({ frame: frame - 55, fps, config: { damping: 18 } });
  const y = interpolate(enter, [0, 1], [40, 0]);
  const opIn = interpolate(enter, [0, 1], [0, 1]);
  const opOut = interpolate(exit, [0, 1], [1, 0], {
    extrapolateLeft: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 220,
      }}
    >
      <div
        style={{
          transform: `translateY(${y}px)`,
          opacity: Math.min(opIn, opOut),
          fontFamily: INTER,
          fontWeight: 800,
          fontSize: 42,
          color: "white",
          letterSpacing: 18,
          textTransform: "uppercase",
          padding: "16px 36px",
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(6px)",
          borderRadius: 4,
          border: "1px solid rgba(255,255,255,0.25)",
          textShadow: "0 2px 10px rgba(0,0,0,0.7)",
        }}
      >
        {label}
      </div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{ line1: string; line2: string }> = ({
  line1,
  line2,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = spring({ frame, fps, config: { damping: 20, mass: 1 } });
  const bg = interpolate(fadeIn, [0, 1], [0, 0.75]);
  return (
    <AbsoluteFill
      style={{
        background: `rgba(0,0,0,${bg})`,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeIn,
      }}
    >
      <div
        style={{
          fontFamily: PLAYFAIR,
          fontWeight: 700,
          fontSize: 170,
          color: "white",
          letterSpacing: -3,
          textAlign: "center",
          lineHeight: 1,
        }}
      >
        {line1}
      </div>
      <div
        style={{
          fontFamily: INTER,
          fontWeight: 500,
          fontSize: 36,
          color: "rgba(255,255,255,0.85)",
          letterSpacing: 8,
          textTransform: "uppercase",
          marginTop: 36,
        }}
      >
        {line2}
      </div>
    </AbsoluteFill>
  );
};
