import { Composition } from "remotion";
import { MyVideo, myVideoSchema } from "./MyVideo";

const FPS = 30;
const DURATION_SECONDS = 10;

export const Root: React.FC = () => {
  return (
    <Composition
      id="MyVideo"
      component={MyVideo}
      durationInFrames={FPS * DURATION_SECONDS}
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
  );
};
