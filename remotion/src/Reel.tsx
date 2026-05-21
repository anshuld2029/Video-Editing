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
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { z } from "zod";

const bebas = loadBebas("normal", { weights: ["400"] });
const inter = loadInter("normal", { weights: ["500", "700", "800", "900"] });
const BEBAS = bebas.fontFamily;
const INTER = inter.fontFamily;

const FPS = 30;
const PUNCH_OVERLAP = 6;
const SLOW_OVERLAP = 14;

type ClipKind = "hook" | "ingredient" | "cook" | "plate";

const CLIPS: { src: string; dur: number; kind: ClipKind }[] = [
  { src: "Cooking/IMG_6677.mp4", dur: 30, kind: "hook" },
  { src: "Cooking/IMG_3310.mp4", dur: 60, kind: "ingredient" },
  { src: "Cooking/IMG_3311.mp4", dur: 60, kind: "ingredient" },
  { src: "Cooking/IMG_3312.mp4", dur: 60, kind: "ingredient" },
  { src: "Cooking/IMG_6670.mp4", dur: 105, kind: "cook" },
  { src: "Cooking/IMG_6671.mp4", dur: 105, kind: "cook" },
  { src: "Cooking/IMG_6672.mp4", dur: 105, kind: "cook" },
  { src: "Cooking/IMG_6675.mp4", dur: 135, kind: "plate" },
  { src: "Cooking/IMG_6676.mp4", dur: 165, kind: "plate" },
];

const STARTS: number[] = [];
{
  let cursor = 0;
  for (let i = 0; i < CLIPS.length; i++) {
    STARTS.push(cursor);
    const overlap = CLIPS[i].kind === "ingredient" || CLIPS[i].kind === "hook"
      ? PUNCH_OVERLAP
      : SLOW_OVERLAP;
    cursor += CLIPS[i].dur - overlap;
  }
}
const TOTAL = STARTS[STARTS.length - 1] + CLIPS[CLIPS.length - 1].dur;
export const reelDuration = TOTAL;

type CaptionStyle = "hook" | "title" | "tag" | "end";
const CAPTIONS: {
  from: number;
  dur: number;
  text: string;
  style: CaptionStyle;
  sub?: string;
}[] = [
  { from: 2, dur: 28, text: "POV: ghar mein\ndesi pasta", style: "hook" },
  { from: 32, dur: 55, text: "DESI PASTA", style: "title" },
  { from: TOTAL - 75, dur: 70, text: "tum bhi try karo", style: "end", sub: "save kar lo" },
];

export const reelSchema = z.object({
  audioSrc: z.string(),
  audioVolume: z.number().min(0).max(1),
});

export const Reel: React.FC<z.infer<typeof reelSchema>> = ({
  audioSrc,
  audioVolume,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {CLIPS.map((c, i) => (
        <Sequence
          key={i}
          from={STARTS[i]}
          durationInFrames={c.dur}
          layout="none"
        >
          <Clip
            src={c.src}
            dur={c.dur}
            kind={c.kind}
            isFirst={i === 0}
            isLast={i === CLIPS.length - 1}
          />
        </Sequence>
      ))}

      <Vignette />

      {CAPTIONS.map((cap, i) => (
        <Sequence key={`cap-${i}`} from={cap.from} durationInFrames={cap.dur}>
          <Caption {...cap} />
        </Sequence>
      ))}

      {audioSrc ? (
        <Audio src={staticFile(audioSrc)} volume={audioVolume} />
      ) : null}
    </AbsoluteFill>
  );
};

