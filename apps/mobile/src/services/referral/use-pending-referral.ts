import type { Referral } from "./parse-referral-from-url";

import { useEffect, useState } from "react";

import { sendError } from "@/services/error-tracking";

import { getPendingReferral } from "./pending-referral";

/**
 * The stored referral, read once when the screen mounts.
 *
 * Both halves of the login need it, because both can be the call that creates
 * the account row: asking for a code upserts the User, and the verified login
 * upserts it again. Reading on mount rather than at submit time keeps a disk
 * read off the path between the user's tap and the request.
 *
 * `undefined` while it loads and when there is nothing stored, which the login
 * input treats the same way: send no attribution.
 */
export const usePendingReferral = (): Referral | undefined => {
  const [referral, setReferral] = useState<Referral | undefined>(undefined);

  useEffect(() => {
    let active = true;

    getPendingReferral()
      .then((pending) => {
        if (active) setReferral(pending);
        return undefined;
      })
      .catch(sendError);

    return () => {
      active = false;
    };
  }, []);

  return referral;
};
