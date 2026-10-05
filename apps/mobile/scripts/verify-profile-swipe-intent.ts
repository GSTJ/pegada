import assert from "node:assert/strict";

import {
  cancelProfileSwipeIntent,
  consumeProfileSwipeIntent,
  getProfileSwipeIntentSnapshot,
  queueProfileSwipeIntent,
  resetProfileSwipeIntentForVerification,
} from "@/store/profileSwipeIntent";
import { Swipe } from "@/store/swipeTypes";
import {
  endSwipeActionFlight,
  getIsSwipeActionInFlight,
  isSwipeActionFlightOwner,
  resetSwipeActionFlightForVerification,
} from "@/store/swipeActionFlight";

const reset = () => {
  resetProfileSwipeIntentForVerification();
  resetSwipeActionFlightForVerification();
};

reset();
const first = queueProfileSwipeIntent({ dogId: "dog-a", sessionId: 7, swipeType: Swipe.Like });
assert.ok(first);
assert.equal(getProfileSwipeIntentSnapshot(), first);
assert.equal(isSwipeActionFlightOwner(first.token), true);

assert.equal(
  queueProfileSwipeIntent({ dogId: "dog-a", sessionId: 7, swipeType: Swipe.Like }),
  first,
  "an exact duplicate must reuse the first owned intent",
);
assert.equal(
  queueProfileSwipeIntent({ dogId: "dog-a", sessionId: 7, swipeType: Swipe.Dislike }),
  null,
  "a later reaction cannot replace the first choice",
);
assert.equal(
  consumeProfileSwipeIntent({ dogId: "wrong-dog", sessionId: 7, token: first.token }),
  null,
);
assert.equal(getProfileSwipeIntentSnapshot(), first);

const consumed = consumeProfileSwipeIntent({
  dogId: first.dogId,
  sessionId: first.sessionId,
  token: first.token,
});
assert.equal(consumed, first);
assert.equal(getProfileSwipeIntentSnapshot(), null);
assert.equal(
  isSwipeActionFlightOwner(first.token),
  true,
  "the card animation keeps the transferred action token after consuming the intent",
);
assert.equal(endSwipeActionFlight(first.token), true);

const second = queueProfileSwipeIntent({
  dogId: "dog-b",
  sessionId: 8,
  swipeType: Swipe.Maybe,
});
assert.ok(second);
assert.equal(cancelProfileSwipeIntent("stale-token"), false);
assert.equal(getProfileSwipeIntentSnapshot(), second);
assert.equal(cancelProfileSwipeIntent(second.token), true);
assert.equal(getProfileSwipeIntentSnapshot(), null);
assert.equal(getIsSwipeActionInFlight(), false);

reset();
process.stdout.write("Profile swipe intent verification passed\n");
