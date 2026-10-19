import { staggerStyle } from "@/components/landing/stagger";
import { t } from "@/lib/translate";

const TAGS = ["maxDistance", "ageRange", "size", "color"] as const;

/** Placeholder: the app's four preference fields with their real ranges. */
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
        <p data-role="lede" className="text-lg text-ink-muted">
          {t("landing.preferences.description")}
        </p>
      </div>
      <dl className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {TAGS.map((key, index) => (
          <div
            key={key}
            data-role="card"
            style={staggerStyle(index)}
            className="grid gap-1 rounded-card bg-blush p-5"
          >
            <dt className="text-label uppercase text-ink-muted">
              {t(`landing.preferences.tags.${key}.label`)}
            </dt>
            <dd className="text-[19px] font-extrabold leading-tight tracking-[-0.02em]">
              {t(`landing.preferences.tags.${key}.value`)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  </section>
);
