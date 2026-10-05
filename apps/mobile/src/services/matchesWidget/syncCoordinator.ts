export type WidgetSyncLease = {
  generation: number;
  isLatest: () => boolean;
};

export type WidgetSyncCoordinator = {
  beginSignedInSession: () => void;
  beginSignedOutSession: () => void;
  enqueueSignedIn: (work: (lease: WidgetSyncLease) => Promise<void>) => Promise<void>;
  enqueueSignedOut: (work: (lease: WidgetSyncLease) => Promise<void>) => Promise<void>;
};

const isProtectedLeaseCurrent = () => true;

/**
 * Serializes widget file and snapshot work. Signed-in generations coalesce to
 * the newest request, while signed-out cleanup is a non-cancellable privacy
 * boundary that always runs before any later account can publish.
 */
export const createWidgetSyncCoordinator = (): WidgetSyncCoordinator => {
  let latestGeneration = 0;
  let latestSignedInGeneration = 0;
  let tail = Promise.resolve();
  let acceptsSignedInWork = true;

  const enqueueSerialized = (
    lease: WidgetSyncLease,
    shouldRun: () => boolean,
    work: (lease: WidgetSyncLease) => Promise<void>,
  ) => {
    const result = tail
      .catch(() => undefined)
      .then(() => {
        if (!shouldRun()) return undefined;
        return work(lease);
      });

    // A failed request must reject for its caller, but it cannot poison the
    // serialization queue for the next sync.
    tail = result.catch(() => undefined);
    return result;
  };

  return {
    beginSignedInSession() {
      if (acceptsSignedInWork) return;

      acceptsSignedInWork = true;
      // Reopening alone cannot cancel signed-out cleanup. If the new session
      // is offline, the previous account must still disappear. The first
      // signed-in snapshot with real match data owns the next generation.
    },
    beginSignedOutSession() {
      if (!acceptsSignedInWork) return;

      // Close the barrier and invalidate active work synchronously. Disk and
      // snapshot cleanup can be queued after the auth token is removed.
      acceptsSignedInWork = false;
      latestSignedInGeneration = ++latestGeneration;
    },
    enqueueSignedIn(work) {
      // A query callback can resolve after the authenticated tree unmounts.
      // Once logout starts, those callbacks stay dropped until a newly
      // mounted authenticated session explicitly reopens the coordinator.
      if (!acceptsSignedInWork) return Promise.resolve();

      const generation = ++latestGeneration;
      latestSignedInGeneration = generation;
      const isLatest = () => generation === latestSignedInGeneration;
      return enqueueSerialized({ generation, isLatest }, isLatest, work);
    },
    enqueueSignedOut(work) {
      // Idempotent when logout already closed the barrier before its first
      // asynchronous auth operation.
      if (acceptsSignedInWork) {
        acceptsSignedInWork = false;
        latestSignedInGeneration = ++latestGeneration;
      }

      const generation = ++latestGeneration;
      // This lease deliberately stays valid when a later account enqueues
      // signed-in work. Queue order makes the signed-out clear/snapshot the
      // privacy handoff between accounts.
      return enqueueSerialized(
        { generation, isLatest: isProtectedLeaseCurrent },
        isProtectedLeaseCurrent,
        work,
      );
    },
  };
};

// Preserve the generation and queue across Fast Refresh. Otherwise work from
// the previous module instance could outlive a freshly reset generation.
const coordinatorGlobal = globalThis as typeof globalThis & {
  pegadaWidgetSyncCoordinator?: WidgetSyncCoordinator;
};

const existingCoordinator = coordinatorGlobal.pegadaWidgetSyncCoordinator;
export const widgetSyncCoordinator =
  existingCoordinator &&
  typeof existingCoordinator.enqueueSignedIn === "function" &&
  typeof existingCoordinator.beginSignedOutSession === "function"
    ? existingCoordinator
    : createWidgetSyncCoordinator();

coordinatorGlobal.pegadaWidgetSyncCoordinator = widgetSyncCoordinator;
