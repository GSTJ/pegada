import { t } from "@/lib/translate";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  className: "size-8",
} as const;

/** Two dogs, one heart where they overlap. */
const MatchIcon = () => (
  <svg {...iconProps}>
    <circle cx="8.4" cy="12" r="5.4" />
    <circle cx="15.6" cy="12" r="5.4" />
    <path
      d="M12 14.1c-1.05-.75-2-1.5-2-2.45 0-.62.5-1.1 1.1-1.1.37 0 .7.17.9.45.2-.28.53-.45.9-.45.6 0 1.1.48 1.1 1.1 0 .95-.95 1.7-2 2.45Z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

/** A collar with a name tag, and the tag carries a paw. */
const ProfileIcon = () => (
  <svg {...iconProps}>
    <path d="M4 6c2.4 2.1 5 3.2 8 3.2S17.6 8.1 20 6" />
    <path d="M12 9.2v1.3" />
    <rect x="7.9" y="10.5" width="8.2" height="8.2" rx="2.6" />
    <circle cx="10.2" cy="13.9" r="0.75" fill="currentColor" stroke="none" />
    <circle cx="12" cy="13.4" r="0.75" fill="currentColor" stroke="none" />
    <circle cx="13.8" cy="13.9" r="0.75" fill="currentColor" stroke="none" />
    <ellipse
      cx="12"
      cy="16.4"
      rx="1.7"
      ry="1.3"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

/** One paw, four toes, every one a different size. */
const InclusiveIcon = () => (
  <svg {...iconProps}>
    <ellipse
      cx="5.2"
      cy="10.4"
      rx="1.9"
      ry="2.3"
      transform="rotate(-20 5.2 10.4)"
    />
    <ellipse cx="9.6" cy="6.6" rx="1.5" ry="2" transform="rotate(-8 9.6 6.6)" />
    <ellipse
      cx="14.4"
      cy="6.9"
      rx="2.2"
      ry="2.7"
      transform="rotate(8 14.4 6.9)"
    />
    <ellipse
      cx="18.9"
      cy="11"
      rx="1.3"
      ry="1.7"
      transform="rotate(22 18.9 11)"
    />
    <path d="M12 20.6c-2.6 0-4.7-1.5-4.7-3.5 0-2 2.1-4 4.7-4s4.7 2 4.7 4c0 2-2.1 3.5-4.7 3.5Z" />
  </svg>
);

/** A message bubble holding a shield. */
const MessagingIcon = () => (
  <svg {...iconProps}>
    <path d="M19.4 13.4a2.6 2.6 0 0 1-2.6 2.6h-5.1L7.4 19.2v-3.2h-.2a2.6 2.6 0 0 1-2.6-2.6V7.4a2.6 2.6 0 0 1 2.6-2.6h9.6a2.6 2.6 0 0 1 2.6 2.6Z" />
    <path d="M12 7.6 14.7 8.7v2.1c0 1.6-1.6 2.5-2.7 2.9-1.1-.4-2.7-1.3-2.7-2.9V8.7Z" />
  </svg>
);

export const Features = () => {
  const features = [
    { key: "match", Icon: MatchIcon },
    { key: "profile", Icon: ProfileIcon },
    { key: "inclusive", Icon: InclusiveIcon },
    { key: "messaging", Icon: MessagingIcon },
  ] as const;

  return (
    <section className="px-6 py-20 sm:px-12 sm:py-28">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:gap-14">
        <h2 className="mx-auto max-w-2xl text-center text-4xl font-extrabold text-text sm:text-5xl lg:mx-0 lg:text-left">
          {t("home.features.title")}
        </h2>
        <ul className="grid gap-5 sm:grid-cols-2">
          {features.map(({ key, Icon }) => (
            <li
              key={key}
              className="flex flex-col gap-5 rounded-3xl bg-card p-8 sm:p-10"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
                <Icon />
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-bold text-text">
                  {t(`home.features.${key}.title`)}
                </h3>
                <p className="text-lg font-light text-subtitle">
                  {t(`home.features.${key}.description`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
