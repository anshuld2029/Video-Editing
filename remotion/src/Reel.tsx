import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const CLIPS = [
  "Cooking/IMG_6670.mov",
  "Cooking/IMG_6671.mov",
  "Cooking/IMG_6672.mov",
  "Cooking/IMG_6675.mov",
  "Cooking/IMG_3310.mov",
  "Cooking/IMG_3311.mov",
  "Cooking/IMG_3312.mov",
  "Cooking/IMG_6676.mov",
  "Cooking/IMG_6677.mov",
  "Cooking/87040D75-84DA-40D2-A7AE-E7EC5B8B9B41.mov",
];

const CLIP_FRAMES = 75; // 2.5s per clip @ 30fps
const TOTAL_FRAMES = CLIPS.length * CLIP_FRAMES;

export const reelDuration = TOTAL_FRAMES;

export const Reel: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {CLIPS.map((src, i) => (
        <Sequence
          key={src}
          from={i * CLIP_FRAMES}
          durationInFrames={CLIP_FRAMES}
        >
          <Clip src={src} index={i} />
        </Sequence>
      ))}

      <Sequence from={0} durationInFrames={70}>
        <TitleCard text="Desi Pasta" />
      </Sequence>

      <Sequence from={CLIP_FRAMES * 4} durationInFrames={70}>
        <StageBadge label="Time to cook" />
      </Sequence>

      <Sequence from={CLIP_FRAMES * 7} durationInFrames={70}>
        <StageBadge label="Plated" />
      </Sequence>

      <Sequence from={TOTAL_FRAMES - 70} durationInFrames={70}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};

const Clip: React.FC<{ src: string; index: number }> = ({ src, index }) => {
  const frame = useCurrentFrame();
  const dir = index % 2 === 0 ? 1 : -1;
  const scale = interpolate(frame, [0, CLIP_FRAMES], [1, 1 + dir * 0.06]);
  const fadeIn = interpolate(frame, [0, 4], [0, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <OffthreadVideo
        src={staticFile(src)}
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};

const TitleCard: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });
  const fadeOut = interpolate(frame, [50, 70], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          transform: `scale(${pop})`,
          background:
            "linear-gradient(135deg, rgba(245,158,11,0.95), rgba(239,68,68,0.95))",
          padding: "50px 90px",
          borderRadius: 40,
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontWeight: 900,
          fontSize: 150,
          letterSpacing: -2,
          textShadow: "0 6px 30px rgba(0,0,0,0.5)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

const StageBadge: React.FC<{ label: string }> = ({ label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const exit = spring({
    frame: frame - 50,
    fps,
    config: { damping: 14 },
  });
  const x =
    interpolate(enter, [0, 1], [-500, 0]) +
    interpolate(exit, [0, 1], [0, -500], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "flex-start",
        padding: 80,
      }}
    >
      <div
        style={{
          transform: `translateX(${x}px)`,
          background: "linear-gradient(90deg, #f59e0b, #ef4444)",
          padding: "24px 48px",
          borderRadius: 60,
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontWeight: 800,
          fontSize: 60,
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          textTransform: "uppercase",
          letterSpacing: 2,
        }}
      >
        {label}
      </div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = spring({ frame, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: `rgba(0,0,0,${opacity * 0.75})`,
      }}
    >
      <div
        style={{
          opacity,
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontWeight: 900,
          fontSize: 160,
          textAlign: "center",
          letterSpacing: -3,
        }}
      >
        Desi Pasta
        <div
          style={{
            fontSize: 55,
            fontWeight: 500,
            opacity: 0.9,
            marginTop: 30,
            letterSpacing: 0,
          }}
        >
          follow for more
        </div>
      </div>
    </AbsoluteFill>
  );
};
