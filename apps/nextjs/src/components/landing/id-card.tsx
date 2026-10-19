import type { Dog } from "@/components/landing/dogs";

import { Namespace } from "@pegada/shared/i18n/types/types";

import { DogPhoto } from "@/components/landing/dog-photo";
import { inLocale } from "@/components/landing/dogs";
import { PawPrint } from "@/components/landing/paw-print";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { t } from "@/lib/translate";
import { cn } from "@/lib/utils";

import styles from "./id-card.module.css";

/** TD2 passports run two lines of 36. */
const MRZ_LENGTH = 36;

const toMrz = (text: string) =>
  text
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]+/g, "<")
    .replaceAll(/^<|<$/g, "");

const mrzLine = (...parts: string[]) =>
  parts.map(toMrz).join("<").slice(0, MRZ_LENGTH).padEnd(MRZ_LENGTH, "<");

type Field = { key: string; label: string; value: string; mono?: boolean };

type IdCardProps = {
  /** Without a dog the card is blank, waiting for yours, stamp already on it. */
  dog?: Dog;
  /** `landscape` is the CR80 card; `portrait` is the back of a deck card. */
  orientation?: "landscape" | "portrait";
  className?: string;
};

/**
 * The dog's ID: photo, the fields from its Pegada profile, and the paw print
 * where a person's ID has a fingerprint. Size it by width; the height follows
 * the card's ratio.
 *
 * The stamp has `data-role="stamp"`, so inside a `data-reveal` block it lands
 * once when the block scrolls in (`globals.css`). Anywhere else it is static.
 */
export const IdCard = ({
  dog,
  orientation = "landscape",
  className,
}: IdCardProps) => {
  const locale = getSafeLocale();
  const breed = dog?.breed && t(dog.breed, { ns: Namespace.Breed });
  const bio = dog?.bio && inLocale(dog.bio, locale);

  const fields: Field[] = dog
    ? [
        { key: "name", label: t("landing.idCard.name"), value: dog.name },
        {
          key: "age",
          label: t("landing.idCard.age"),
          value: inLocale(dog.age, locale),
        },
        ...(breed
          ? [{ key: "breed", label: t("landing.idCard.breed"), value: breed }]
          : []),
        ...(dog.km === undefined
          ? []
          : [
              {
                key: "distance",
                label: t("landing.idCard.distance"),
                value: `${dog.km} km`,
                mono: true,
              },
            ]),
      ]
    : [
        { key: "name", label: t("landing.idCard.name"), value: "" },
        { key: "age", label: t("landing.idCard.age"), value: "" },
        { key: "breed", label: t("landing.idCard.breed"), value: "" },
      ];

  return (
    <div
      className={cn(
        styles.card,
        styles[orientation],
        !dog && styles.blank,
        className,
      )}
      {...(dog
        ? {
            role: "group",
            "aria-label": t("landing.idCard.of", { name: dog.name }),
          }
        : { role: "img", "aria-label": t("landing.idCard.blank") })}
    >
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.brand}>
            <PawPrint className={styles.mark} />
            Pegada
          </span>
          <span className={styles.kind}>{t("landing.idCard.kind")}</span>
        </div>

        <div className={cn(styles.photo, !dog && styles.placeholder)}>
          {dog ? <DogPhoto dog={dog} alt="" /> : t("landing.idCard.photo")}
        </div>

        <dl className={styles.fields}>
          {fields.map(({ key, label, value, mono }) => (
            <div key={key} className={styles.field}>
              <dt className={styles.label}>{label}</dt>
              <dd className={cn(mono && styles.mono)}>{value}</dd>
            </div>
          ))}
        </dl>

        {bio || !dog ? (
          <dl className={cn(styles.bio, styles.field)}>
            <dt className={styles.label}>{t("landing.idCard.bio")}</dt>
            <dd>{bio}</dd>
          </dl>
        ) : null}

        <div className={styles.signature}>
          <span className={styles.line}>
            <span data-role="stamp" className={styles.stamp}>
              <PawPrint />
            </span>
          </span>
          <span className={styles.label}>{t("landing.idCard.signature")}</span>
        </div>

        <p className={cn(styles.mrz, styles.mono)} aria-hidden>
          {mrzLine("IDPGD", dog?.name ?? "", "", breed ?? "")}
          <br />
          {mrzLine(bio ?? "")}
        </p>
      </div>
    </div>
  );
};
