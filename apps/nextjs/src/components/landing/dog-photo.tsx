import type { Dog } from "@/components/landing/dogs";

import { preload } from "react-dom";

type DogPhotoProps = {
  dog: Dog;
  /**
   * `inLocale(dog.alt, locale)`, or `""` when the text beside the photo
   * already says who it is. Passed in rather than read off the request so a
   * client component (the deck) can render this too.
   */
  alt: string;
  className?: string;
  /** For the one photo that is the first paint (the top card of the deck). */
  priority?: boolean;
};

/**
 * The photos are encoded once at 2x their largest box (`public/landing/dogs`),
 * so they skip the image optimizer and its cold start on the first request.
 */
export const DogPhoto = ({ dog, alt, className, priority }: DogPhotoProps) => {
  // React only hoists a preload for a bare <img>, never one inside <picture>,
  // so the LCP photo was found after the fonts. `type` keeps browsers without
  // AVIF from fetching it.
  if (priority) {
    preload(dog.photo.avif, {
      as: "image",
      type: "image/avif",
      fetchPriority: "high",
    });
  }

  return (
    <picture className="contents">
      <source type="image/avif" srcSet={dog.photo.avif} />
      <img
        src={dog.photo.webp}
        width={dog.photo.width}
        height={dog.photo.height}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        draggable={false}
        className={className}
      />
    </picture>
  );
};
