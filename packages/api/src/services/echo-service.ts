import semver from "semver";
import { z } from "zod";

import { config } from "../shared/config";
import { UserService } from "./user-service";

/**
 * The two platforms that have a store to send someone to, and so the only two
 * that can carry a floor of their own. Anything else falls back to the shared
 * floor.
 */
export const appPlatformSchema = z.enum(["android", "ios"]);

export type AppPlatform = z.infer<typeof appPlatformSchema>;

export class EchoService {
  /**
   * The floor this caller has to clear.
   *
   * The platform override wins when it is set, so a release that is live on
   * one store and still in review on the other can be enforced on the store
   * that shipped without locking out the platform that has nothing to install.
   * A caller that does not say which platform it is on falls back to the
   * shared floor, which is also what every client built before the platform
   * header existed does.
   */
  static minimumVersionFor(platform?: AppPlatform) {
    const perPlatform: Record<AppPlatform, string | undefined> = {
      android: config.MIN_APP_VERSION_ANDROID,
      ios: config.MIN_APP_VERSION_IOS,
    };

    return (platform && perPlatform[platform]) ?? config.MIN_APP_VERSION;
  }

  /**
   * Returns whether the user is authenticated and whether or not
   * they need to update their app version.
   */
  static async get({
    currentAppVersion,
    platform,
    userId,
  }: {
    currentAppVersion?: string;
    platform?: AppPlatform;
    userId?: string;
  }) {
    const minimumSupportedVersion = EchoService.minimumVersionFor(platform);

    // A version we cannot read is never a version we lock out. This is the
    // only query standing between a launch and the app, so an unfamiliar or
    // missing header has to mean "let them in" rather than "show the wall":
    // the wall has no way out except the store.
    const forceUpdate = currentAppVersion
      ? semver.gt(minimumSupportedVersion, currentAppVersion)
      : false;

    let authenticated = false;
    if (userId) {
      const user = await UserService.getUserById(userId);
      authenticated = Boolean(user);
    }

    return { authenticated, forceUpdate, minimumSupportedVersion };
  }
}
