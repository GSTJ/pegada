import { forwardRef, type ComponentRef } from "react";
import { Image as ExpoImage, type ImageProps } from "expo-image";

import { resolveImagePresentationProps } from "./imageProps";

export type LocalImageProps = ImageProps;

/**
 * Pegada's cached image with automatic blurhash placeholder support.
 *
 * This intentionally renders a single Expo Image. Keeping an outer View here
 * would require manually separating every current and future Image prop from
 * View props, which is how options such as contentFit and onDisplay were lost.
 */
export const Image = forwardRef<ComponentRef<typeof ExpoImage>, LocalImageProps>(
  ({ source, placeholder, contentFit, placeholderContentFit, cachePolicy, ...props }, ref) => {
    const presentationProps = resolveImagePresentationProps({
      source,
      placeholder,
      contentFit,
      placeholderContentFit,
      cachePolicy,
    });

    return <ExpoImage ref={ref} {...props} {...presentationProps} />;
  },
);

Image.displayName = "Image";
