import type { StorySignupCopy } from "./story-signup";

import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";

import { storeUrlFor } from "@/app/store/store-urls";
import { DownloadCta } from "@/components/download-cta";
import { Logo } from "@/components/logo";
import { Restricter } from "@/components/restricter";
import { StoreButton } from "@/components/store-button";
import { gilroy } from "@/lib/fonts";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { toLocalePath, toOpenGraphLocale } from "@/lib/locales";
import { t } from "@/lib/translate";
import { cn } from "@/lib/utils";

import { readAttribution } from "./attribution";
import { STORY_REF, storyStoreHref } from "./store-link";
import { StorySignup } from "./story-signup";
import { StoryView } from "./story-view";

/**
 * The paper the page is printed on. Off-white rather than white, so the
 * example frames sit on it like photos on a page instead of floating on a
 * screen, and dark enough that the one accent (the brand pink) is the only
 * thing that raises its voice.
 */
const PAPER = "bg-[#F3F0E6]";

/** A hairline in the ink colour, which is what separates the sections. */
const RULE = "border-t border-text/10 pt-12 lg:pt-16";

/**
 * The two cards the app actually makes, in the order it offers them: "DM
 * aberta" is the default and "Passe de rolê" the second variant (see
 * `apps/mobile/src/components/DogShareOptions/story/variants.ts`). These two
 * files are the app's own output for a four photo dog, not artwork drawn to
 * look like it.
 *
 * A third frame used to sit here, an editorial cover no variant produces.
 *
 * Sized as they are committed (900x1600) so `next/image` reserves the right
 * box and nothing shifts when they arrive. 900 rather than the 720 they were:
 * the strip is 70vw on a phone, which is 273px on a 390pt screen and 819
 * device pixels at 3x, and the old files were softer than that.
 */
const EXAMPLES = [
  { key: "chat", src: "/story/dm-aberta.webp" },
  { key: "ticket", src: "/story/role-ticket.webp" },
] as const;

const EXAMPLE_WIDTH = 900;
const EXAMPLE_HEIGHT = 1600;

/**
 * The share card: the wordmark, the headline and the two frames, on the same
 * paper, at the 1.91:1 every scraper crops to. A 9:16 frame handed to
 * `summary_large_image` is cropped to a strip of its middle, and WhatsApp's
 * scraper is unreliable on WebP, so these are flat JPEGs built by hand.
 *
 * One per locale, because the headline is on the card and a WhatsApp thumbnail
 * is small enough that the frames alone read as two coloured rectangles.
 */
const OG_IMAGE_BY_LOCALE: Record<string, string> = {
  "pt-br": "/story/og.jpg",
};

const OG_IMAGE_FALLBACK = "/story/og-en.jpg";

const ogImage = (locale: string) => ({
  url: OG_IMAGE_BY_LOCALE[locale] ?? OG_IMAGE_FALLBACK,
  width: 1200,
  height: 630,
});

/** This page's own path, per locale, for the canonical and `og:url`. */
const ROUTE_PATH = "/story";

const STEPS = ["app", "photos", "post"] as const;

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 text-center text-lg font-semibold text-white transition-transform duration-200 ease-in-out hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:scale-100";

/**
 * The form's words. `t()` reads the locale off the request, so the copy has to
 * be resolved on this side of the boundary and handed over as plain strings.
 */
const signupCopy = (): StorySignupCopy => ({
  cta: t("story.cta"),
  success: t("story.success"),
  form: {
    description: t("story.form.description"),
    failed: t("story.form.failed"),
    honeypot: t("story.form.honeypot"),
    invalid: t("story.form.invalid"),
    label: t("story.form.label"),
    placeholder: t("story.form.placeholder"),
    privacy: t("story.form.privacy"),
    rateLimited: t("story.form.rateLimited"),
    submit: t("story.form.submit"),
    submitting: t("story.form.submitting"),
  },
});

/**
 * Both store badges, carrying this page's referrer.
 *
 * Used twice: at the foot of a desktop, and again under the thank you once
 * someone leaves an address, which is the one moment the page has their
 * attention and nothing to give them but the app.
 */
const StoreBadges = ({
  className,
  placement,
}: {
  className?: string;
  placement: string;
}) => (
  <div className={cn("flex flex-row gap-3", className)}>
    <StoreButton
      href={storeUrlFor({ target: "ios", campaign: { ref: STORY_REF } })}
      target="_blank"
      page="story"
      placement={placement}
      store="app_store"
      referral={STORY_REF}
    >
      <StoreButton.Icon
        width={20}
        height={20}
        src="/app-store-icon.svg"
        alt="App Store"
      />
      <StoreButton.Text>{t("home.cta.appStore")}</StoreButton.Text>
    </StoreButton>
    <StoreButton
      href={storeUrlFor({ target: "android", campaign: { ref: STORY_REF } })}
      target="_blank"
      page="story"
      placement={placement}
      store="play_store"
      referral={STORY_REF}
    >
      <StoreButton.Icon
        width={24}
        height={24}
        src="/google-play-icon.svg"
        alt="Google Play"
      />
      <StoreButton.Text>{t("home.cta.googlePlay")}</StoreButton.Text>
    </StoreButton>
  </div>
);

type StoryPageProps = {
  searchParams: Promise<Record<string, string[] | string | undefined>>;
};

