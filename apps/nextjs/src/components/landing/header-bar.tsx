"use client";

import type { DownloadCtaPage } from "@/services/analytics";

import type { ReactNode } from "react";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { clsx } from "clsx";

import { storeTargetForUserAgent } from "@/app/store/store-urls";
import { DownloadCta } from "@/components/download-cta";

import s from "./header.module.css";
import b from "./landing.module.css";

/** On past 24px, off again under 4px, so it never flickers in between. */
let scrolled = false;
const subscribeScroll = (onChange: () => void) => {
  const sync = () => {
    const next = scrolled ? scrollY >= 4 : scrollY > 24;
    if (next === scrolled) return;
    scrolled = next;
    onChange();
  };
  sync();
  addEventListener("scroll", sync, { passive: true });
  return () => removeEventListener("scroll", sync);
};
const getScrolled = () => scrolled;
const getServerFalse = () => false;

const subscribeNothing = () => () => {};
const getPhoneStore = () => {
  const target = storeTargetForUserAgent(navigator.userAgent);
  return target === "web" ? undefined : target;
};
const getServerNothing = () => undefined;

/** A class from this file's CSS module, for the DOM APIs that need a string. */
const c = (name: string) => s[name] ?? name;

type HeaderBarProps = {
  brandHref: string;
  brandLabel: string;
  skipLabel: string;
  navLabel: string;
  howHref: string;
  howLabel: string;
  faqHref: string;
  faqLabel: string;
  /**
   * The button scrolls to the closing CTA on a computer. On a phone it goes
   * straight to that phone's store, which is only known in the browser.
   */
  ctaHref: string;
  ctaLabel: string;
  iosHref: string;
  androidHref: string;
  page: DownloadCtaPage;
  referral?: string;
  /** The language switch. */
  children: ReactNode;
};

export const HeaderBar = ({
  brandHref,
  brandLabel,
  skipLabel,
  navLabel,
  howHref,
  howLabel,
  faqHref,
  faqLabel,
  ctaHref,
  ctaLabel,
  iosHref,
  androidHref,
  page,
  referral,
  children,
}: HeaderBarProps) => {
  const isScrolled = useSyncExternalStore(
    subscribeScroll,
    getScrolled,
    getServerFalse,
  );
  const store = useSyncExternalStore(
    subscribeNothing,
    getPhoneStore,
    getServerNothing,
  );
  const [current, setCurrent] = useState<string | undefined>();
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  // The section crossing the band 35-40% down the viewport owns the pill.
  useEffect(() => {
    const inBand = new Set<HTMLElement>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const section = entry.target as HTMLElement;
          if (entry.isIntersecting) inBand.add(section);
          else inBand.delete(section);
        }
        setCurrent([...inBand].pop()?.dataset.nav);
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    for (const section of document.querySelectorAll("[data-nav]")) {
      observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);

  const placePill = useCallback((instant: boolean) => {
    const nav = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;
    const link = nav.querySelector<HTMLElement>("a[aria-current]");
    nav.classList.toggle(c("has-active"), Boolean(link));
    if (!link) return;
    nav.classList.toggle(
      c("no-anim"),
      instant || !pill.style.getPropertyValue("--w"),
    );
    pill.style.setProperty("--x", `${link.offsetLeft}px`);
    pill.style.setProperty("--w", `${link.offsetWidth}px`);
    requestAnimationFrame(() => nav.classList.remove(c("no-anim")));
  }, []);

  useLayoutEffect(() => placePill(false), [current, placePill]);

  useEffect(() => {
    const instant = () => placePill(true);
    addEventListener("resize", instant);
    void document.fonts?.ready.then(instant);
    return () => removeEventListener("resize", instant);
  }, [placePill]);

  const ctaClass = clsx(b.btn, s["btn-sm"]);

  return (
    <header className={clsx(b.landing, s.bar, isScrolled && s["is-scrolled"])}>
      <a className={b.skip} href="#main">
        {skipLabel}
      </a>
      <div className={clsx(b.wrap, s["bar-row"])}>
        <div className={s["bar-start"]}>
          <a className={b.brand} href={brandHref} aria-label={brandLabel}>
            {/* oxlint-disable-next-line nextjs/no-img-element -- a 6KB SVG mark; next/image adds a client component for nothing here. */}
            <img src="/logo.svg" alt="" width={26} height={27} />
            <span>Pegada</span>
          </a>
          <nav ref={navRef} className={s.nav} aria-label={navLabel}>
            <span ref={pillRef} className={s["nav-pill"]} aria-hidden="true" />
            <a
              href={howHref}
              aria-current={current === "como-funciona" ? "true" : undefined}
            >
              {howLabel}
            </a>
            <a
              href={faqHref}
              aria-current={current === "perguntas" ? "true" : undefined}
            >
              {faqLabel}
            </a>
          </nav>
        </div>
        <div className={s["bar-end"]}>
          {children}
          {store ? (
            <DownloadCta
              className={ctaClass}
              href={store === "ios" ? iosHref : androidHref}
              target="_blank"
              page={page}
              placement="header"
              store={store === "ios" ? "app_store" : "play_store"}
              referral={referral}
            >
              {ctaLabel}
            </DownloadCta>
          ) : (
            <a className={ctaClass} href={ctaHref}>
              {ctaLabel}
            </a>
          )}
        </div>
      </div>
    </header>
  );
};
