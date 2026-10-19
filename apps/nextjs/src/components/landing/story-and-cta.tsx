import type { StoreCampaign } from "@/app/store/store-urls";

import Image from "next/image";
import Link from "next/link";

import { Namespace } from "@pegada/shared/i18n/types/types";
import { CircleDashed, Copy, Share } from "lucide-react";

import { IdCard } from "@/components/landing/id-card";
import { StoreButtons } from "@/components/landing/store-buttons";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { toLocalePath } from "@/lib/locales";
import { t } from "@/lib/translate";
import { cn } from "@/lib/utils";

import styles from "./story-and-cta.module.css";

/** The dog on the story card ("Nina responde!"), so the sheet names her too. */
const STORY_DOG = "Nina";

/**
 * The app's share sheet, rows and labels as it ships them
 * (`apps/mobile/src/components/DogShareOptions`), minus the two "em breve"
 * fake doors. A picture of the UI, so it stays out of the accessibility tree;
 * the lede says the same thing in words.
 */
const ShareSheet = () => {
  const rows = [
    { icon: Share, key: "dogShare.shareLink" },
    { icon: Copy, key: "dogShare.copyLink" },
    { icon: CircleDashed, key: "dogShare.shareStory" },
  ] as const;

  return (
    <div className={styles.sheet} aria-hidden>
      <span className={styles.handle} />
      <p className={styles.sheetTitle}>
        {t("dogProfile.shareProfile", {
          ns: Namespace.Translation,
          name: STORY_DOG,
        })}
      </p>
      <ul className={styles.rows}>
        {rows.map(({ icon: Icon, key }) => (
          <li
            key={key}
            className={cn(
              styles.row,
              key === "dogShare.shareStory" && styles.picked,
            )}
          >
            <Icon className={styles.rowIcon} />
            {t(key, { ns: Namespace.Translation })}
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * The story the app makes from a dog's profile, lifting out of the share
 * sheet row that makes it, then the closing ask: a blank ID with the paw stamp
 * waiting for your dog. Only the `dm-aberta` story is shown because it is the
 * only design the app lets you make today (`DEFAULT_STORY_VARIANT` in
 * apps/mobile).
 */
export const StoryAndCta = ({ campaign }: { campaign?: StoreCampaign }) => {
  const locale = getSafeLocale();

  return (
    <>
      <section
        id="story"
        aria-labelledby="story-title"
        data-reveal
        className={cn(
          styles.story,
          "bg-navy py-section text-white dark:bg-page",
        )}
      >
        <div className="wrap grid items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="grid max-w-[34rem] justify-items-start gap-[18px]">
            <h2
              id="story-title"
              data-role="title"
              className="text-balance text-title"
            >
              {t("landing.storyCta.story.title")}
            </h2>
            <p
              data-role="lede"
              className="text-pretty text-lede text-[#D6DAE8]"
            >
              {t("landing.storyCta.story.description")}
            </p>
            <Link
              data-role="action"
              href={toLocalePath(locale, "/story")}
              className={styles.link}
            >
              {t("landing.storyCta.story.link")}
            </Link>
          </div>
          <div className={styles.stage}>
            <div className={styles.lift}>
              <Image
                src="/story/dm-aberta.webp"
                alt={t("story.examples.chat.alt")}
                width={900}
                height={1600}
                sizes="(min-width: 1024px) 280px, 58vw"
                className={styles.storyCard}
              />
            </div>
            <div data-role="card" className={styles.sheetSlot}>
              <ShareSheet />
            </div>
          </div>
        </div>
      </section>

      <section
        id="get"
        aria-labelledby="get-title"
        data-reveal
        className="overflow-hidden bg-field py-section text-ink"
      >
        <div className="wrap grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="grid justify-items-start gap-[22px]">
            <h2
              id="get-title"
              data-role="title"
              className="text-balance text-title"
            >
              {t("landing.storyCta.cta.title")}
            </h2>
            <p data-role="lede" className="text-lede">
              {t("landing.storyCta.cta.description")}
            </p>
            <div data-role="action" className="grid gap-3">
              <StoreButtons campaign={campaign} placement="cta" />
              <p className="text-[15px]">{t("landing.storyCta.cta.free")}</p>
            </div>
          </div>
          <div
            data-role="card"
            className="w-full max-w-[640px] justify-self-center"
          >
            <IdCard className="w-full" />
          </div>
        </div>
      </section>
    </>
  );
};
