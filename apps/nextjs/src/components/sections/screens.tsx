import Image from "next/image";

import { t } from "@/lib/translate";
import { cn } from "@/lib/utils";

/**
 * Real captures off the shipped iOS build — a booted simulator running the
 * app against a seeded database, not renders or edits. Each file is the
 * 1320x2868 device screenshot downscaled to 720px wide and encoded with
 * `cwebp -q 75 -m 6`, the same settings
 * scripts/convert-png-images-to-webp.sh already uses on the mobile assets.
 *
 * 720px is 2x the widest a phone is ever painted here (~340px in the
 * small-screen carousel, ~280px in the four-up desktop grid), so the source
 * never caps sharpness on a retina display. Heights differ by 3px because
 * swipe.webp came off a 1290x2796 capture and the other three off a
 * 1320x2868 one; the frame crops to a single ratio so the row still lines up.
 */
const screens = [
  { key: "swipe", src: "/screens/swipe.webp", width: 720, height: 1561 },
  { key: "profile", src: "/screens/profile.webp", width: 720, height: 1564 },
  { key: "match", src: "/screens/match.webp", width: 720, height: 1564 },
  { key: "chat", src: "/screens/chat.webp", width: 720, height: 1564 },
] as const;

/**
 * The walk keeps going. How it works draws a trail of paw prints across the
 * four steps; here the phones themselves take the steps, rising and falling
 * like alternating footfalls. Only on the wide grid — stacked or scrolled,
 * the offset would just look like a misalignment.
 */
const footfall = ["lg:translate-y-6", "lg:-translate-y-3"] as const;

export const Screens = () => (
  <section className="px-6 py-20 sm:px-12 sm:py-28">
    <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:gap-14">
      <h2 className="mx-auto max-w-2xl text-center text-4xl font-extrabold text-text sm:text-5xl lg:mx-0 lg:text-left">
        {t("home.screens.title")}
      </h2>
      {/*
        Small screens scroll sideways so each phone stays big enough to read,
        the way the app stores present the same thing. The list itself takes
        focus so the region is reachable without a pointer.
      */}
      <ul
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- A horizontally scrollable region with no focusable children needs a tab stop of its own, or a keyboard user cannot reach the screens past the first. WCAG 2.1.1.
        tabIndex={0}
        aria-label={t("home.screens.title")}
        className="-mx-6 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:-mx-12 sm:px-12 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-8 lg:snap-none lg:overflow-x-visible lg:px-0"
      >
        {screens.map(({ key, src, width, height }, index) => (
          <li
            key={key}
            className={cn(
              "flex w-[15rem] shrink-0 snap-center flex-col gap-5 sm:w-[17rem] lg:w-auto",
              footfall[index % footfall.length],
            )}
          >
            {/*
              Bezel borrowed from the hero mockup above: one dark ink frame,
              a hair of padding, and the same generous corner radius. The
              status bar and dynamic island come free — they are part of the
              capture.
            */}
            <div className="rounded-[2.25rem] bg-text p-1.5 shadow-xl">
              <Image
                src={src}
                width={width}
                height={height}
                loading="lazy"
                quality={75}
                sizes="(min-width: 1024px) 20vw, 17rem"
                alt={t(`home.screens.${key}.alt`)}
                className="aspect-[1320/2868] w-full rounded-[1.85rem] object-cover"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-lg font-bold text-text">
                {t(`home.screens.${key}.title`)}
              </h3>
              <p className="text-base font-light text-subtitle">
                {t(`home.screens.${key}.description`)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </section>
);
