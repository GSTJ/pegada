import semver from "semver";

import { config } from "../shared/config";
import { UserService } from "./UserService";

export class EchoService {
  /**
   * Returns whether the user is authenticated and whether or not
   * they need to update their app version.
   */
  static async get(currentAppVersion: string, userId?: string) {
    const minAppVersion = config.MIN_APP_VERSION;
    const forceUpdate = semver.gt(minAppVersion, currentAppVersion);

    let authenticated = false;
    if (userId) {
      const user = await UserService.getUserById(userId);
      authenticated = !!user;
    }

    return { authenticated, forceUpdate };
  }
}
