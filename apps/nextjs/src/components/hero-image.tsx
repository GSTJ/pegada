import Image from "next/image";

/**
 * `sizes` is written in `vh` on purpose. The box is sized by height
 * (`85dvh`, clamped to 600–1200px) and the width follows from the asset's
 * aspect ratio, so viewport *width* tells the browser nothing useful here:
 * 85vh x (1308/2540) = 43.8vh, rounded up to 45vh for headroom at the two
 * clamps. A `vw`/`px` hint would ask for ~1.6x more pixels than the box ever
 * paints on a laptop-height screen.
 *
 * `aspect-[327/635]` is 1308:2540 reduced, and it is load-bearing rather than
 * decorative. This div has no width of its own, so it shrink-to-fits around
 * the image's ratio — and a responsive `<img>` takes that ratio from the
 * density-corrected natural size of whichever srcset candidate happens to be
 * loaded, not from the `width`/`height` below. The optimiser rounds variant
 * heights to whole pixels, so without this the box width lands 0.06–0.16px
 * off the single-source layout, differently per DPR.
 *
 * `src` is a string rather than a static import because `next-env.d.ts` is
 * gitignored here, so CI typechecks without `next/image-types/global` and a
 * `.webp` import has no declaration to resolve against.
 */
export const HeroImage = () => (
  <div className="flex flex-1 justify-center">
    <div className="mt-auto mb-12 h-[85dvh] max-h-[1200px] min-h-[600px]">
      <Image
        src="/phone-mockup.webp"
        width={1308}
        height={2540}
        draggable="false"
        alt=""
        priority
        quality={90}
        sizes="45vh"
        className="select-none size-full object-cover aspect-[327/635]"
      />
    </div>
  </div>
);
