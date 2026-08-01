import { t } from "@/lib/translate";
import { cn } from "@/lib/utils";

/**
 * The brand mark reduced to a single print: four toes and a heart for the heel
 * pad. "Pegada" is Portuguese for pawprint, so the steps are literally a walk.
 */
const PawStamp = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
    className={cn("size-7", className)}
  >
    <ellipse
      cx="4.9"
      cy="9.1"
      rx="1.9"
      ry="2.4"
      transform="rotate(-24 4.9 9.1)"
    />
    <ellipse
      cx="9.4"
      cy="5.7"
      rx="1.9"
      ry="2.5"
      transform="rotate(-9 9.4 5.7)"
    />
    <ellipse
      cx="14.6"
      cy="5.7"
      rx="1.9"
      ry="2.5"
      transform="rotate(9 14.6 5.7)"
    />
    <ellipse
      cx="19.1"
      cy="9.1"
      rx="1.9"
      ry="2.4"
      transform="rotate(24 19.1 9.1)"
    />
    <path d="M12 20.8c-.8-.5-5.6-3.4-5.6-6.7 0-1.8 1.4-3.1 3.1-3.1 1 0 2 .5 2.5 1.3.5-.8 1.5-1.3 2.5-1.3 1.7 0 3.1 1.3 3.1 3.1 0 3.3-4.8 6.2-5.6 6.7Z" />
  </svg>
);

/** The pads between two prints. They grow, so the walk has a direction. */
const Trail = () => (
  <>
    <span
      aria-hidden
      className="absolute -bottom-10 left-7 top-[3.75rem] flex -translate-x-1/2 flex-col items-center justify-center gap-2 lg:hidden"
    >
      <span className="size-1 rounded-full bg-primary" />
      <span className="size-1.5 rounded-full bg-primary" />
      <span className="size-2 rounded-full bg-primary" />
    </span>
    <span
      aria-hidden
      className="absolute left-16 top-7 hidden -translate-y-1/2 items-center justify-center gap-2.5 lg:-right-8 lg:flex"
    >
      <span className="size-1 rounded-full bg-primary" />
      <span className="size-1 rounded-full bg-primary" />
      <span className="size-1.5 rounded-full bg-primary" />
      <span className="size-1.5 rounded-full bg-primary" />
      <span className="size-2 rounded-full bg-primary" />
    </span>
  </>
);

export const HowItWorks = () => {
  const steps = [
    { key: "profile", tilt: "-rotate-[9deg]" },
    { key: "swipe", tilt: "rotate-[7deg]" },
    { key: "match", tilt: "-rotate-[4deg]" },
    { key: "chat", tilt: "rotate-[11deg]" },
  ] as const;

  return (
    <section className="bg-secondary px-6 py-20 sm:px-12 sm:py-28">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 lg:gap-16">
        <h2 className="mx-auto max-w-2xl text-center text-4xl font-extrabold text-text sm:text-5xl lg:mx-0 lg:text-left">
          {t("home.howItWorks.title")}
        </h2>
        <ol className="grid gap-10 lg:grid-cols-4 lg:gap-8">
          {steps.map(({ key, tilt }, index) => (
            <li key={key} className="relative flex gap-5 lg:flex-col lg:gap-6">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white">
                <PawStamp className={cn("text-primary", tilt)} />
              </span>
              {index < steps.length - 1 && <Trail />}
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-bold text-text">
                  {t(`home.howItWorks.${key}.title`)}
                </h3>
                <p className="text-lg font-light text-subtitle">
                  {t(`home.howItWorks.${key}.description`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};
