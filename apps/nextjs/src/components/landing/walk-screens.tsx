import { Namespace } from "@pegada/shared/i18n/types/types";

import { DogPhoto } from "@/components/landing/dog-photo";
import { DOGS, inLocale } from "@/components/landing/dogs";
import styles from "@/components/landing/walk.module.css";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { t } from "@/lib/translate";

/*
 * The four moments, rebuilt from the app's own screens with the app's own
 * strings (`translation.json`), so the English page shows English UI. Your
 * dog is Maui; the dog nearby is Lua, 3 km away on her real card.
 */

const yours = DOGS.maui;
const theirs = DOGS.lua;

const app = { ns: Namespace.Translation } as const;

const Pin = () => (
  <svg viewBox="0 0 24 24" aria-hidden className={styles.pin}>
    <path
      fill="currentColor"
      d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"
    />
  </svg>
);

const Reactions = () => (
  <div className={styles.reactions}>
    <span>😕</span>
    <span className={styles.maybe}>🤔</span>
    <span>😍</span>
  </div>
);

const ProfileScreen = () => {
  const locale = getSafeLocale();
  return (
    <div className={styles.profile}>
      <div className={styles.profilePhoto}>
        <DogPhoto dog={yours} alt="" />
        <span className={styles.dots}>
          <i data-on="" />
          <i />
          <i />
        </span>
        <span className={styles.chevron}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path
              d="m6 9 6 6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      <div className={styles.profileBody}>
        {yours.breed ? (
          <span className={styles.chip}>
            {t(yours.breed, { ns: Namespace.Breed })}
          </span>
        ) : null}
        <p className={styles.name}>
          <b>{yours.name}</b>, {inLocale(yours.age, locale)}
        </p>
        <p className={styles.share}>
          {t("dogProfile.shareProfile", { ...app, name: yours.name })}
        </p>
      </div>
    </div>
  );
};

const SwipeScreen = () => {
  const locale = getSafeLocale();
  return (
    <div className={styles.swipe}>
      <p className={styles.where}>
        <Pin />
        {t("common.nearYou", app)}
      </p>
      <div className={styles.card}>
        <DogPhoto dog={theirs} alt="" />
        <span className={styles.distance}>
          <Pin />
          {theirs.km}km
        </span>
        <div className={styles.scrim}>
          <p className={styles.name}>
            <b>{theirs.name}</b>, {inLocale(theirs.age, locale)}
          </p>
          {theirs.bio ? <p>{inLocale(theirs.bio, locale)}</p> : null}
          <Reactions />
        </div>
      </div>
    </div>
  );
};

const MatchScreen = () => (
  <div className={styles.match}>
    <div className={styles.pair}>
      <span className={styles.back}>
        <DogPhoto dog={yours} alt="" />
      </span>
      <span className={styles.front}>
        <DogPhoto dog={theirs} alt="" />
      </span>
      <span className={styles.heart}>😍</span>
    </div>
    <p className={styles.gotA}>
      {t("newMatch.youGotA", app)}
      <b>{t("landing.walk.match")}</b>
    </p>
    <p className={styles.liked}>
      {t("newMatch.youLikedEachOther", { ...app, name: theirs.name })}
    </p>
    <span className={styles.primary}>{t("newMatch.sendMessage", app)}</span>
    <span className={styles.secondary}>{t("newMatch.keepSwiping", app)}</span>
  </div>
);

const ChatScreen = () => (
  <div className={styles.chat}>
    <p className={styles.chatHead}>
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          d="m15 5-7 7 7 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={styles.avatar}>
        <DogPhoto dog={theirs} alt="" />
      </span>
      <b>{theirs.name}</b>
    </p>
    <div className={styles.thread}>
      <span className={styles.day}>{t("chat.today", app)}</span>
      <p className={styles.sent}>{t("landing.walk.chat.sent")}</p>
      <p className={styles.received}>{t("landing.walk.chat.reply")}</p>
    </div>
    <p className={styles.compose}>{t("send.placeholder", app)}</p>
  </div>
);

export const SCREENS = {
  profile: ProfileScreen,
  swipe: SwipeScreen,
  match: MatchScreen,
  chat: ChatScreen,
};
