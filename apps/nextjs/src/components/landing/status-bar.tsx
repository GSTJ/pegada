import { clsx } from "clsx";

import b from "./landing.module.css";

/** The phone's status bar, drawn once for every screen on the page. */
export const StatusBar = ({ className }: { className?: string }) => (
  <div className={clsx(b.sb, className)} aria-hidden="true" data-sb="">
    <span>9:41</span>
    <i className={b["sb-island"]} />
    <span className={b["sb-i"]}>
      <svg width="15" height="11" viewBox="0 0 15 11">
        <path
          fill="currentColor"
          d="M7.5 2.2c2 0 3.9.8 5.3 2.1l1.1-1.1A9 9 0 0 0 7.5.6 9 9 0 0 0 1.1 3.2l1.1 1.1A7.5 7.5 0 0 1 7.5 2.2Zm0 3.1c1.2 0 2.3.4 3.1 1.2l1.1-1.1a6 6 0 0 0-8.4 0l1.1 1.1c.8-.8 1.9-1.2 3.1-1.2Zm0 3.1c-.5 0-1 .2-1.3.5l1.3 1.4 1.3-1.4c-.3-.3-.8-.5-1.3-.5Z"
        />
      </svg>
      <svg width="24" height="11" viewBox="0 0 24 11">
        <rect
          x=".5"
          y=".5"
          width="20.5"
          height="10"
          rx="3.2"
          fill="none"
          stroke="currentColor"
          opacity=".45"
        />
        <rect x="2" y="2" width="17.5" height="7" rx="2" fill="currentColor" />
        <path
          d="M22.2 3.8v3.4c.7-.3 1.2-1 1.2-1.7s-.5-1.4-1.2-1.7Z"
          fill="currentColor"
          opacity=".45"
        />
      </svg>
    </span>
  </div>
);
