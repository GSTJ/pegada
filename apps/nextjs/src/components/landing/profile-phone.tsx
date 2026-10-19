import type { Dog } from "@/components/landing/dogs";

import { Namespace } from "@pegada/shared/i18n/types/types";

import { DogPhoto } from "@/components/landing/dog-photo";
import { inLocale } from "@/components/landing/dogs";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { t } from "@/lib/translate";

import styles from "./profile-phone.module.css";

/** The app's own icons (`apps/mobile/src/assets/images`). */
const LOCATION_PATH =
  "M4.768.438a4.768 4.768 0 0 1 4.768 4.767c0 1.974-1.505 4.042-4.45 6.252a.53.53 0 0 1-.636 0C1.505 9.247 0 7.18 0 5.205A4.768 4.768 0 0 1 4.768.438Zm0 3.178a1.589 1.589 0 1 0 0 3.179 1.589 1.589 0 0 0 0-3.179Z";
const ARROW_DOWN_PATH =
  "M21.826 1.468a2 2 0 0 0-2.864 0l-5.53 5.672a2 2 0 0 1-2.864 0L5.038 1.468a2 2 0 0 0-2.864 0l-.812.833a2 2 0 0 0 0 2.793l9.206 9.438a2 2 0 0 0 2.864 0l9.206-9.438a2 2 0 0 0 0-2.793l-.812-.833Z";

/**
 * A dog's profile as the app draws it (`apps/mobile/src/views/DogProfile`):
 * photo with the distance pill, the close button, breed tag, name and age,
 * bio, Share and Report, and the three reactions. Built in HTML so the
 * labels come from the app's own strings in the page's language. It is a
 * picture of the screen, so it reads as one image to assistive tech.
 */
export const ProfilePhone = ({ dog }: { dog: Dog }) => {
  const locale = getSafeLocale();
  const breed = dog.breed && t(dog.breed, { ns: Namespace.Breed });
  const age = inLocale(dog.age, locale);
  const bio = dog.bio && inLocale(dog.bio, locale);

  return (
    <div className={styles.phone}>
      <div
        className={styles.screen}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the picture is drawn in HTML so its labels follow the page language; an <img> can't hold it.
        role="img"
        aria-label={t("landing.profile.phone", { name: dog.name })}
      >
        <div className={styles.photo}>
          <DogPhoto dog={dog} alt="" />
          {dog.km === undefined ? null : (
            <span className={styles.distance}>
              <svg viewBox="0 0 10 12" aria-hidden>
                <path d={LOCATION_PATH} />
              </svg>
              {dog.km}km
            </span>
          )}
        </div>
        <span className={styles.close}>
          <svg viewBox="0 0 24 16" aria-hidden>
            <path d={ARROW_DOWN_PATH} />
          </svg>
        </span>
        <div className={styles.content}>
          {breed ? <span className={styles.breed}>{breed}</span> : null}
          <p className={styles.name}>
            <b>{dog.name}</b>, {age}
          </p>
          {bio ? <p className={styles.bio}>{bio}</p> : null}
          <p className={styles.share}>
            {t("dogProfile.shareProfile", {
              ns: Namespace.Translation,
              name: dog.name,
            })}
          </p>
          <p className={styles.report}>
            {t("dogProfile.reportName", {
              ns: Namespace.Translation,
              name: dog.name,
            })}
          </p>
        </div>
        <div className={styles.reactions} aria-hidden>
          <span>😕</span>
          <span className={styles.maybe}>🤔</span>
          <span>😍</span>
        </div>
      </div>
    </div>
  );
};
