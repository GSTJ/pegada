export const createPendingQuickActionCoordinator = <T>() => {
  let capturedInitialAction = false;
  let pendingAction: T | undefined;

  return {
    captureInitial: (action?: T | null) => {
      if (capturedInitialAction) return;

      capturedInitialAction = true;
      pendingAction = action ?? undefined;
    },
    clear: () => {
      pendingAction = undefined;
    },
    queue: (action?: T | null) => {
      pendingAction = action ?? undefined;
    },
    consume: (handler: (action: T) => void) => {
      const action = pendingAction;
      pendingAction = undefined;

      if (action !== undefined) handler(action);
    },
  };
};

export const createLatestValueCommitter = <T>(
  commit: (value: T) => Promise<void>,
  reportError: (error: unknown) => void,
) => {
  let appliedRevision = 0;
  let desiredRevision = 0;
  let desiredValue: T | undefined;
  let running = false;

  const drain = async () => {
    if (running) return;

    running = true;

    try {
      while (appliedRevision !== desiredRevision) {
        const revision = desiredRevision;
        const value = desiredValue as T;

        try {
          // Native writes must stay serialized so an older clear cannot land
          // after a newer localized menu.
          // eslint-disable-next-line no-await-in-loop
          await commit(value);
        } catch (error) {
          reportError(error);
        }

        appliedRevision = revision;
      }
    } finally {
      running = false;

      // A request can land after the loop's last comparison but before this
      // cleanup runs. Start another drain so that newer state still wins.
      if (appliedRevision !== desiredRevision) void drain();
    }
  };

  return (value: T) => {
    desiredValue = value;
    desiredRevision += 1;
    void drain();
  };
};
