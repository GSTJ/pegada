import type { CSSProperties } from "react";

import breedNames from "@pegada/shared/i18n/locales/en/breed.json";
import { Namespace } from "@pegada/shared/i18n/types/types";

import { PreferencesDistance } from "@/components/landing/preferences-distance";
import { staggerStyle } from "@/components/landing/stagger";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { t } from "@/lib/translate";
import { cn } from "@/lib/utils";

import styles from "./preferences.module.css";

/** The app's own strings for its preference screen. */
const app = (key: string, options: Record<string, unknown> = {}) =>
  // oxlint-disable-next-line typescript/no-explicit-any -- keys are the mobile app's, checked against translation.json by hand.
  t(key as any, { ns: Namespace.Translation, ...options } as any) as string;

/** The pickers' options, in the app's order (`apps/mobile/src/services/consts.tsx`). */
const SIZES = ["extraSmall", "small", "medium", "large", "giant"];
const COLORS = ["black", "white", "brown", "tricolor", "albino", "golden"];
const BREED_COUNT = Object.keys(breedNames).length;

/**
 * Enamel tag shapes in a 160x200 box, hung from the ring at (80, 14). Drawn
 * as plain primitives so the rim can be one stroke around their union.
 * `hole` is where the wire meets the tag; `middle` is the y the engraving
 * centers on.
 */
const SHAPES = {
  heart: {
    hole: 64,
    middle: 108,
    body: (
      <path d="M80 186C70 179 12 142 12 92c0-27 19-46 43-46 11 0 20 5 25 13 5-8 14-13 25-13 24 0 43 19 43 46 0 50-58 87-68 94Z" />
    ),
  },
  bone: {
    hole: 86,
    middle: 112,
    body: (
      <>
        <rect x="26" y="78" width="108" height="64" rx="10" />
        <circle cx="28" cy="80" r="22" />
        <circle cx="28" cy="140" r="22" />
        <circle cx="132" cy="80" r="22" />
        <circle cx="132" cy="140" r="22" />
      </>
    ),
  },
  circle: {
    hole: 42,
    middle: 114,
    body: <circle cx="80" cy="112" r="78" />,
  },
  tag: {
    hole: 48,
    middle: 116,
    body: <rect x="18" y="38" width="124" height="150" rx="26" />,
  },
} as const;

type Shape = keyof typeof SHAPES;

const EnamelTag = ({
  id,
  shape,
  enamel,
}: {
  id: string;
  shape: Shape;
  enamel: string;
}) => {
  const { hole, body } = SHAPES[shape];
  return (
    <svg viewBox="0 0 160 200" aria-hidden className="block h-auto w-full">
      <defs>
        <clipPath id={`${id}-clip`}>{body}</clipPath>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle
        cx="80"
        cy="14"
        r="9"
        fill="none"
        stroke="#9AA3B8"
        strokeWidth="4"
      />
      <line
        x1="80"
        y1="23"
        x2="80"
        y2={hole}
        stroke="#9AA3B8"
        strokeWidth="4"
      />
      <g fill="#C9CED9" stroke="#C9CED9" strokeWidth="6">
        {body}
      </g>
      <g fill={enamel}>{body}</g>
      <rect
        width="160"
        height="200"
        fill={`url(#${id}-sheen)`}
        clipPath={`url(#${id}-clip)`}
      />
      <circle cx="80" cy={hole} r="4.5" fill="#C9CED9" />
    </svg>
  );
};

type Tag = {
  key: string;
  shape: Shape;
  enamel: string;
  ink: string;
  tilt: string;
  label: string;
  value: string;
  note?: string;
};

const tagStyle = (tag: Tag) =>
  ({ "--tilt": tag.tilt, color: tag.ink }) as CSSProperties;

/**
 * Centers the engraving on the shape's middle. The viewBox is 160 wide and
 * padding percentages read the width, so viewBox units map straight across.
 */
const engravingStyle = (shape: Shape) => ({
  paddingTop: `${((2 * SHAPES[shape].middle - 190) / 160) * 100}%`,
});

const distanceCopy = () => ({
  label: app("preferences.maxDistance"),
  // The app's own subtitle, built the same way in its code.
  range: "1-300+ km",
  noLimit: t("landing.preferences.distance.noLimit"),
  deck: t("landing.preferences.distance.deck"),
  onDeck: t("landing.preferences.distance.onDeck"),
  outside: t("landing.preferences.distance.outside"),
  left: t("landing.preferences.distance.left"),
  back: t("landing.preferences.distance.back"),
});

const PreferenceTags = () => {
  const tags: Tag[] = [
    {
      key: "breed",
      shape: "heart",
      enamel: "#172448",
      ink: "#fff",
      tilt: "-6deg",
      label: app("breedPicker.breed"),
      value: app("breedPicker.anyBreed"),
      note: t("landing.preferences.anyBreedNote", { count: BREED_COUNT }),
    },
    {
      key: "age",
      shape: "bone",
      enamel: "#F6D34D",
      ink: "#172448",
      tilt: "-2deg",
      label: app("preferences.ageRange"),
      value: app("preferences.years", { maxYears: 10 }),
    },
    {
      key: "size",
      shape: "circle",
      enamel: "#EE6AA7",
      ink: "#172448",
      tilt: "3deg",
      label: app("preferences.size"),
      value: app("preferences.anySize"),
      note: SIZES.map((size) => app(`sizes.${size}`)).join(", "),
    },
    {
      key: "color",
      shape: "tag",
      enamel: "#FFFFFF",
      ink: "#172448",
      tilt: "7deg",
      label: app("preferences.color"),
      value: app("preferences.anyColor"),
      note: COLORS.map((color) => app(`colors.${color}`)).join(", "),
    },
  ];

  return (
    <ul className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-2 sm:gap-x-6">
      {tags.map((tag, index) => (
        <li
          key={tag.key}
          data-role="card"
          style={staggerStyle(index)}
          className="w-full max-w-[176px]"
        >
          <div className={cn(styles.tag, "relative")} style={tagStyle(tag)}>
            <EnamelTag
              id={`preferences-${tag.key}`}
              shape={tag.shape}
              enamel={tag.enamel}
            />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-[11%] pb-[6.25%] text-center"
              style={engravingStyle(tag.shape)}
            >
              <span className="text-label uppercase">{tag.label}</span>
              <strong className="text-[17px] font-extrabold sm:text-[19px] leading-[1.1] tracking-[-0.02em]">
                {tag.value}
              </strong>
              {tag.note ? (
                <span className="text-xs font-semibold leading-[1.3]">
                  {tag.note}
                </span>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export const Preferences = () => (
  <section
    id="preferences"
    aria-labelledby="preferences-title"
    data-reveal
    className="py-section"
  >
    <div className="wrap">
      <div className="grid max-w-[40rem] gap-[18px]">
        <h2
          id="preferences-title"
          data-role="title"
          className="text-balance text-title"
        >
          {t("landing.preferences.title")}
        </h2>
        <p data-role="lede" className="text-lede text-ink-muted">
          {t("landing.preferences.description")}
        </p>
      </div>
      <div className="mt-12 grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <PreferenceTags />
        <div data-role="body">
          <PreferencesDistance locale={getSafeLocale()} copy={distanceCopy()} />
          <p className="mt-4 max-w-[34em] text-ink-muted">
            {t("landing.preferences.distance.note")}
          </p>
        </div>
      </div>
    </div>
  </section>
);
