import {
  ImageBackground as ExpoImageBackground
  
} from "expo-image";
import type {ImageBackgroundProps as ExpoImageBackgroundProps} from "expo-image";

export type ImageBackgroundProps = ExpoImageBackgroundProps;

export const ImageBackground = (props: ExpoImageBackgroundProps) => {
  return <ExpoImageBackground cachePolicy="memory-disk" {...props} />;
};
