import type { StorySignupCopy } from "./story-signup";

import type { Metadata } from "next";

import Image from "next/image";

import { Logo } from "@/components/logo";
import { Restricter } from "@/components/restricter";
import { gilroy } from "@/lib/fonts";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { t } from "@/lib/translate";
import { cn } from "@/lib/utils";

import { readAttribution } from "./attribution";
import { StorySignup } from "./story-signup";

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
 * Three finished stories, shown as they would be posted. Sized as they are
 * committed (720x1280) so `next/image` reserves the right box and nothing
 * shifts when they arrive.
 */
const EXAMPLES = [
  { key: "editorial", src: "/story/editorial-cover.webp" },
  { key: "ticket", src: "/story/role-ticket.webp" },
  { key: "chat", src: "/story/dm-aberta.webp" },
] as const;

const EXAMPLE_WIDTH = 720;
const EXAMPLE_HEIGHT = 1280;

const STEPS = ["photos", "build", "post"] as const;

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
    rateLimited: t("story.form.rateLimited"),
    submit: t("story.form.submit"),
    submitting: t("story.form.submitting"),
  },
});

type StoryPageProps = {
  searchParams: Promise<Record<string, string[] | string | undefined>>;
};

export const generateMetadata = (): Metadata => {
  const title = t("story.metadata.title");
  const description = t("story.metadata.description");

  // One of the frames themselves. The page is a picture of a product, and this
  // is the picture; a separate card would have to be kept in step with it.
  const images = [
    {
      url: EXAMPLES[0].src,
      width: EXAMPLE_WIDTH,
      height: EXAMPLE_HEIGHT,
      alt: t("story.metadata.ogImageAlt"),
    },
  ];

  return {
    title,
    description,
    openGraph: { type: "website", title, description, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
};

const StoryPage = async ({ searchParams }: StoryPageProps) => {
  const locale = getSafeLocale();
  const attribution = readAttribution(await searchParams);

  const copy = signupCopy();

  return (
    <div className={cn(gilroy.variable, PAPER, "min-h-screen font-gilroy")}>
      <Restricter>
        {/*
         * `min-w-0` because this is a flex item and the example strip below is
         * wider than the screen on a phone. Without it the item grows to its
         * content instead of letting the strip scroll, and the whole page ends
         * up horizontally scrollable.
         */}
        <div className="flex w-full min-w-0 flex-1 flex-col gap-14 px-6 py-10 sm:px-10 sm:py-14 lg:gap-20 lg:py-20">
          <header>
            <Logo />
          </header>

          <section className="flex flex-col gap-5">
            <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.05] text-text sm:text-6xl lg:text-7xl">
              {t("story.headline")}
            </h1>
            <p className="max-w-xl text-lg font-medium text-subtitle sm:text-xl">
              {t("story.subline")}
            </p>
          </section>

          <section className="flex flex-col gap-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtitle">
              {t("story.examples.title")}
            </h2>
            {/*
             * A row of three on a desktop, and on a phone the same row turned
             * into a snap-scrolling strip. The negative margin lets the strip
             * bleed to both edges of the screen while the padding keeps the
             * first frame lined up with the headline above it.
             */}
            <ul className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0">
              {EXAMPLES.map(({ key, src }) => (
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
                      sizes="(min-width: 640px) 33vw, 70vw"
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
                  <span className="flex size-10 items-center justify-center rounded-full border border-primary text-base font-bold text-primary">
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
           * The button fills the width on a phone, where it is a thumb target
           * at the bottom of a long scroll, and sits at its own width from the
           * first breakpoint up, where a full-bleed pink bar would be the
           * loudest thing on a quiet page.
           */}
          <section className={cn(RULE, "flex flex-col gap-6 sm:items-start")}>
            <h2 className="text-3xl font-extrabold text-text sm:text-4xl">
              {t("story.form.title")}
            </h2>
            <StorySignup
              attribution={attribution}
              locale={locale}
              copy={copy}
            />
          </section>
        </div>
      </Restricter>
    </div>
  );
};

export default StoryPage;
