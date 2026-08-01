import { notFound } from "next/navigation";

import { isLocaleSegment } from "@/lib/locales";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * The middleware matcher skips anything containing a dot and anything under
 * `api`/`store`, so `/robots.txt`, `/site.map`, `/apidocs` and friends land
 * here with that string sitting in `[locale]` — and used to render the
 * homepage under a 200, an unbounded supply of duplicate content. Anything
 * that isn't a locale we actually serve is a 404.
 */
const LocaleLayout = async ({ children, params }: LocaleLayoutProps) => {
  const { locale } = await params;

  if (!isLocaleSegment(locale)) notFound();

  return children;
};

export default LocaleLayout;
