import * as React from "react";

/**
 * `min-w-0` on the inner box because it is a flex item, and a flex item's
 * automatic minimum size is its content, not zero. Without it a child that is
 * wider than the screen (a horizontally scrolling strip, a long unbreakable
 * string) widens this box past the viewport and takes the whole document with
 * it, which reads as a page that scrolls sideways on a phone. Nothing that
 * already fits is affected.
 */
export const Restricter = (props: React.PropsWithChildren) => {
  return (
    <div className="flex justify-center">
      <div className="flex min-w-0 max-w-7xl flex-1">{props.children}</div>
    </div>
  );
};
