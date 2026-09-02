import Link from "next/link";

import { getSafeLocale } from "@/lib/get-safe-locale";
import { toLocalePath } from "@/lib/locales";
import { t } from "@/lib/translate";

/**
 * The only 404 in the app. `[locale]` has no `not-found.tsx` of its own, so
 * every `notFound()` under it lands here: a dead `/dog/[id]` share link, the
 * locale layout rejecting a segment it does not serve, and any unmatched
 * top-level route.
 *
 * Next never hands this file `params`, so the locale comes off the request the
 * same way the root layout and the footer read it, from the header next-intl's
 * middleware sets. On the paths the middleware's matcher skips there is no
 * header and `getSafeLocale` falls back to the default locale.
 */
const NotFoundPage = () => {
  const locale = getSafeLocale();

  return (
    <section className="flex min-h-screen items-center bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-8 lg:px-6 lg:py-16">
        <div className="mx-auto flex max-w-screen-sm flex-col items-center gap-4 text-center">
          <h1 className="text-7xl font-extrabold tracking-tight text-primary lg:text-9xl">
            404
          </h1>
          <p className="text-2xl font-bold tracking-tight text-text md:text-3xl">
            {t("notFound.title")}
          </p>
          <p className="text-lg font-light text-subtitle">
            {t("notFound.description")}
          </p>
          {/*
           * Back to the home of the locale the visitor is already in; a bare
           * "/" would hand a Portuguese reader to the middleware's guess.
           */}
          <Link
            href={toLocalePath(locale, "/")}
            className="mt-2 inline-flex min-h-[44px] items-center rounded-full bg-primary px-8 py-4 font-semibold text-white transition-transform duration-200 ease-in-out hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            {t("notFound.action")}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default NotFoundPage;
