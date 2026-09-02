"use client";

import type { DownloadCtaClick } from "@/services/analytics";

import type { ComponentProps } from "react";

import { useCallback } from "react";

import { trackDownloadCtaClicked } from "@/services/analytics";

/**
 * Every "get the app" link on the site, so all of them report the same event
 * with the same properties.
 *
 * It is a client component only because an `onClick` cannot cross the server
 * boundary. The describing props are flat scalars rather than one object, so
 * the pages using it stay server components and pass nothing that has to be
 * serialised structurally.
 *
 * The capture is fire-and-forget and the anchor keeps its normal navigation:
 * it goes out over `sendBeacon`, which survives the unload that follows.
 *
 * `rel` is defaulted rather than left to the call sites. Every link here
 * points at a store, so every one of them is a candidate for `target="_blank"`
 * and would otherwise hand the opened tab a `window.opener` back into the
 * site. A caller that needs different values can still pass its own.
 */
export const DownloadCta = ({
  href,
  target,
  rel,
  page,
  placement,
  store,
  dogId,
  onClick,
  ...props
}: ComponentProps<"a"> & DownloadCtaClick) => {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      trackDownloadCtaClicked({ page, placement, store, dogId });
      onClick?.(event);
    },
    [page, placement, store, dogId, onClick],
  );

  return (
    // oxlint-disable-next-line jsx-a11y/anchor-has-content -- content provided by caller via props spread
    <a
      href={href}
      target={target}
      rel={rel ?? (target === "_blank" ? "noopener noreferrer" : undefined)}
      onClick={handleClick}
      {...props}
    />
  );
};
