"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

import { clsx } from "clsx";

import { LOCALE_CHOICE_PARAM } from "@/lib/locale-cookie";
import { DEFAULT_LOCALE_SEGMENT } from "@/lib/locales";

import s from "./language-switch.module.css";

/** Each language is named in itself, so these are not translated. */
const LANGUAGES = [
  { segment: "pt-br", lang: "pt-BR", short: "PT", name: "Português" },
  { segment: "en-us", lang: "en", short: "EN", name: "English" },
] as const;

/**
 * Real navigation: `/en-us/...` stores English and redirects to the
 * unprefixed URL, `/pt-br/...?lang` stores Portuguese and drops the marker
 * (see `lib/locale-cookie.ts`). The knob moves on click while the next page
 * loads.
 */
const hrefFor = (segment: string, route: string) => {
  const path = route === "/" ? `/${segment}` : `/${segment}${route}`;
  return segment === DEFAULT_LOCALE_SEGMENT
    ? path
    : `${path}?${LOCALE_CHOICE_PARAM}`;
};

type LanguageSwitchProps = {
  route: string;
  current: string;
  label: string;
  large?: boolean;
  className?: string;
};

export const LanguageSwitch = ({
  route,
  current,
  label,
  large = false,
  className,
}: LanguageSwitchProps) => {
  const groupRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(current);
  const [placed, setPlaced] = useState(false);
  const choose = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) =>
      setActive(event.currentTarget.dataset.segment ?? current),
    [current],
  );

  useLayoutEffect(() => {
    const group = groupRef.current;
    const knob = knobRef.current;
    if (!group || !knob) return;
    const place = () => {
      const on = group.querySelector<HTMLElement>("a[aria-current]");
      if (!on) return;
      knob.style.setProperty("--x", `${on.offsetLeft - 3}px`);
      knob.style.setProperty("--w", `${on.offsetWidth}px`);
    };
    place();
    // The first placement lands before the knob shows, so it never slides in.
    void knob.offsetWidth;
    setPlaced(true);
    addEventListener("resize", place);
    void document.fonts?.ready.then(place);
    return () => removeEventListener("resize", place);
  }, [active]);

  return (
    <div
      ref={groupRef}
      className={clsx(
        s.lang,
        large && s["lang-lg"],
        placed && s["is-placed"],
        className,
      )}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- two links, not form controls, so no fieldset; the group is what names them.
      role="group"
      aria-label={label}
    >
      <span ref={knobRef} className={s["lang-knob"]} aria-hidden="true" />
      {LANGUAGES.map(({ segment, lang, short, name }) => (
        <a
          key={segment}
          href={hrefFor(segment, route)}
          hrefLang={lang}
          lang={lang}
          aria-label={large ? undefined : `${short}, ${name}`}
          aria-current={segment === active ? "true" : undefined}
          data-segment={segment}
          onClick={choose}
        >
          {large ? name : short}
        </a>
      ))}
    </div>
  );
};
