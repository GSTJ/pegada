import { DOGS } from "@/components/landing/dogs";
import { PawPrint } from "@/components/landing/paw-print";
import { staggerStyle } from "@/components/landing/stagger";
import { t } from "@/lib/translate";

const STEPS = ["profile", "swipe", "match", "chat"] as const;

/** Placeholder: the four steps on a trail, then who gets to talk. */
export const Walk = () => {
  const { name } = DOGS.nina;

  return (
    <section
      id="walk"
      aria-labelledby="walk-title"
      data-reveal
      className="bg-blush py-section"
    >
      <div className="wrap">
        <h2
          id="walk-title"
          data-role="title"
          className="max-w-[40rem] text-balance text-title"
        >
          {t("landing.walk.title")}
        </h2>
        <ol className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((key, index) => (
            <li
              key={key}
              data-role="card"
              style={staggerStyle(index)}
              className="grid content-start gap-2"
            >
              <PawPrint pressed className="mb-2 w-10 -rotate-90" />
              <h3 className="text-[22px] font-bold leading-tight tracking-[-0.02em]">
                {t(`landing.walk.steps.${key}.title`)}
              </h3>
              <p className="text-ink-muted">
                {t(`landing.walk.steps.${key}.description`)}
              </p>
            </li>
          ))}
        </ol>
        <div
          data-role="action"
          className="mt-14 grid gap-6 border-t-[1.5px] border-ink/15 pt-10 lg:grid-cols-2 lg:items-center lg:gap-[72px]"
        >
          <h3 className="text-balance text-[clamp(1.875rem,1.4vw+1.375rem,2.75rem)] font-extrabold leading-none tracking-[-0.03em]">
            {t("landing.walk.rules.title")}
          </h3>
          <div className="grid gap-[18px]">
            <p className="text-lg text-ink-muted">
              {t("landing.walk.rules.description")}
            </p>
            <ul className="flex flex-wrap gap-2.5 text-[15px] font-bold">
              <li className="rounded-xl bg-paper px-3.5 py-2.5 text-pink-ink shadow-print">
                {t("landing.walk.rules.share", { name })}
              </li>
              <li className="rounded-xl bg-paper px-3.5 py-2.5 shadow-print">
                {t("landing.walk.rules.report", { name })}
              </li>
              <li className="rounded-xl bg-paper px-3.5 py-2.5 shadow-print">
                {t("landing.walk.rules.unmatch")}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
