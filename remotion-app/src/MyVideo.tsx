import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  staticFile,
  useVideoConfig,
} from "remotion";
import { getVideoMetadata } from "./get-video-metadata";

export type MyVideoProps = {
  // File name of a video placed in the public/ folder.
  src: string;
  // Cut off the first N seconds of the source video.
  trimStartSeconds: number;
  // Stop the video N seconds before its natural end (0 = keep until the end).
  trimEndSeconds: number;
  // Set internally by calculateMetadata - do not edit by hand.
  videoFound: boolean;
};

export const calculateMyVideoMetadata: CalculateMetadataFunction<
  MyVideoProps
> = async ({ props }) => {
  try {
    const { durationInSeconds, width, height } = await getVideoMetadata(
      staticFile(props.src),
    );

    const fps = 30;
    const playedSeconds = Math.max(
      0,
      durationInSeconds - props.trimStartSeconds - props.trimEndSeconds,
    );

    return {
      durationInFrames: Math.max(1, Math.round(playedSeconds * fps)),
      fps,
      width,
      height,
      props: { ...props, videoFound: true },
    };
  } catch {
    // No video in public/ yet - show the instructions screen instead.
    return {
      durationInFrames: 150,
      fps: 30,
      width: 1280,
      height: 720,
      props: { ...props, videoFound: false },
    };
  }
};

export const MyVideo: React.FC<MyVideoProps> = ({
  src,
  trimStartSeconds,
  trimEndSeconds,
  videoFound,
}) => {
  const { fps } = useVideoConfig();

  if (!videoFound) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#0b0b0f",
          color: "white",
          fontFamily: "sans-serif",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 80,
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 700, marginBottom: 24 }}>
          Drop your video here
        </div>
        <div style={{ fontSize: 28, opacity: 0.8, lineHeight: 1.5 }}>
          Put a file named <b>{src}</b> in the{" "}
          <code style={{ color: "#7dd3fc" }}>public/</code> folder,
          <br />
          then reopen this composition.
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Video
        src={staticFile(src)}
        trimBefore={trimStartSeconds > 0 ? trimStartSeconds * fps : undefined}
      />
    </AbsoluteFill>
  );
};