const Clip: React.FC<{
  src: string;
  dur: number;
  kind: ClipKind;
  isFirst: boolean;
  isLast: boolean;
}> = ({ src, dur, kind, isFirst, isLast }) => {
  const frame = useCurrentFrame();
  const isPunch = kind === "hook" || kind === "ingredient";

  // ken-burns push
  const kenScale = interpolate(frame, [0, dur], [1.04, 1.12]);
  // punch entry
  const punchScale = isPunch
    ? interpolate(frame, [0, 10], [1.18, 1.0], {
        extrapolateRight: "clamp",
      })
    : 1.0;
  const scale = kenScale * punchScale;

  const inFrames = isPunch ? PUNCH_OVERLAP : SLOW_OVERLAP;
  const fadeIn = isFirst
    ? interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" })
    : interpolate(frame, [0, inFrames], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = isLast
    ? interpolate(frame, [dur - 30, dur], [1, 0], {
        extrapolateLeft: "clamp",
      })
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
          filter: "saturate(1.15) contrast(1.08)",
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
        "radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.45) 100%)",
    }}
  />
);

const Caption: React.FC<{
  text: string;
  style: CaptionStyle;
  dur: number;
  sub?: string;
}> = ({ text, style, dur, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, mass: 0.6 } });
  const exit = interpolate(frame, [dur - 8, dur], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(enter, exit);

  if (style === "title") {
    return (
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", opacity }}
      >
        <div
          style={{
            transform: `scale(${interpolate(enter, [0, 1], [0.6, 1])})`,
            fontFamily: BEBAS,
            fontSize: 280,
            color: "white",
            letterSpacing: -2,
            lineHeight: 0.9,
            textAlign: "center",
            textShadow:
              "0 0 0 #000, 6px 6px 0 #000, -6px 6px 0 #000, 0 10px 30px rgba(0,0,0,0.6)",
            WebkitTextStroke: "6px black",
          }}
        >
          {text}
        </div>
      </AbsoluteFill>
    );
  }

  if (style === "hook") {
    const y = interpolate(enter, [0, 1], [80, 0]);
    return (
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          opacity,
        }}
      >
        <div
          style={{
            transform: `translateY(${y}px)`,
            fontFamily: INTER,
            fontWeight: 900,
            fontSize: 110,
            color: "white",
            background: "#000",
            padding: "20px 36px",
            borderRadius: 8,
            textAlign: "center",
            lineHeight: 1.05,
            letterSpacing: -2,
            textTransform: "lowercase",
            boxShadow: "8px 8px 0 #facc15",
            whiteSpace: "pre-line",
          }}
        >
          {text}
        </div>
      </AbsoluteFill>
    );
  }

  if (style === "end") {
    return (
      <AbsoluteFill
        style={{
          background: `rgba(0,0,0,${opacity * 0.7})`,
          justifyContent: "center",
          alignItems: "center",
          opacity,
        }}
      >
        <div
          style={{
            fontFamily: BEBAS,
            fontSize: 220,
            color: "white",
            letterSpacing: -1,
            textAlign: "center",
            lineHeight: 0.95,
            WebkitTextStroke: "4px black",
            textShadow: "8px 8px 0 #facc15",
          }}
        >
          {text}
        </div>
        {sub ? (
          <div
            style={{
              fontFamily: INTER,
              fontWeight: 800,
              fontSize: 56,
              color: "#facc15",
              letterSpacing: 6,
              marginTop: 40,
              textTransform: "uppercase",
            }}
          >
            {sub}
          </div>
        ) : null}
      </AbsoluteFill>
    );
  }

  // tag - bottom sticker-style caption
  const y = interpolate(enter, [0, 1], [40, 0]);
  const rotate = interpolate(enter, [0, 1], [-3, -2]);
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 280,
        opacity,
      }}
    >
      <div
        style={{
          transform: `translateY(${y}px) rotate(${rotate}deg)`,
          fontFamily: INTER,
          fontWeight: 900,
          fontSize: 90,
          color: "#000",
          background: "#facc15",
          padding: "18px 40px",
          borderRadius: 10,
          textAlign: "center",
          lineHeight: 1.05,
          letterSpacing: -1,
          textTransform: "lowercase",
          boxShadow: "6px 6px 0 #000",
          whiteSpace: "pre-line",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
