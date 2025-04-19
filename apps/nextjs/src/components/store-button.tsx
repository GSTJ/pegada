import { HTMLProps } from "react";
import Image, { ImageProps } from "next/image";

export const StoreButton = (props: HTMLProps<HTMLAnchorElement>) => {
  return (
    <a
      className="bg-card justify-center hover:bg-blue-700 cursor-pointer p-4 text-center rounded-xl gap-3 flex items-center hover:scale-105 transition-all duration-200 ease-in-out"
      {...props}
    />
  );
};
const StoreButtonText = (props: HTMLProps<HTMLParagraphElement>) => {
  return <p className="text-black font-semibold pt-1" {...props} />;
};
const StoreIcon = (props: ImageProps) => {
  return <Image {...props} />;
};
StoreButton.Text = StoreButtonText;
StoreButton.Icon = StoreIcon;
