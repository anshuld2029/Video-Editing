import { ALL_FORMATS, Input, UrlSource } from "mediabunny";

export type VideoMetadata = {
  durationInSeconds: number;
  width: number;
  height: number;
};

export const getVideoMetadata = async (
  src: string,
): Promise<VideoMetadata> => {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(src, {
      getRetryDelay: () => null,
    }),
  });

  const videoTrack = await input.getPrimaryVideoTrack();
  if (!videoTrack) {
    throw new Error("No video track found");
  }

  const durationInSeconds = await input.computeDuration();

  return {
    durationInSeconds,
    width: videoTrack.displayWidth,
    height: videoTrack.displayHeight,
  };
};
