"use client";

import type { ChangeEvent, ReactNode } from "react";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import styles from "./breeds.module.css";

type BreedsFinderProps = {
  label: string;
  placeholder: string;
  /** `{{n}}` is the number of breeds found. */
  foundOne: string;
  foundMany: string;
  /** `{{query}}` is what the visitor typed. */
  none: string;
  /** The server-rendered wall: one `li[data-slug]` per breed. */
  children: ReactNode;
};

/** Same rule as the search in the app's breed picker: a lowercase substring. */
const matches = (name: string, query: string) =>
  name.toLowerCase().includes(query.toLowerCase());

const breedsIn = (wall: HTMLElement | null) => [
  ...(wall?.querySelectorAll<HTMLElement>("li[data-slug]") ?? []),
];

/**
 * A search over the breed wall. Typing marks the breeds the app's picker would
 * find; a name the list doesn't have marks Mixed Breed, which is where a mutt
 * goes in the app. Also hides the separator that ends each line of the wall.
 */
export const BreedsFinder = ({
  label,
  placeholder,
  foundOne,
  foundMany,
  none,
  children,
}: BreedsFinderProps) => {
  const id = useId();
  const wall = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const list = wall.current?.querySelector("ul");
    if (!list) return;
    // It only turns invisible, keeping its width, so hiding a separator can
    // never pull the next name up and rewrap the line.
    const markLineEnds = () => {
      const all = breedsIn(wall.current);
      for (const [index, item] of all.entries()) {
        const next = all[index + 1];
        item.toggleAttribute(
          "data-eol",
          next !== undefined && next.offsetTop > item.offsetTop,
        );
      }
    };
    markLineEnds();
    const observer = new ResizeObserver(markLineEnds);
    observer.observe(list);
    setReady(true);
    return () => observer.disconnect();
  }, []);

  const search = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const query = event.target.value.trim();
      const all = breedsIn(wall.current);
      const found = all.filter((item) =>
        matches(item.textContent ?? "", query),
      );
      const marked = (item: HTMLElement) =>
        query === ""
          ? item.dataset.slug === "mixed-breed"
          : found.includes(item) ||
            (found.length === 0 && item.dataset.slug === "mixed-breed");

      // From the first keystroke on, the marker answers at typing speed.
      const list = wall.current?.querySelector("ul");
      if (list) list.dataset.live = "";
      for (const item of all) {
        item.toggleAttribute("data-mark", marked(item));
        item.toggleAttribute("data-dim", query !== "" && !marked(item));
      }

      if (query === "") setStatus("");
      else if (found.length === 0) setStatus(none.replace("{{query}}", query));
      else {
        setStatus(
          (found.length === 1 ? foundOne : foundMany).replace(
            "{{n}}",
            String(found.length),
          ),
        );
      }
    },
    [foundOne, foundMany, none],
  );

  return (
    <>
      {/* Without JS the field could do nothing: it holds its space unseen. */}
      <search className={styles.finder} data-ready={ready || undefined}>
        <label htmlFor={`${id}-query`} className={styles.finderLabel}>
          {label}
        </label>
        <input
          id={`${id}-query`}
          type="search"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={placeholder}
          onChange={search}
          aria-describedby={`${id}-status`}
          className={styles.finderInput}
        />
        <p
          id={`${id}-status`}
          aria-live="polite"
          className={styles.finderStatus}
        >
          {status}
        </p>
      </search>
      <div ref={wall}>{children}</div>
    </>
  );
};
