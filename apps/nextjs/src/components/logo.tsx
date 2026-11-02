import { cn } from "@/lib/utils";

export const Logo = ({ wordmark = false }: { wordmark?: boolean }) => (
  <span className="inline-flex items-center gap-2">
    {/* oxlint-disable-next-line nextjs/no-img-element -- A static SVG needs no next/image pipeline. */}
    <img
      src="/logo.svg"
      draggable="false"
      alt=""
      className={cn("select-none", wordmark ? "h-8 w-8" : "h-12 w-12")}
    />
    {wordmark ? (
      <span className="text-2xl font-extrabold tracking-[-0.02em] text-primary">
        Pegada
      </span>
    ) : null}
  </span>
);
