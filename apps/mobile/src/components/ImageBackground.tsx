import {
  ImageBackground as ExpoImageBackground,
  ImageBackgroundProps as ExpoImageBackgroundProps
} from "expo-image";

export type ImageBackgroundProps = ExpoImageBackgroundProps;

export const ImageBackground = (props: ExpoImageBackgroundProps) => {
  return <ExpoImageBackground cachePolicy="memory-disk" {...props} />;
};
