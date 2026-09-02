/**
 * The names on the sign-up form, written once so the markup, the hidden
 * fields and the server action cannot drift apart.
 *
 * Client-safe on purpose: the form is a client component, and anything it
 * imports ends up in the browser bundle, so nothing here may reach for the
 * database or the API package.
 */

export const EMAIL_FIELD = "email";

export const LOCALE_FIELD = "locale";

/**
 * The decoy. Labelled and shaped like a real input in the markup so a
 * form-filling bot has every reason to complete it, and moved off screen with
 * CSS so nobody else ever sees it. Named after something a bot expects to find
 * on a form rather than anything that hints at what it is for.
 */
export const HONEYPOT_FIELD = "website";
