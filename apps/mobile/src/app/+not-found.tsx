import { Redirect } from "expo-router";

/**
 * Expo Router mounts nothing at all when a deep link names a path this app has
 * no route for, not even the root layout, so the native splash never hides
 * and the app sits on the logo forever.
 *
 * That is the normal case for a share link, not an edge case: the dog card
 * lives on the website (`/dog/<id>`), the app has no screen at that path, and
 * the referral is read in the root layout's effect. Without this file, every
 * shared dog link that reaches an installed app both hangs it and loses the
 * attribution it was carrying.
 *
 * Redirecting to the root sends the user through the normal auth gate, which
 * is where a link with no matching screen should land them anyway.
 */
const NotFound = () => <Redirect href="/" />;

export default NotFound;
