import * as React from "react";

export const Restricter = (props: React.PropsWithChildren) => {
  return (
    <div className="flex justify-center">
      <div className="max-w-7xl flex-1 flex">{props.children}</div>
    </div>
  );
};
