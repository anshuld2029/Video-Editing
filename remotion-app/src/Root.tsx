import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { MyVideo, calculateMyVideoMetadata } from "./MyVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="EditMyVideo"
        component={MyVideo}
        calculateMetadata={calculateMyVideoMetadata}
        defaultProps={{
          src: "my-video.mp4",
          trimStartSeconds: 0,
          trimEndSeconds: 0,
          videoFound: false,
        }}
      />
      <Composition
        id="BlankCanvas"
        component={MyComposition}
        durationInFrames={60}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
