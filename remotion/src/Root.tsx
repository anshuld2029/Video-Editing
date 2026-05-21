import { Composition } from "remotion";
import { MyVideo, myVideoSchema } from "./MyVideo";
import { Reel, reelDuration, reelSchema } from "./Reel";

const FPS = 30;

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="Reel"
        component={Reel}
        durationInFrames={reelDuration}
        fps={FPS}
        width={1080}
        height={1920}
        schema={reelSchema}
        defaultProps={{
          audioSrc: "",
          audioVolume: 0.6,
        }}
      />
      <Composition
        id="MyVideo"
        component={MyVideo}
        durationInFrames={FPS * 10}
        fps={FPS}
        width={1920}
        height={1080}
        schema={myVideoSchema}
        defaultProps={{
          title: "My Video",
          subtitle: "Edited with Remotion",
          videoSrc: "",
        }}
      />
    </>
  );
};
