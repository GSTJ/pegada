import Link from "next/link";

import { Restricter } from "@/components/restricter";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { toLocalePath } from "@/lib/locales";
import { t } from "@/lib/translate";

/**
 * One line at the foot of the homepage.
 *
 * It exists to give the AI story page a way in from the site's own traffic,
 * which is the only free source of visitors the experiment has. Nothing else
 * belongs here yet: a link farm at the bottom of a one-page site is furniture,
 * and this is the one destination worth pointing at.
 *
 * `toLocalePath` rather than a bare `/story`, so a Portuguese reader stays in
 * Portuguese instead of being handed to the middleware's guess.
 */
export const Footer = () => (
  <footer className="border-t border-border px-6 py-10 sm:px-12">
    <Restricter>
      <div className="flex w-full flex-1">
        <Link
          href={toLocalePath(getSafeLocale(), "/story")}
          className="font-semibold text-text underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
        >
          {t("home.footer.aiStory")}
        </Link>
      </div>
    </Restricter>
  </footer>
);
