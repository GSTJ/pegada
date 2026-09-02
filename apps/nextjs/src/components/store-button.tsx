import type { DownloadCtaClick } from "@/services/analytics";

import type { ComponentProps } from "react";

import type { ImageProps } from "next/image";

import Image from "next/image";

import { DownloadCta } from "@/components/download-cta";

export const StoreButton = (props: ComponentProps<"a"> & DownloadCtaClick) => {
  return (
    <DownloadCta
      className="bg-card justify-center hover:bg-blue-700 cursor-pointer p-4 text-center rounded-xl gap-3 flex items-center hover:scale-105 transition-all duration-200 ease-in-out"
      {...props}
    />
  );
};
const StoreButtonText = (props: ComponentProps<"p">) => {
  return <p className="text-black font-semibold pt-1" {...props} />;
};
const StoreIcon = (props: ImageProps) => {
  return <Image {...props} />;
};
StoreButton.Text = StoreButtonText;
StoreButton.Icon = StoreIcon;
