import { DOGS } from "@/components/landing/dogs";
import { IdCard } from "@/components/landing/id-card";
import { t } from "@/lib/translate";

const LEGEND = ["photos", "fields", "actions"] as const;

/** Placeholder: the ID card and its legend. */
export const Profile = () => (
  <section
    id="profile"
    aria-labelledby="profile-title"
    data-reveal
    className="py-section"
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
        <p data-role="lede" className="text-lg text-ink-muted">
          {t("landing.profile.description")}
        </p>
      </div>
      <div className="mt-14 grid items-center gap-12 lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)] lg:gap-[72px]">
        <div data-role="card">
          <IdCard dog={DOGS.lua} />
        </div>
        <ul
          data-role="body"
          className="grid max-w-[36em] gap-2.5 text-ink-muted"
        >
          {LEGEND.map((key) => (
            <li key={key}>
              <b className="font-bold text-ink">
                {t(`landing.profile.legend.${key}.title`)}
              </b>{" "}
              {t(`landing.profile.legend.${key}.body`)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);
