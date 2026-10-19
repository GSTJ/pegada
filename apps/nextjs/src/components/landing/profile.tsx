import type { CSSProperties } from "react";

import { DOGS } from "@/components/landing/dogs";
import { IdCard } from "@/components/landing/id-card";
import { ProfilePhone } from "@/components/landing/profile-phone";
import { staggerStyle } from "@/components/landing/stagger";
import { t } from "@/lib/translate";
import { cn } from "@/lib/utils";

import styles from "./profile.module.css";

/** Lua is the one seed dog with a breed, an age, a distance and a bio. */
const DOG = DOGS.lua;

/**
 * Where each note points on the landscape ID card, in % of the card, and
 * which side of the card its label sits on. `level` stacks the labels so a
 * leader never crosses another note's text.
 */
const NOTES = [
  { key: "photo", x: 26, y: 17, side: "top", level: 3 },
  { key: "name", x: 38, y: 14.5, side: "top", level: 2 },
  { key: "breed", x: 52, y: 28, side: "top", level: 1 },
  { key: "bio", x: 50, y: 82, side: "bottom", level: 1 },
  { key: "signature", x: 27, y: 76.5, side: "bottom", level: 2 },
] as const;

const noteStyle = ({ x, y, level }: (typeof NOTES)[number], index: number) =>
  ({
    "--x": `${x}%`,
    "--y": `${y}%`,
    "--level": level,
    "--n": index,
  }) as CSSProperties;

export const Profile = () => (
  <section
    id="profile"
    aria-labelledby="profile-title"
    data-reveal
    className={cn("bg-blush py-section", styles.section)}
  >
    <div className="wrap">
      <div className="grid max-w-[40rem] gap-[18px]">
        <h2
          id="profile-title"
          data-role="title"
          className="text-balance text-title"
        >
          {t("landing.profile.title")}
        </h2>
        <p data-role="lede" className="text-lede text-ink-muted">
          {t("landing.profile.description")}
        </p>
      </div>

      <div className={styles.pair}>
        <figure
          data-role="card"
          style={staggerStyle(0)}
          className={styles.phone}
        >
          <ProfilePhone dog={DOG} />
          <figcaption className={styles.caption}>
            {t("landing.profile.inApp", { name: DOG.name })}
          </figcaption>
        </figure>

        <figure
          data-role="card"
          style={staggerStyle(1)}
          className={styles.specimen}
        >
          <div className={styles.stage}>
            <IdCard dog={DOG} />
            <ul className={styles.notes}>
              {NOTES.map((note, index) => (
                <li
                  key={note.key}
                  data-side={note.side}
                  style={noteStyle(note, index)}
                  className={styles.note}
                >
                  <span className={styles.noteText}>
                    <b>{t(`landing.profile.notes.${note.key}.title`)}</b>{" "}
                    {t(`landing.profile.notes.${note.key}.body`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <figcaption className={styles.caption}>
            {t("landing.profile.asId", { name: DOG.name })}
          </figcaption>
        </figure>
      </div>
    </div>
  </section>
);
