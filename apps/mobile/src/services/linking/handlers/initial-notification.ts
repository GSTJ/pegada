/**
 * The notification URL the app was cold-launched from, if any.
 *
 * Held in a module-local binding with an accessor rather than exported as a
 * `let`: a re-exported mutable binding is a live view of someone else's
 * variable, which is exactly the shape `import/no-mutable-exports` exists to
 * stop, and callers only ever need "read it" and "clear it".
 */
let initialNotificationUrl: string | undefined;
let initialNotificationKind: string | undefined;

export const getInitialNotification = () => initialNotificationUrl;

/**
 * Which scheduled nudge the cold-start notification came from, if any. Kept
 * beside the url so the open reported on launch carries the same breakdown the
 * one reported while the app runs does.
 */
export const getInitialNotificationKind = () => initialNotificationKind;

export const setInitialNotification = (url?: string, kind?: string) => {
  initialNotificationUrl = url;
  initialNotificationKind = kind;
};
