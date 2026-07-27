/**
 * The notification URL the app was cold-launched from, if any.
 *
 * Held in a module-local binding with an accessor rather than exported as a
 * `let`: a re-exported mutable binding is a live view of someone else's
 * variable, which is exactly the shape `import/no-mutable-exports` exists to
 * stop, and callers only ever need "read it" and "clear it".
 */
let initialNotificationUrl: string | undefined;

export const getInitialNotification = () => initialNotificationUrl;

export const setInitialNotification = (url?: string) => {
  initialNotificationUrl = url;
};
