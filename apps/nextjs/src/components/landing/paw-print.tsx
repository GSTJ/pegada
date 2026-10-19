import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * The Pegada mark (`public/logo.svg`) as one path: the heart-shaped pad and
 * the three round toes under it. "Pegada" is Portuguese for paw print, so the
 * logo is the print, never a generic paw icon.
 */
const PAW_PATH =
  "M298.4 72.3C298.6 115 272.6 144 257.2 160.3C241.9 176.7 200.8 224.1 171.6 224.1C142.4 224.1 99.2 179.2 83 160.3C66.8 141.5 43.4 115 43.6 72.3C43.7 32.6 75.7 .3 114.8 .3C125.7 .3 136.4 2.8 146.2 7.7C155.9 12.5 165 19.5 171.6 28.2C178.2 19.5 186.1 12.5 195.8 7.7C205.6 2.8 216.3 .3 227.2 .3C266.3 .3 298.3 32.6 298.4 72.3ZM232.8 249.2a44 44.4 0 1 0 88 0a44 44.4 0 1 0-88 0ZM20.7 248.9a44 44.4 0 1 0 88 0a44 44.4 0 1 0-88 0ZM124.1 308.1a47.5 48.8 0 1 0 95 0a47.5 48.8 0 1 0-95 0Z";

const LIP = { fill: "rgb(var(--print-lip))" };
const WALL = { fill: "rgb(var(--print-wall))" };
const FLOOR = { fill: "rgb(var(--print-floor))" };

type PawPrintProps = {
  /**
   * Pressed into the ground instead of inked: the lit lip under the bottom
   * edge, the wall in shadow, and the floor sunk inside it. Colors come from
   * `--print-lip`, `--print-wall` and `--print-floor` (RGB channels, set in
   * `globals.css` per scheme), so a section can retint them.
   */
  pressed?: boolean;
  className?: string;
};

/**
 * Decorative by default. Inked, it fills with `currentColor`, so `text-pink`
 * stamps it pink.
 */
export const PawPrint = ({ pressed, className }: PawPrintProps) => {
  // `url(#…)` cannot take the punctuation React puts in its ids.
  const id = `paw${useId().replaceAll(/[^\w-]/g, "")}`;

  if (!pressed) {
    return (
      <svg
        viewBox="0 0 341 357"
        fill="currentColor"
        aria-hidden
        focusable="false"
        className={cn("block", className)}
      >
        <path d={PAW_PATH} />
      </svg>
    );
  }

  return (
    <svg
      viewBox="-12 -12 365 392"
      aria-hidden
      focusable="false"
      className={cn("block", className)}
    >
      <defs>
        <path id={id} d={PAW_PATH} />
        <clipPath id={`${id}-clip`}>
          <use href={`#${id}`} />
        </clipPath>
      </defs>
      <use href={`#${id}`} transform="translate(0 12)" style={LIP} />
      <g clipPath={`url(#${id}-clip)`}>
        <use href={`#${id}`} style={WALL} />
        <use href={`#${id}`} transform="translate(6 24)" style={FLOOR} />
      </g>
    </svg>
  );
};
