/**
 * The 500 screen. Lifted out of `app/error.tsx` so Next's route-level error
 * boundary and the top-level `ObservabilityBoundary` in `app/providers.tsx`
 * render the same thing — a user who hits one has no way of knowing which
 * boundary caught it, and two near-identical copies of this markup would drift.
 *
 * `reset` is optional because the observability boundary's reset clears its own
 * state rather than re-running a route render; with no handler the button is
 * simply not offered.
 */
export const SomethingWentWrong = ({ reset }: { reset?: () => void }) => {
  return (
    <section className="flex min-h-screen items-center bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-8 lg:px-6 lg:py-16">
        <div className="mx-auto flex max-w-screen-sm flex-col items-center gap-4 text-center">
          <h1 className="text-7xl font-extrabold tracking-tight text-primary lg:text-9xl">
            500
          </h1>
          <p className="text-2xl font-bold tracking-tight text-text md:text-3xl">
            Something went wrong
          </p>
          <p className="text-lg font-light text-subtitle">
            We encountered an error. Please try again later.
          </p>
          {reset ? (
            <button
              type="button"
              onClick={reset}
              className="mt-2 inline-flex min-h-[44px] items-center rounded-full bg-primary px-8 py-4 font-semibold text-white transition-transform duration-200 ease-in-out hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              Try again
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
};
