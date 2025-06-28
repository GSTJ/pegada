import type { ImageProps } from "next/image";
import Image from "next/image";

type StoreButtonProps = {
  href?: string;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
};

type StoreButtonTextProps = {
  className?: string;
  children?: React.ReactNode;
};

export const StoreButton = ({
  className = "",
  children,
  ...props
}: StoreButtonProps) => {
  return (
    <a
      className={`bg-card justify-center hover:bg-blue-700 cursor-pointer p-4 text-center rounded-xl gap-3 flex items-center hover:scale-105 transition-all duration-200 ease-in-out ${className}`}
      {...props}
    >
      {children}
    </a>
  );
};

const StoreButtonText = ({
  className = "",
  children
}: StoreButtonTextProps) => {
  return (
    <p className={`text-black font-semibold pt-1 ${className}`}>{children}</p>
  );
};

const StoreIcon = (props: ImageProps) => {
  return <Image {...props} />;
};

StoreButton.Text = StoreButtonText;
StoreButton.Icon = StoreIcon;
