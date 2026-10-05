export type ExitRequestResult = "accepted" | "blocked";

export interface ProfileExitCallbacks {
  nativeRemoval?: () => void;
  postHandoff?: () => void;
}

type ProfileExitPhase =
  | "idle"
  | "returning"
  | "paused"
  | "top-presentation"
  | "exiting"
  | "disposed";

export const getProfileReturnDuration = (offset: number, retry = false): number => {
  "worklet";
  const distance = Math.max(0, offset);
  if (distance <= 0.5) return 0;
  const minimum = retry ? 100 : 80;
  const maximum = retry ? 160 : 220;
  const distanceFactor = retry ? 0.6 : 1.6;
  return Math.min(maximum, Math.max(minimum, minimum + distance * distanceFactor));
};

/**
 * Owns the first exit intent while DogProfile returns to its reversible pose.
 * Generations make UI-thread completions, watchdogs, RAFs and AppState resumes
 * harmless after any newer state-machine step.
 */
export const createProfileExitCoordinator = () => {
  let callbacks: ProfileExitCallbacks | null = null;
  let generation = 0;
  let phase: ProfileExitPhase = "idle";
  let retryUsed = false;

  const advance = (nextPhase: ProfileExitPhase) => {
    phase = nextPhase;
    generation += 1;
    return generation;
  };

  const takeCallbacks = () => {
    const claimed = callbacks;
    callbacks = null;
    advance("exiting");
    return claimed;
  };

  return {
    claim: (nextCallbacks: ProfileExitCallbacks): "first" | "duplicate" => {
      if (phase === "disposed" || callbacks || phase === "exiting") return "duplicate";
      callbacks = nextCallbacks;
      return "first";
    },
    beginReturn: (): number | null => {
      if (!callbacks || phase !== "idle") return null;
      return advance("returning");
    },
    markTopPresentation: (expectedGeneration: number): boolean => {
      if (phase !== "returning" || generation !== expectedGeneration) return false;
      advance("top-presentation");
      return true;
    },
    retry: (expectedGeneration: number): number | null => {
      if (
        (phase !== "returning" && phase !== "top-presentation") ||
        generation !== expectedGeneration ||
        retryUsed ||
        !callbacks
      ) {
        return null;
      }
      retryUsed = true;
      return advance("returning");
    },
    pause: (expectedGeneration: number): boolean => {
      if (
        generation !== expectedGeneration ||
        (phase !== "returning" && phase !== "top-presentation")
      ) {
        return false;
      }
      advance("paused");
      return true;
    },
    resume: (): number | null => {
      if (phase !== "paused" || !callbacks) return null;
      return advance("returning");
    },
    commitReverse: (expectedGeneration: number): ProfileExitCallbacks | null => {
      if (phase !== "top-presentation" || generation !== expectedGeneration) return null;
      return takeCallbacks();
    },
    commitImmediate: (): ProfileExitCallbacks | null => {
      if (phase !== "idle" || !callbacks) return null;
      return takeCallbacks();
    },
    commitFallback: (expectedGeneration?: number): ProfileExitCallbacks | null => {
      if (!callbacks || phase === "disposed" || phase === "exiting") return null;
      if (expectedGeneration !== undefined && generation !== expectedGeneration) return null;
      return takeCallbacks();
    },
    restoreBlocked: (blockedCallbacks: ProfileExitCallbacks): boolean => {
      if (phase !== "exiting" || callbacks) return false;
      callbacks = blockedCallbacks;
      advance("idle");
      return true;
    },
    currentGeneration: () => generation,
    isCurrent: (expectedGeneration: number, expectedPhase?: ProfileExitPhase): boolean =>
      generation === expectedGeneration && (expectedPhase === undefined || phase === expectedPhase),
    phase: (): ProfileExitPhase => phase,
    retryUsed: () => retryUsed,
    dispose: () => {
      callbacks = null;
      advance("disposed");
    },
  };
};

type PendingExitStatus = "idle" | "pending" | "accepted";
type PendingExitIntent = symbol;

/** Owns one post-mutation exit until requestExit can accept it. */
export const createPendingExitCoordinator = () => {
  let status: PendingExitStatus = "idle";
  let postHandoff: (() => void) | null = null;
  const requestExitIntent: PendingExitIntent = Symbol("pending-exit");

  return {
    queue: (action: () => void): boolean => {
      if (status !== "idle") return false;
      status = "pending";
      postHandoff = action;
      return true;
    },
    attempt: (
      requestExit: (postHandoff: () => void, intent: PendingExitIntent) => ExitRequestResult,
    ): ExitRequestResult | "idle" => {
      if (status !== "pending" || !postHandoff) return "idle";
      const result = requestExit(postHandoff, requestExitIntent);
      if (result === "accepted") {
        status = "accepted";
        postHandoff = null;
      }
      return result;
    },
    isRequestIntent: (intent: unknown): boolean => intent === requestExitIntent,
    status: (): PendingExitStatus => status,
  };
};