export const generateMetadata = (): Metadata => {
  const locale = getSafeLocale();
  const title = t("story.metadata.title");
  const description = t("story.metadata.description");
  const images = [{ ...ogImage(locale), alt: t("story.metadata.ogImageAlt") }];

  // `openGraph` replaces the root layout's wholesale rather than merging into
  // it, so `url`, `siteName` and `locale` have to be restated here or this
  // page's card loses them. `alternates` is a separate field and still comes
  // from the layout, which builds it from the request path.
  return {
    title,
    description,
    openGraph: {
      type: "website",
      locale: toOpenGraphLocale(locale),
      siteName: "Pegada",
      url: toLocalePath(locale, ROUTE_PATH),
      title,
      description,
      images,
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
};

const StoryPage = async ({ searchParams }: StoryPageProps) => {
  const locale = getSafeLocale();
  const attribution = readAttribution(await searchParams);

  const copy = signupCopy();
  const store = storyStoreHref(attribution);

  return (
    <div className={cn(gilroy.variable, PAPER, "min-h-screen font-gilroy")}>
      <StoryView attribution={attribution} locale={locale} />
      <Restricter>
        {/*
         * `min-w-0` because this is a flex item and the example strip below is
         * wider than the screen on a phone. Without it the item grows to its
         * content instead of letting the strip scroll, and the whole page ends
         * up horizontally scrollable.
         */}
        <div className="flex w-full min-w-0 flex-1 flex-col gap-14 px-6 py-10 sm:px-10 sm:py-14 lg:gap-20 lg:py-20">
          {/*
           * The mark is the way back to the rest of the site. This page is
           * reached from an Instagram bio as often as from the homepage, so a
           * visitor who lands here cold has no other route to it.
           */}
          <header>
            <Link
              href={toLocalePath(locale, "/")}
              aria-label="Pegada"
              className="inline-flex w-fit"
            >
              <Logo />
            </Link>
          </header>

          <section className="flex flex-col gap-5">
            <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.05] text-text sm:text-6xl lg:text-7xl">
              {t("story.headline")}
            </h1>
            <p className="max-w-xl text-lg font-medium text-subtitle sm:text-xl">
              {t("story.subline")}
            </p>

            {/*
             * The ask, split by what the visitor can actually do.
             *
             * A phone is one tap from the store and the card is made on the
             * device, so the store is the whole ask and the button is a
             * full-width thumb target. A laptop cannot install anything, and
             * `/store` bounces desktop traffic back to the homepage, so there
             * the address is the ask instead.
             */}
            <div className="mt-3 flex flex-col gap-4 sm:hidden">
              <DownloadCta
                href={store}
                page="story"
                placement="hero"
                store="auto"
                referral={STORY_REF}
                className={cn(PRIMARY_BUTTON, "w-full")}
              >
                {t("story.download.hero")}
              </DownloadCta>
            </div>

            <div className="mt-3 hidden flex-col items-start gap-3 sm:flex">
              <p className="text-base font-semibold text-text">
                {t("story.form.title")}
              </p>
              <StorySignup
                attribution={attribution}
                locale={locale}
                copy={copy}
                privacyHref={toLocalePath(locale, "/privacy-policy")}
              >
                <StoreBadges placement="signup_success" />
              </StorySignup>
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtitle">
              {t("story.examples.title")}
            </h2>
            {/*
             * Two across from the first breakpoint up, and on a phone the same
             * row turned into a snap-scrolling strip. The negative margin lets
             * the strip bleed to both edges of the screen while the padding
             * keeps the first frame lined up with the headline above it.
             */}
            <ul className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 sm:mx-0 sm:grid sm:max-w-2xl sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0">
              {EXAMPLES.map(({ key, src }, index) => (
                <li
                  key={key}
                  className="w-[70vw] max-w-[300px] shrink-0 snap-center sm:w-auto sm:max-w-none"
                >
                  <div className="overflow-hidden rounded-3xl border border-text/10 shadow-[0_18px_40px_-24px_rgba(20,20,20,0.55)]">
                    <Image
                      src={src}
                      alt={t(`story.examples.${key}.alt`)}
                      width={EXAMPLE_WIDTH}
                      height={EXAMPLE_HEIGHT}
                      sizes="(min-width: 640px) 340px, 70vw"
                      // The first frame is the LCP element on every viewport;
                      // the second is off screen on a phone and below the fold
                      // on a desktop, so it stays lazy.
                      priority={index === 0}
                      className="h-auto w-full"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={cn(RULE, "flex flex-col gap-8")}>
            <h2 className="text-3xl font-extrabold text-text sm:text-4xl">
              {t("story.howItWorks.title")}
            </h2>
            <ol className="grid gap-8 sm:grid-cols-3 sm:gap-10">
              {STEPS.map((key, index) => (
                <li key={key} className="flex flex-col gap-3">
                  {/*
                   * The numeral is ink, not pink: the brand pink on this
                   * paper is 2.66:1, which fails at this size. The ring keeps
                   * the accent where contrast does not matter.
                   */}
                  <span className="flex size-10 items-center justify-center rounded-full border border-primary text-base font-bold text-text">
                    {index + 1}
                  </span>
                  <p className="text-lg font-medium text-text">
                    {t(`story.howItWorks.${key}`)}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/*
           * The same ask again at the foot of a long scroll, where anyone who
           * read the steps has stopped reading. Two badges on a desktop, which
           * is what the homepage ends on too, and the one button on a phone.
           */}
          <section className={cn(RULE, "flex flex-col gap-6 sm:items-start")}>
            <DownloadCta
              href={store}
              page="story"
              placement="footer"
              store="auto"
              referral={STORY_REF}
              className={cn(PRIMARY_BUTTON, "w-full sm:hidden")}
            >
              {t("story.download.footer")}
            </DownloadCta>

            <StoreBadges className="hidden sm:flex" placement="footer" />
          </section>
        </div>
      </Restricter>
    </div>
  );
};

export default StoryPage;
