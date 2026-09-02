/**
 * The notification tap waiting to be handled, if any.
 *
 * Held in a module-local binding with an accessor rather than exported as a
 * `let`: a re-exported mutable binding is a live view of someone else's
 * variable, which is exactly the shape `import/no-mutable-exports` exists to
 * stop, and callers only ever need "read it" and "clear it".
 *
 * Every tap lands here, because the listener in `_layout.tsx` runs for the
 * whole app lifetime, cold start and warm tap alike. Only one of them still
 * needs handling from here: a warm tap is already handled on the spot by the
 * listener `processLinks` registers. So the store is consume-once, keyed by
 * the notification id, and the pair below is what enforces it.
 */
type StoredNotification = {
  id: string;
  url?: string;
  /**
   * Which scheduled nudge the notification came from, if any. Kept beside the
   * url so the open reported on launch carries the same breakdown the one
   * reported while the app runs does.
   */
  kind?: string;
};

let storedNotification: StoredNotification | undefined;
let lastHandledId: string | undefined;

export const setInitialNotification = (
  notification?: StoredNotification,
): void => {
  storedNotification = notification;
};

/**
 * Takes ownership of a tap. Returns false when this exact tap was already
 * handled, which is what keeps one tap to one `Push Notification Opened`.
 *
 * A single id is enough memory: only one tap is ever stored at a time, so the
 * only replay to defend against is of the tap that was just handled.
 */
export const claimNotification = (id: string): boolean => {
  if (id && id === lastHandledId) return false;

  lastHandledId = id;
  // The tap being handled right now is also sitting in the store, written
  // there by the app-wide listener. Dropping it as it is claimed is what
  // stops the next mount of the Swipe screen replaying it.
  if (storedNotification?.id === id) storedNotification = undefined;

  return true;
};

/**
 * Reads the stored tap and clears it in the same call, so a second read can
 * never see it. Returns nothing when the tap was already handled elsewhere.
 */
export const consumeInitialNotification = ():
  | StoredNotification
  | undefined => {
  const notification = storedNotification;
  storedNotification = undefined;

  if (!notification || !claimNotification(notification.id)) return undefined;

  return notification;
};
