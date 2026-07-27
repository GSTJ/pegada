import "./globals.css";
import type { Metadata } from "next";

import { Epilogue } from "next/font/google";

import { Analytics } from "@vercel/analytics/react";

import { getSafeLocale } from "@/lib/get-safe-locale";
import { t } from "@/lib/translate";
import { cn } from "@/lib/utils";

// oxlint-disable-next-line new-cap -- next/font loaders are capitalised functions, not constructors
const epilogue = Epilogue({
  variable: "--font-epilogue",
  subsets: ["latin"],
});

export const generateMetadata = () => {
  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
    other: { "apple-itunes-app": "app-id=6450865592" },
  } satisfies Metadata;
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  const locale = getSafeLocale();

  return (
    <html lang={locale}>
      <Analytics />
      <body className={cn(epilogue.variable, "font-epilogue")}>{children}</body>
    </html>
  );
};

export default RootLayout;
