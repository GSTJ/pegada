import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import swipeReducer, {
  Actions as SwipeActions,
  initialState as swipeInitialState,
  type SwipeDog,
} from "@/store/reducers/dogs/swipe";
import dogsReducer, { Actions as DogActions } from "@/store/reducers/dogs";
import { NO_HERO_SHADOW, SWIPE_CARD_HERO_SHADOW } from "@/components/MainCard/heroShadow";
import {
  acknowledgeHeroTargetFrame,
  acknowledgeHeroSourceFrame,
  abandonHero,
  advanceHeroPhotoRenderState,
  areHeroSharedElementsReady,
  beginHeroPhotoSession,
  cancelNonCurrentSwipeHeroOwner,
  cancelHeroSourceOpening,
  clearHeroForNativeFallback,
  completeForwardTargetRecovery,
  completeReverseHandoffRecovery,
  completeReverseSceneFallback,
  confirmHeroOverlayCleared,
  createHeroForwardFlight,
  createHeroNavigationWatchdog,
  createHeroPhotoSourceInstanceToken,
  dispatchHeroForwardNavigation,
  endHero,
  endHeroPhotoSession,
  getHeroOwnedForwardRunId,
  getHeroSharedContentFingerprint,
  getHeroPhotoEntrySnapshot,
  getForwardGoBackOcclusionFrame,
  getForwardPhotoExposureFrames,
  getHeroPhotoSelectionSnapshot,
  getHeroPhotoRenderKey,
  getHeroStateSnapshot,
  invalidateHeroForContentChange,
  invalidateHeroGeometryForScroll,
  invalidateHeroPhotoSession,
  isHeroForwardMotionReady,
  isHeroPhotoMutationAllowed,
  isHeroSourceSurfaceHeld,
  isHeroSourceOpening,
  isHeroShadowTransitionActive,
  isSwipeDeckMutationHeroLocked,
  isSwipeSurfaceHeroLocked,
  markHeroMotionStarted,
  markHeroDestinationPresented,
  markHeroOverlayReady,
  markHeroSourceFocused,
  markHeroSourcePhotoPainted,
  markHeroTargetPhotoPainted,
  refreshSettledHeroActionFrame,
  registerHeroActionFrame,
  registerHeroTargetFrame,
  reconcileHeroPhotoRenderState,
  releaseHeroPhotoSourceInstance,
  releaseHeroRouteOwnership,
  releaseHeroSourceOwnership,
  resetHeroTransitionForVerification,
  setHeroSourceOpening,
  setHeroForwardTimerSchedulerForVerification,
  shouldHideHeroEndpointPhoto,
  startHero,
  startReverseHero,
  updateHeroPhotoSelection,
  waitForSwipeDeckMutationHeroIdle,
  type HeroFrame,
  type HeroForwardTimerScheduler,
} from "@/components/HeroTransition/store";
import {
  createProfileExitCoordinator,
  createPendingExitCoordinator,
  getProfileReturnDuration,
  type ExitRequestResult,
} from "@/views/DogProfile/exitCoordinator";
import {
  beginSwipeActionFlight,
  beginSwipeRestoreFlight,
  claimSwipeRestoreFlight,
  commitSwipeRestoreFlight,
  endSwipeActionFlight,
  expirePendingSwipeRestoreForVerification,
  getIsSwipeActionInFlight,
  isSwipeActionFlightOwner,
  resetSwipeActionFlightForVerification,
  waitForSwipeActionFlightIdle,
} from "@/store/swipeActionFlight";
import { getActiveCards, getLastCardId, getRenderableCards } from "@/store/selectors";

const dog = {
  id: "dog-1",
  name: "Pingo",
  images: [
    { id: "image-1", url: "https://example.com/pingo-1.jpg", blurhash: null },
    { id: "image-2", url: "https://example.com/pingo-2.jpg", blurhash: null },
    { id: "image-3", url: "https://example.com/pingo-3.jpg", blurhash: null },
  ],
} as unknown as SwipeDog;

const firstExitCallback = () => {};
const secondExitCallback = () => {};
const thirdExitCallback = () => {};

const testHeroSharedContentFingerprint = () => {
  const sharedDog = {
    ...dog,
    bio: "Carries a tennis ball everywhere.",
    birthDate: new Date("2022-04-03T12:00:00.000Z"),
    breed: { id: "breed-1", slug: "golden-retriever" },
    distance: 4.2,
    images: dog.images.map((image, position) => ({
      id: image.id,
      url: image.url,
      blurhash: image.blurhash,
      position,
    })),
  } as SwipeDog;
  const sharedStrings = {
    locale: "en-US",
    formattedAge: "2 years",
    formattedDistance: "4.2km",
  };
  const baseline = getHeroSharedContentFingerprint(sharedDog, sharedStrings);
  const clone = {
    ...sharedDog,
    birthDate: new Date(sharedDog.birthDate!),
    breed: { ...sharedDog.breed! },
    images: sharedDog.images.map((image) => ({
      id: image.id,
      url: image.url,
      blurhash: image.blurhash,
      position: image.position,
    })),
  };
  assert.equal(
    getHeroSharedContentFingerprint(clone, sharedStrings),
    baseline,
    "equivalent query clones share one stable fingerprint",
  );
  assert.equal(
    getHeroSharedContentFingerprint({ ...clone, color: "a non-shared refresh" }, sharedStrings),
    baseline,
    "non-shared query data does not invalidate reversible pixels",
  );

  const assertSharedChange = (
    nextDog: SwipeDog,
    label: string,
    nextSharedStrings = sharedStrings,
  ) => {
    assert.notEqual(
      getHeroSharedContentFingerprint(nextDog, nextSharedStrings),
      baseline,
      `${label} invalidates the shared-content fingerprint`,
    );
  };
  assertSharedChange({ ...clone, id: "dog-2" }, "id");
  assertSharedChange({ ...clone, name: "Pingo Junior" }, "name");
  assertSharedChange({ ...clone, birthDate: new Date("2022-04-04T12:00:00.000Z") }, "birth date");
  assertSharedChange({ ...clone, bio: "A new biography." }, "bio");
  assertSharedChange({ ...clone, distance: 9.7 }, "distance");
  assertSharedChange(
    { ...clone, breed: { ...clone.breed!, slug: "labrador-retriever" } },
    "breed slug",
  );
  assertSharedChange(
    {
      ...clone,
      images: clone.images.map((image, index) =>
        index === 0 ? { ...image, id: "replacement-image-id" } : image,
      ),
    },
    "image id",
  );
  assertSharedChange(
    {
      ...clone,
      images: clone.images.map((image, index) =>
        index === 0 ? { ...image, url: "https://example.com/replaced.jpg" } : image,
      ),
    },
    "image URL",
  );
  assertSharedChange(
    {
      ...clone,
      images: clone.images.map((image, index) =>
        index === 0 ? { ...image, blurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj" } : image,
      ),
    },
    "image blurhash",
  );
  assertSharedChange(
    { ...clone, images: [clone.images[1]!, clone.images[0]!, ...clone.images.slice(2)] },
    "image order",
  );
  assertSharedChange(clone, "locale", { ...sharedStrings, locale: "pt-BR" });
  assertSharedChange(clone, "formatted age", {
    ...sharedStrings,
    formattedAge: "2 anos",
  });
  assertSharedChange(clone, "formatted distance", {
    ...sharedStrings,
    formattedDistance: "2.6 miles",
  });
};

const photoFrom: HeroFrame = { x: 12, y: 84, width: 366, height: 520, borderRadius: 18 };
const photoTo: HeroFrame = { x: 0, y: 0, width: 390, height: 610, borderRadius: 0 };
const chromeFrom: HeroFrame = { x: 12, y: 108, width: 366, height: 496 };
const chromeTo: HeroFrame = { x: 0, y: 59, width: 390, height: 551 };
const actionFrom: HeroFrame = { x: 0, y: 718, width: 390, height: 76 };
const actionTo: HeroFrame = { x: 0, y: 706, width: 390, height: 76 };
const titleFrom: HeroFrame = { x: 36, y: 516, width: 318, height: 30 };
const titleTo: HeroFrame = { x: 16, y: 642, width: 358, height: 32 };
const goBackTo: HeroFrame = { x: 312, y: 579, width: 62, height: 62 };
const bottomSurfaceLocations: [number, number, number, number] = [0, 0.64, 0.82, 1];

const registerSwipeTargetTuple = (
  runId: number,
  frames: Partial<{
    photo: HeroFrame;
    chrome: HeroFrame;
    action: HeroFrame;
    title: HeroFrame;
    goBack: HeroFrame;
  }> = {},
) => {
  registerHeroTargetFrame({
    id: dog.id,
    runId,
    role: "photo",
    frame: frames.photo ?? photoTo,
  });
  registerHeroTargetFrame({
    id: dog.id,
    runId,
    role: "chrome",
    frame: frames.chrome ?? chromeTo,
  });
  registerHeroTargetFrame({
    id: dog.id,
    runId,
    role: "action",
    frame: frames.action ?? actionTo,
  });
  registerHeroTargetFrame({
    id: dog.id,
    runId,
    role: "title",
    frame: frames.title ?? titleTo,
  });
  registerHeroTargetFrame({
    id: dog.id,
    runId,
    role: "goBack",
    frame: frames.goBack ?? goBackTo,
  });
};

const registerPhotoBackTargetTuple = (
  runId: number,
  options: { chrome?: HeroFrame | null; id?: string; photo?: HeroFrame; goBack?: HeroFrame } = {},
) => {
  const id = options.id ?? dog.id;
  registerHeroTargetFrame({
    id,
    runId,
    role: "photo",
    frame: options.photo ?? photoTo,
  });
  registerHeroTargetFrame({
    id,
    runId,
    role: "goBack",
    frame: options.goBack ?? goBackTo,
  });
  if (options.chrome !== null) {
    registerHeroTargetFrame({
      id,
      runId,
      role: "chrome",
      frame: options.chrome ?? chromeTo,
    });
  }
};

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const createForwardFakeClock = () => {
  let now = 0;
  let nextTimerId = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const scheduler: HeroForwardTimerScheduler = {
    clear: (timer) => timers.delete(timer as unknown as number),
    set: (callback, delayMs) => {
      const timerId = ++nextTimerId;
      timers.set(timerId, { at: now + delayMs, callback });
      return timerId as unknown as ReturnType<typeof setTimeout>;
    },
  };

  return {
    scheduler,
    pending: () => timers.size,
    advance: (milliseconds: number) => {
      const deadline = now + milliseconds;
      for (;;) {
        const next = [...timers.entries()]
          .filter(([, timer]) => timer.at <= deadline)
          .sort(([firstId, first], [secondId, second]) =>
            first.at === second.at ? firstId - secondId : first.at - second.at,
          )[0];
        if (!next) break;
        const [timerId, timer] = next;
        timers.delete(timerId);
        now = timer.at;
        timer.callback();
      }
      now = deadline;
    },
  };
};

const withForwardFakeClock = (test: (clock: ReturnType<typeof createForwardFakeClock>) => void) => {
  resetHeroTransitionForVerification();
  const clock = createForwardFakeClock();
  setHeroForwardTimerSchedulerForVerification(clock.scheduler);
  try {
    test(clock);
  } finally {
    resetHeroTransitionForVerification();
    setHeroForwardTimerSchedulerForVerification();
  }
};

const settleSwipeHero = () => {
  const sourceInstanceToken = createHeroPhotoSourceInstanceToken();
  let sourceOrder = [...dog.images];
  let appliedIndex = 0;
  let sourceGeneration = 1;
  const photoSessionToken = beginHeroPhotoSession({
    id: dog.id,
    sourceInstanceToken,
    index: 0,
    imageKey: dog.images[0]!.id,
    generation: sourceGeneration,
    source: { uri: dog.images[0]!.url },
    applySourceSelection: (_index, imageKey) => {
      const exactIndex = sourceOrder.findIndex((image) => (image.id ?? image.url) === imageKey);
      if (exactIndex < 0) return null;
      appliedIndex = exactIndex;
      sourceGeneration += 1;
      return { index: exactIndex, generation: sourceGeneration };
    },
  });

  registerHeroActionFrame({ id: dog.id, role: "source", frame: actionFrom });
  const runId = startHero({
    id: dog.id,
    source: { uri: dog.images[0]!.url },
    sourceKind: "swipe",
    sourceImageKey: dog.images[0]!.id,
    sourcePhotoGeneration: sourceGeneration,
    photoSessionToken,
    from: photoFrom,
    cardSurface: true,
    bottomSurfaceLocations,
    title: { name: dog.name, age: "2 years" },
    titleFrom,
    chrome: { dog, pages: 3, currentPage: 0 },
    chromeFrom,
    shadow: SWIPE_CARD_HERO_SHADOW,
    onReady: () => {},
    onPaintFailure: () => assert.fail("settled Swipe fixture overlay must paint"),
  });
  markHeroOverlayReady(runId);
  assert.equal(dispatchHeroForwardNavigation(runId), true);
  registerSwipeTargetTuple(runId);
  assert.equal(areHeroSharedElementsReady(getHeroStateSnapshot()), true);
  assert.equal(
    markHeroTargetPhotoPainted({
      id: dog.id,
      runId,
      imageKey: dog.images[0]!.id,
      uri: dog.images[0]!.url,
      generation: sourceGeneration,
    }),
    true,
  );
  markHeroMotionStarted(runId);
  endHero(runId);
  acknowledgeAllTargetFrames(runId);
  assert.equal(getHeroStateSnapshot().id, null);

  return {
    runId,
    photoSessionToken,
    sourceInstanceToken,
    appliedIndex: () => appliedIndex,
    sourceGeneration: () => sourceGeneration,
    setSourceOrder: (images: typeof dog.images) => {
      sourceOrder = images;
    },
  };
};

const paintCurrentSource = (fixture: ReturnType<typeof settleSwipeHero>) => {
  const selection = getHeroPhotoSelectionSnapshot(fixture.photoSessionToken);
  assert.ok(selection);
  return markHeroSourcePhotoPainted({
    id: dog.id,
    sourceInstanceToken: fixture.sourceInstanceToken,
    imageKey: selection.imageKey,
    uri: selection.source.uri,
    generation: selection.generation,
  });
};

const acknowledgeAllSourceFrames = (runId: number) => {
  markHeroSourceFocused({ id: dog.id, runId });
  assert.equal(
    acknowledgeHeroSourceFrame({ id: dog.id, runId, role: "photo", frame: photoFrom }),
    true,
  );
  acknowledgeHeroSourceFrame({ id: dog.id, runId, role: "chrome", frame: chromeFrom });
  acknowledgeHeroSourceFrame({ id: dog.id, runId, role: "action", frame: actionFrom });
  acknowledgeHeroSourceFrame({ id: dog.id, runId, role: "title", frame: titleFrom });
};

const prepareRuntimeSwipeForward = (onUnsafeHandoff?: () => void) => {
  const sourceInstanceToken = createHeroPhotoSourceInstanceToken();
  const generation = 3;
  const photoSessionToken = beginHeroPhotoSession({
    id: dog.id,
    sourceInstanceToken,
    index: 0,
    imageKey: dog.images[0]!.id,
    generation,
    source: { uri: dog.images[0]!.url },
    applySourceSelection: (index) => ({ index, generation: generation + 1 }),
  });
  registerHeroActionFrame({ id: dog.id, role: "source", frame: actionFrom });
  const runId = startHero({
    id: dog.id,
    source: { uri: dog.images[0]!.url },
    sourceKind: "swipe",
    sourceImageKey: dog.images[0]!.id,
    sourcePhotoGeneration: generation,
    photoSessionToken,
    from: photoFrom,
    chrome: { dog, pages: dog.images.length, currentPage: 0 },
    chromeFrom,
    title: { name: dog.name, age: "2 years" },
    titleFrom,
    onReady: () => {},
    onPaintFailure: () => assert.fail("runtime fixture overlay must paint"),
    onUnsafeHandoff,
  });
  markHeroOverlayReady(runId);
  assert.equal(dispatchHeroForwardNavigation(runId), true);
  registerSwipeTargetTuple(runId);
  markHeroMotionStarted(runId);
  return { runId, photoSessionToken, sourceInstanceToken, generation };
};

const prepareRuntimeChatForward = (onUnsafeHandoff?: () => void) => {
  const runId = startHero({
    id: dog.id,
    source: { uri: dog.images[0]!.url },
    sourceKind: "chat",
    sourceImageKey: dog.images[0]!.id,
    sourcePhotoGeneration: 1,
    from: photoFrom,
    chrome: { dog, pages: dog.images.length, currentPage: 0 },
    onReady: () => {},
    onPaintFailure: () => assert.fail("Chat runtime fixture overlay must paint"),
    onUnsafeHandoff,
  });
  markHeroOverlayReady(runId);
  assert.equal(dispatchHeroForwardNavigation(runId), true);
  registerPhotoBackTargetTuple(runId);
  markHeroMotionStarted(runId);
  return runId;
};

const acknowledgeAllTargetFrames = (
  runId: number,
  frames: { action?: HeroFrame; goBack?: HeroFrame } = {},
) => {
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "photo", frame: photoTo });
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "chrome", frame: chromeTo });
  acknowledgeHeroTargetFrame({
    id: dog.id,
    runId,
    role: "action",
    frame: frames.action ?? actionTo,
  });
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "title", frame: titleTo });
  acknowledgeHeroTargetFrame({
    id: dog.id,
    runId,
    role: "goBack",
    frame: frames.goBack ?? goBackTo,
  });
};

const settleSafeRuntimeSwipeHero = () => {
  const fixture = prepareRuntimeSwipeForward();
  const activeSnapshot = getHeroStateSnapshot();
  assert.equal(isHeroSourceSurfaceHeld(activeSnapshot, dog.id, "swipe"), true);
  assert.equal(isHeroSourceSurfaceHeld(activeSnapshot, dog.id, "chat"), false);
  assert.equal(
    shouldHideHeroEndpointPhoto(activeSnapshot, dog.id, true, "chat"),
    false,
    "same-dog Chat source pixels stay visible during a Swipe forward",
  );
  assert.equal(
    markHeroTargetPhotoPainted({
      id: dog.id,
      runId: fixture.runId,
      imageKey: dog.images[0]!.id,
      uri: dog.images[0]!.url,
      generation: fixture.generation,
    }),
    true,
  );
  endHero(fixture.runId);
  acknowledgeAllTargetFrames(fixture.runId);
  assert.equal(getHeroStateSnapshot().id, null, "safe forward handoff must settle the overlay");
  return fixture;
};

const testSettledSourceOwnershipLifecycle = () => {
  resetHeroTransitionForVerification();
  const fixture = settleSafeRuntimeSwipeHero();
  let snapshot = getHeroStateSnapshot();
  assert.deepEqual(
    snapshot.settledSourceOwner,
    { id: dog.id, sourceKind: "swipe" },
    "a safe forward settle keeps ownership of the covered Swipe source",
  );
  assert.equal(isHeroSourceSurfaceHeld(snapshot, dog.id, "swipe"), true);
  assert.equal(
    isHeroSourceSurfaceHeld(snapshot, dog.id, "chat"),
    false,
    "same-dog Chat UI cannot inherit a settled Swipe source hold",
  );
  assert.equal(
    shouldHideHeroEndpointPhoto(snapshot, dog.id, true, "swipe"),
    true,
    "the settled source stays hidden while the profile route is above it",
  );
  assert.equal(
    shouldHideHeroEndpointPhoto(snapshot, dog.id, false),
    false,
    "settled source ownership must not hide the visible profile target",
  );
  assert.equal(
    shouldHideHeroEndpointPhoto(snapshot, dog.id, true, "chat"),
    false,
    "same-dog Chat source pixels remain independent from a settled Swipe owner",
  );

  assert.equal(
    markHeroSourcePhotoPainted({
      id: dog.id,
      sourceInstanceToken: fixture.sourceInstanceToken,
      imageKey: dog.images[0]!.id,
      uri: dog.images[0]!.url,
      generation: fixture.generation,
    }),
    false,
    "a settled source paint is cached before reverse owns an active handoff",
  );
  const events: string[] = [];
  assert.equal(
    startReverseHero(dog.id, {
      removeRoute: () => events.push("remove"),
      postHandoff: () => events.push("post-handoff"),
    }),
    "started",
  );
  const reverseRun = getHeroStateSnapshot().runId;
  snapshot = getHeroStateSnapshot();
  assert.deepEqual(snapshot.settledSourceOwner, { id: dog.id, sourceKind: "swipe" });
  assert.equal(
    isHeroSourceSurfaceHeld(snapshot, dog.id, "swipe"),
    true,
    "reverse keeps the covered source hidden before the flying image paints",
  );
  assert.equal(
    shouldHideHeroEndpointPhoto(snapshot, dog.id, false),
    false,
    "the target remains visible until reverse overlay pixels exist",
  );

  markHeroOverlayReady(reverseRun);
  snapshot = getHeroStateSnapshot();
  assert.equal(shouldHideHeroEndpointPhoto(snapshot, dog.id, true, "swipe"), true);
  assert.equal(
    shouldHideHeroEndpointPhoto(snapshot, dog.id, true, "chat"),
    false,
    "active reverse ownership stays scoped to its source kind",
  );
  assert.equal(shouldHideHeroEndpointPhoto(snapshot, dog.id, false), true);
  markHeroMotionStarted(reverseRun);
  endHero(reverseRun);
  endHero(reverseRun);
  assert.deepEqual(events, ["remove"], "reverse dispatches route removal exactly once");
  assert.equal(
    isHeroSourceSurfaceHeld(getHeroStateSnapshot(), dog.id, "swipe"),
    true,
    "the source hold survives route removal while the landed overlay still covers it",
  );

  acknowledgeAllSourceFrames(reverseRun);
  snapshot = getHeroStateSnapshot();
  assert.equal(snapshot.id, null);
  assert.deepEqual(snapshot.settledSourceOwner, { id: dog.id, sourceKind: "swipe" });
  assert.equal(
    isHeroSourceSurfaceHeld(snapshot, dog.id, "swipe"),
    true,
    "source ownership cannot release before React commits overlay removal",
  );
  assert.deepEqual(events, ["remove"], "post-handoff waits for overlay-clear confirmation");

  confirmHeroOverlayCleared(reverseRun);
  snapshot = getHeroStateSnapshot();
  assert.equal(snapshot.settledSourceOwner, null);
  assert.equal(isHeroSourceSurfaceHeld(snapshot, dog.id, "swipe"), false);
  assert.deepEqual(events, ["remove", "post-handoff"]);
  confirmHeroOverlayCleared(reverseRun);
  assert.deepEqual(events, ["remove", "post-handoff"], "overlay clear is exact-once");
};

const testSettledSourceOwnershipInvalidation = () => {
  const assertReleased = (reason: string) => {
    const snapshot = getHeroStateSnapshot();
    assert.equal(snapshot.settledSourceOwner, null, `${reason} clears the settled source owner`);
    assert.equal(isHeroSourceSurfaceHeld(snapshot, dog.id), false, `${reason} restores the source`);
    assert.equal(
      startReverseHero(dog.id, { removeRoute: () => assert.fail("invalid reverse removal") }),
      "unavailable",
      `${reason} also invalidates the reverse snapshot`,
    );
  };

  resetHeroTransitionForVerification();
  settleSwipeHero();
  assert.equal(isHeroSourceSurfaceHeld(getHeroStateSnapshot(), dog.id), true);
  invalidateHeroForContentChange(dog.id);
  assertReleased("content invalidation");

  resetHeroTransitionForVerification();
  let fixture = settleSwipeHero();
  assert.equal(isHeroSourceSurfaceHeld(getHeroStateSnapshot(), dog.id), true);
  invalidateHeroPhotoSession({ id: dog.id, sessionToken: fixture.photoSessionToken });
  assert.equal(getHeroPhotoSelectionSnapshot(fixture.photoSessionToken), null);
  assertReleased("photo-session invalidation");

  resetHeroTransitionForVerification();
  const staleFixture = settleSwipeHero();
  fixture = settleSwipeHero();
  assert.notEqual(staleFixture.photoSessionToken, fixture.photoSessionToken);
  invalidateHeroPhotoSession({ id: dog.id, sessionToken: staleFixture.photoSessionToken });
  invalidateHeroPhotoSession({ id: "another-dog", sessionToken: fixture.photoSessionToken });
  assert.ok(
    getHeroPhotoSelectionSnapshot(fixture.photoSessionToken),
    "a stale token or wrong dog cannot delete the current route photo session",
  );
  assert.equal(
    isHeroSourceSurfaceHeld(getHeroStateSnapshot(), dog.id),
    true,
    "a stale token cannot clear a newer settled reverse snapshot",
  );
  assert.equal(
    startReverseHero(dog.id, { removeRoute: () => {} }),
    "started",
    "the newer exact-token snapshot remains reversible",
  );

  resetHeroTransitionForVerification();
  fixture = settleSwipeHero();
  assert.equal(isHeroSourceSurfaceHeld(getHeroStateSnapshot(), dog.id), true);
  invalidateHeroGeometryForScroll({
    id: dog.id,
    photoSessionToken: fixture.photoSessionToken,
  });
  assert.ok(
    getHeroPhotoSelectionSnapshot(fixture.photoSessionToken),
    "geometry invalidation preserves the route-scoped photo session",
  );
  assertReleased("geometry invalidation");

  resetHeroTransitionForVerification();
  fixture = settleSwipeHero();
  assert.equal(isHeroSourceSurfaceHeld(getHeroStateSnapshot(), dog.id), true);
  releaseHeroPhotoSourceInstance(fixture.sourceInstanceToken);
  assert.equal(getHeroPhotoSelectionSnapshot(fixture.photoSessionToken), null);
  assertReleased("source-instance release");
};

const settleChatSourceOwnership = () => {
  const runId = startHero({
    id: dog.id,
    source: { uri: dog.images[0]!.url },
    sourceKind: "chat",
    sourceImageKey: dog.images[0]!.id,
    sourcePhotoGeneration: 1,
    from: photoFrom,
    onReady: () => {},
    onPaintFailure: () => assert.fail("settled Chat fixture overlay must paint"),
  });
  markHeroOverlayReady(runId);
  assert.equal(dispatchHeroForwardNavigation(runId), true);
  registerPhotoBackTargetTuple(runId, { chrome: null });
  assert.equal(
    markHeroTargetPhotoPainted({
      id: dog.id,
      runId,
      imageKey: dog.images[0]!.id,
      uri: dog.images[0]!.url,
      generation: 1,
    }),
    true,
  );
  markHeroMotionStarted(runId);
  endHero(runId);
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "photo", frame: photoTo });
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "goBack", frame: goBackTo });
  assert.deepEqual(getHeroStateSnapshot().settledSourceOwner, {
    id: dog.id,
    sourceKind: "chat",
  });
  assert.equal(isHeroSourceSurfaceHeld(getHeroStateSnapshot(), dog.id, "chat"), true);
  assert.equal(
    isHeroSourceSurfaceHeld(getHeroStateSnapshot(), dog.id, "swipe"),
    false,
    "same-dog Swipe UI cannot inherit a settled Chat source hold",
  );
  return runId;
};

const testScopedSourceOwnershipRelease = () => {
  resetHeroTransitionForVerification();
  const activeRun = startHero({
    id: dog.id,
    source: { uri: dog.images[0]!.url },
    sourceKind: "chat",
    sourceImageKey: dog.images[0]!.id,
    sourcePhotoGeneration: 1,
    from: photoFrom,
  });
  assert.equal(
    releaseHeroSourceOwnership({ id: dog.id, sourceKind: "swipe", forwardRunId: activeRun }),
    false,
    "a Swipe cleanup cannot release a same-dog Chat forward",
  );
  assert.equal(
    releaseHeroSourceOwnership({ id: dog.id, sourceKind: "chat", forwardRunId: activeRun + 1 }),
    false,
    "a stale/newer run id cannot release the active Chat forward",
  );
  assert.equal(getHeroStateSnapshot().runId, activeRun);
  assert.equal(getHeroStateSnapshot().phase, "forward");
  assert.equal(
    releaseHeroSourceOwnership({ id: dog.id, sourceKind: "chat", forwardRunId: activeRun }),
    true,
    "the exact mounted source can release its own active forward",
  );
  assert.equal(getHeroStateSnapshot().id, null);

  resetHeroTransitionForVerification();
  const oldRun = settleChatSourceOwnership();
  assert.equal(
    releaseHeroSourceOwnership({ id: dog.id, sourceKind: "swipe", forwardRunId: oldRun }),
    false,
    "settled ownership remains source-kind scoped",
  );
  assert.deepEqual(getHeroStateSnapshot().settledSourceOwner, {
    id: dog.id,
    sourceKind: "chat",
  });

  const newerRun = startHero({
    id: dog.id,
    source: { uri: dog.images[1]!.url },
    sourceKind: "chat",
    sourceImageKey: dog.images[1]!.id,
    sourcePhotoGeneration: 1,
    from: photoFrom,
    onReady: () => {},
    onPaintFailure: () => assert.fail("replacement Chat fixture overlay must paint"),
  });
  assert.equal(
    releaseHeroSourceOwnership({ id: dog.id, sourceKind: "chat", forwardRunId: oldRun }),
    false,
    "delayed cleanup from the old same-dog source cannot abandon its replacement",
  );
  assert.equal(getHeroStateSnapshot().runId, newerRun);
  assert.equal(getHeroStateSnapshot().phase, "forward");
  markHeroOverlayReady(newerRun);
  assert.equal(dispatchHeroForwardNavigation(newerRun), true);
  registerPhotoBackTargetTuple(newerRun, { chrome: null });
  assert.equal(
    markHeroTargetPhotoPainted({
      id: dog.id,
      runId: newerRun,
      imageKey: dog.images[1]!.id,
      uri: dog.images[1]!.url,
      generation: 1,
    }),
    true,
  );
  markHeroMotionStarted(newerRun);
  endHero(newerRun);
  acknowledgeHeroTargetFrame({ id: dog.id, runId: newerRun, role: "photo", frame: photoTo });
  acknowledgeHeroTargetFrame({ id: dog.id, runId: newerRun, role: "goBack", frame: goBackTo });
  assert.equal(
    releaseHeroSourceOwnership({ id: dog.id, sourceKind: "chat", forwardRunId: oldRun }),
    false,
    "delayed cleanup also cannot clear the newer settled reverse snapshot",
  );
  assert.equal(isHeroSourceSurfaceHeld(getHeroStateSnapshot(), dog.id), true);
  assert.equal(
    releaseHeroSourceOwnership({ id: dog.id, sourceKind: "chat", forwardRunId: newerRun }),
    true,
  );
  assert.equal(isHeroSourceSurfaceHeld(getHeroStateSnapshot(), dog.id), false);

  resetHeroTransitionForVerification();
  const reversingRun = settleChatSourceOwnership();
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");
  const reverseSnapshot = getHeroStateSnapshot();
  assert.equal(
    releaseHeroSourceOwnership({
      id: dog.id,
      sourceKind: "chat",
      forwardRunId: reversingRun,
    }),
    false,
    "source cleanup cannot revoke an active reverse handoff",
  );
  assert.equal(getHeroStateSnapshot().runId, reverseSnapshot.runId);
  assert.equal(getHeroStateSnapshot().phase, "reverse");

  resetHeroTransitionForVerification();
  const oldSwipeRoute = settleSwipeHero();
  const newerSwipeRoute = settleSwipeHero();
  assert.equal(
    releaseHeroRouteOwnership({
      id: dog.id,
      sourceKind: "swipe",
      forwardRunId: oldSwipeRoute.runId,
      photoSessionToken: oldSwipeRoute.photoSessionToken,
    }),
    false,
    "an old same-dog Swipe route cannot release a newer settled visit",
  );
  assert.equal(
    releaseHeroRouteOwnership({
      id: dog.id,
      sourceKind: "swipe",
      forwardRunId: newerSwipeRoute.runId,
      photoSessionToken: oldSwipeRoute.photoSessionToken,
    }),
    false,
    "a Swipe route must present the exact photo-session capability",
  );
  assert.equal(
    releaseHeroRouteOwnership({
      id: dog.id,
      sourceKind: "swipe",
      forwardRunId: newerSwipeRoute.runId,
      photoSessionToken: newerSwipeRoute.photoSessionToken,
    }),
    true,
    "the exact Swipe route releases only its own settled visit",
  );

  resetHeroTransitionForVerification();
  const oldChatRoute = settleChatSourceOwnership();
  const newerChatRoute = settleChatSourceOwnership();
  assert.equal(
    releaseHeroRouteOwnership({
      id: dog.id,
      sourceKind: "chat",
      forwardRunId: oldChatRoute,
    }),
    false,
    "an old same-dog Chat route cannot release a newer settled visit",
  );
  assert.equal(
    releaseHeroRouteOwnership({
      id: dog.id,
      sourceKind: "chat",
      forwardRunId: newerChatRoute,
    }),
    true,
  );
};

const testPendingExitCoordinator = () => {
  const coordinator = createPendingExitCoordinator();
  let handoffs = 0;
  let attempts = 0;
  assert.equal(
    coordinator.queue(() => handoffs++),
    true,
  );
  assert.equal(
    coordinator.queue(() => handoffs++),
    false,
    "one mutation owns one queued exit",
  );
  assert.equal(
    coordinator.attempt((_postHandoff, requestIntent) => {
      attempts++;
      assert.equal(coordinator.isRequestIntent(requestIntent), true);
      return "blocked";
    }),
    "blocked",
  );
  assert.equal(coordinator.status(), "pending", "a temporary global gate retains the exit");
  assert.equal(
    coordinator.attempt((postHandoff, requestIntent) => {
      attempts++;
      assert.equal(coordinator.isRequestIntent(requestIntent), true);
      postHandoff();
      return "accepted";
    }),
    "accepted",
  );
  assert.equal(
    coordinator.attempt(() => assert.fail("accepted exits cannot retry")),
    "idle",
  );
  assert.equal(attempts, 2);
  assert.equal(handoffs, 1, "the accepted exit owns one post-handoff truncation");

  const unmatch = createPendingExitCoordinator();
  const mutationOwned = true;
  let exitOwned = false;
  let dismisses = 0;
  const claimedHandoffs: Array<() => void> = [];
  const requestUnmatchExit = (
    postHandoff?: () => void,
    requestIntent?: unknown,
  ): ExitRequestResult => {
    if (
      (mutationOwned || unmatch.status() === "pending") &&
      !unmatch.isRequestIntent(requestIntent)
    ) {
      return "blocked";
    }
    if (exitOwned) return "blocked";
    exitOwned = true;
    if (postHandoff) claimedHandoffs.push(postHandoff);
    return "accepted";
  };

  assert.equal(requestUnmatchExit(), "blocked", "Back cannot steal an active Unmatch mutation");
  assert.equal(exitOwned, false);
  assert.equal(
    unmatch.queue(() => dismisses++),
    true,
    "a successful mutation queues one Messages dismissal",
  );
  assert.equal(
    unmatch.attempt((postHandoff, requestIntent) => requestUnmatchExit(postHandoff, requestIntent)),
    "accepted",
  );
  assert.equal(
    requestUnmatchExit(() => dismisses++),
    "blocked",
  );
  assert.equal(
    unmatch.attempt(() => assert.fail("accepted Unmatch exits cannot retry")),
    "idle",
  );
  assert.equal(claimedHandoffs.length, 1);
  claimedHandoffs[0]?.();
  assert.equal(dismisses, 1, "the Unmatch owner dismisses exactly once after handoff");

  const deferredUnmatch = createPendingExitCoordinator();
  let focused = false;
  let active = false;
  let deferredExits = 0;
  let deferredHandoffs = 0;
  assert.equal(
    deferredUnmatch.queue(() => deferredHandoffs++),
    true,
  );
  const attemptDeferredExit = (postHandoff: () => void): ExitRequestResult => {
    if (!focused || !active) return "blocked";
    deferredExits++;
    postHandoff();
    return "accepted";
  };
  assert.equal(
    deferredUnmatch.attempt((postHandoff) => attemptDeferredExit(postHandoff)),
    "blocked",
  );
  assert.equal(deferredUnmatch.status(), "pending");
  assert.equal(deferredExits, 0, "an inactive/unfocused Unmatch cannot start reverse or removal");
  assert.equal(deferredHandoffs, 0);
  focused = true;
  active = true;
  assert.equal(
    deferredUnmatch.attempt((postHandoff) => attemptDeferredExit(postHandoff)),
    "accepted",
  );
  assert.equal(deferredExits, 1);
  assert.equal(deferredHandoffs, 1, "active focus consumes the pending Unmatch exactly once");
};

const testProfileExitCoordinator = () => {
  const immediate = createProfileExitCoordinator();
  assert.equal(
    immediate.claim({ nativeRemoval: firstExitCallback, postHandoff: secondExitCallback }),
    "first",
  );
  assert.equal(
    immediate.claim({ nativeRemoval: thirdExitCallback }),
    "duplicate",
    "rapid Back/action requests cannot replace the first route and handoff callbacks",
  );
  assert.deepEqual(
    immediate.commitImmediate(),
    { nativeRemoval: firstExitCallback, postHandoff: secondExitCallback },
    "the first exact-once callback pair survives a duplicate request",
  );
  assert.equal(immediate.commitImmediate(), null);

  const completion = createProfileExitCoordinator();
  assert.equal(completion.claim({ nativeRemoval: firstExitCallback }), "first");
  const returningGeneration = completion.beginReturn();
  assert.ok(returningGeneration !== null);
  assert.equal(
    completion.markTopPresentation(returningGeneration + 1),
    false,
    "a stale UI-thread completion cannot enter the presentation gate",
  );
  assert.equal(completion.markTopPresentation(returningGeneration), true);
  const presentationGeneration = completion.currentGeneration();
  assert.equal(completion.commitReverse(returningGeneration), null);
  assert.deepEqual(completion.commitReverse(presentationGeneration), {
    nativeRemoval: firstExitCallback,
  });

  const presentationRetry = createProfileExitCoordinator();
  assert.equal(presentationRetry.claim({ nativeRemoval: firstExitCallback }), "first");
  const presentationAttempt = presentationRetry.beginReturn();
  assert.ok(presentationAttempt !== null);
  assert.equal(presentationRetry.markTopPresentation(presentationAttempt), true);
  const stalePresentationGeneration = presentationRetry.currentGeneration();
  const correctedPresentationGeneration = presentationRetry.retry(stalePresentationGeneration);
  assert.ok(correctedPresentationGeneration !== null);
  assert.equal(
    presentationRetry.markTopPresentation(stalePresentationGeneration),
    false,
    "the late first completion is stale after the top-presentation retry begins",
  );
  assert.deepEqual(presentationRetry.commitFallback(correctedPresentationGeneration), {
    nativeRemoval: firstExitCallback,
  });

  const retry = createProfileExitCoordinator();
  assert.equal(retry.claim({ postHandoff: secondExitCallback }), "first");
  const firstAttempt = retry.beginReturn();
  assert.ok(firstAttempt !== null);
  const retryGeneration = retry.retry(firstAttempt);
  assert.ok(retryGeneration !== null);
  assert.equal(retry.retry(retryGeneration), null, "one exit gets at most one controlled retry");
  assert.equal(retry.commitFallback(firstAttempt), null, "a stale watchdog cannot force a pop");
  assert.deepEqual(retry.commitFallback(retryGeneration), { postHandoff: secondExitCallback });

  const blocked = createProfileExitCoordinator();
  assert.equal(blocked.claim({ postHandoff: secondExitCallback }), "first");
  const blockedCallbacks = blocked.commitImmediate();
  assert.ok(blockedCallbacks);
  assert.equal(blocked.restoreBlocked(blockedCallbacks), true);
  assert.equal(
    blocked.claim({ nativeRemoval: thirdExitCallback }),
    "duplicate",
    "a reverse already in flight cannot replace the restored first callbacks",
  );
  const restoredPresentation = blocked.beginReturn();
  assert.ok(restoredPresentation !== null);
  assert.equal(blocked.markTopPresentation(restoredPresentation), true);
  assert.deepEqual(blocked.commitReverse(blocked.currentGeneration()), {
    postHandoff: secondExitCallback,
  });

  const backgrounded = createProfileExitCoordinator();
  assert.equal(backgrounded.claim({ nativeRemoval: firstExitCallback }), "first");
  const backgroundGeneration = backgrounded.beginReturn();
  assert.ok(backgroundGeneration !== null);
  assert.equal(backgrounded.pause(backgroundGeneration), true);
  assert.equal(backgrounded.markTopPresentation(backgroundGeneration), false);
  const pausedGeneration = backgrounded.currentGeneration();
  const resumedGeneration = backgrounded.resume();
  assert.ok(resumedGeneration !== null);
  assert.notEqual(resumedGeneration, pausedGeneration);
  assert.deepEqual(
    backgrounded.commitFallback(resumedGeneration),
    { nativeRemoval: firstExitCallback },
    "a preference/ownership failure after resume preserves the first ordinary exit",
  );

  assert.equal(getProfileReturnDuration(-20), 0);
  assert.equal(getProfileReturnDuration(0.49), 0);
  assert.equal(getProfileReturnDuration(0.5), 0);
  assert.equal(getProfileReturnDuration(0.51), 80.816);
  assert.equal(getProfileReturnDuration(1), 81.6);
  assert.equal(getProfileReturnDuration(8), 92.8);
  assert.equal(getProfileReturnDuration(8.01), 92.816);
  assert.equal(getProfileReturnDuration(50), 160);
  assert.equal(getProfileReturnDuration(100), 220);
  assert.equal(getProfileReturnDuration(1_000), 220);
  assert.equal(getProfileReturnDuration(0, true), 0);
  assert.equal(getProfileReturnDuration(1, true), 100.6);
  assert.equal(getProfileReturnDuration(50, true), 130);
  assert.equal(getProfileReturnDuration(1_000, true), 160);
};

const testForwardSingleFlight = () => {
  const flight = createHeroForwardFlight();
  assert.equal(flight.begin(), true);
  assert.equal(flight.begin(), false);
  flight.markNavigated();
  flight.onSourceFocusChange(true);
  assert.equal(flight.begin(), false);
  flight.onSourceFocusChange(false);
  flight.onSourceFocusChange(true);
  assert.equal(flight.begin(), true);
  flight.fail();
  assert.equal(flight.begin(), true);
};

const testForwardNativePresentationGate = () =>
  withForwardFakeClock(() => {
    const startForwardRun = () => {
      const runId = startHero({
        id: dog.id,
        source: { uri: dog.images[0]!.url },
        sourceKind: "chat",
        sourceImageKey: dog.images[0]!.id,
        from: photoFrom,
        onReady: () => {},
        onPaintFailure: () => assert.fail("presentation-gate fixture overlay must paint"),
      });
      markHeroOverlayReady(runId);
      assert.equal(dispatchHeroForwardNavigation(runId), true);
      return runId;
    };
    const registerTargetFrames = (runId: number) => {
      registerHeroTargetFrame({ id: dog.id, runId, role: "photo", frame: photoTo });
      registerHeroTargetFrame({ id: dog.id, runId, role: "goBack", frame: goBackTo });
    };
    const present = (runId: number, closing = false) =>
      markHeroDestinationPresented({ id: dog.id, runId, closing });

    const eventFirstRun = startForwardRun();
    const eventFirstVersion = getHeroStateSnapshot().version;
    assert.equal(present(eventFirstRun, true), false, "a closing event cannot arm forward motion");
    assert.equal(
      markHeroDestinationPresented({ id: "wrong-dog", runId: eventFirstRun, closing: false }),
      false,
      "a different route id cannot arm forward motion",
    );
    assert.equal(present(eventFirstRun - 1), false, "a stale route run cannot arm forward motion");
    assert.equal(getHeroStateSnapshot().version, eventFirstVersion);
    assert.equal(present(eventFirstRun), true);
    assert.equal(present(eventFirstRun), false, "native presentation is accepted once per run");
    assert.equal(getHeroStateSnapshot().destinationPresented, true);
    assert.equal(
      isHeroForwardMotionReady(getHeroStateSnapshot()),
      false,
      "native presentation cannot bypass missing target frames",
    );
    registerTargetFrames(eventFirstRun);
    assert.equal(
      isHeroForwardMotionReady(getHeroStateSnapshot()),
      true,
      "event-before-frames opens the gate only after the atomic target tuple",
    );

    const framesFirstRun = startForwardRun();
    assert.equal(
      markHeroDestinationPresented({ id: dog.id, runId: eventFirstRun, closing: false }),
      false,
      "the cold run's late event cannot arm a warm replacement",
    );
    registerTargetFrames(framesFirstRun);
    assert.equal(
      isHeroForwardMotionReady(getHeroStateSnapshot()),
      false,
      "target frames cannot bypass native presentation",
    );
    const framesFirstVersion = getHeroStateSnapshot().version;
    assert.equal(present(framesFirstRun), true);
    assert.equal(getHeroStateSnapshot().version, framesFirstVersion + 1);
    assert.equal(present(framesFirstRun), false, "the warm run also accepts presentation once");
    assert.equal(getHeroStateSnapshot().version, framesFirstVersion + 1);
    assert.equal(
      isHeroForwardMotionReady(getHeroStateSnapshot()),
      true,
      "frames-before-event opens the gate on the exact native event",
    );
  });

const testAtomicInitialTargetFrameCollection = () =>
  withForwardFakeClock((clock) => {
    registerHeroActionFrame({ id: dog.id, role: "source", frame: actionFrom });
    const swipeRunId = startHero({
      id: dog.id,
      source: { uri: dog.images[0]!.url },
      sourceKind: "swipe",
      sourceImageKey: dog.images[0]!.id,
      from: photoFrom,
      chrome: { dog, pages: dog.images.length, currentPage: 0 },
      chromeFrom,
      title: { name: dog.name, age: "2 years" },
      titleFrom,
      onReady: () => {},
      onPaintFailure: () => {},
    });
    const swipeVersion = getHeroStateSnapshot().version;
    const correctedPhoto = { ...photoTo, y: photoTo.y + 2, height: photoTo.height - 2 };

    assert.equal(
      registerHeroTargetFrame({
        id: dog.id,
        runId: swipeRunId - 1,
        role: "photo",
        frame: photoTo,
      }),
      false,
      "a stale run cannot seed the pending target tuple",
    );
    assert.equal(
      registerHeroTargetFrame({ id: dog.id, runId: swipeRunId, role: "photo", frame: photoTo }),
      true,
    );
    assert.equal(
      registerHeroTargetFrame({
        id: dog.id,
        runId: swipeRunId,
        role: "photo",
        frame: correctedPhoto,
      }),
      true,
      "the latest pre-publication measurement wins",
    );
    registerHeroTargetFrame({
      id: dog.id,
      runId: swipeRunId,
      role: "goBack",
      frame: goBackTo,
    });
    registerHeroTargetFrame({
      id: dog.id,
      runId: swipeRunId,
      role: "chrome",
      frame: chromeTo,
    });
    registerHeroTargetFrame({
      id: dog.id,
      runId: swipeRunId,
      role: "action",
      frame: actionTo,
    });
    assert.equal(
      getHeroStateSnapshot().version,
      swipeVersion,
      "partial Swipe geometry cannot rerender Hero subscribers",
    );
    assert.equal(getHeroStateSnapshot().to, null);
    assert.equal(getHeroStateSnapshot().goBackFrame, null);
    assert.equal(getHeroStateSnapshot().chromeTo, null);
    assert.equal(getHeroStateSnapshot().actionTo, null);
    assert.equal(getHeroStateSnapshot().titleTo, null);

    registerHeroTargetFrame({
      id: dog.id,
      runId: swipeRunId,
      role: "title",
      frame: titleTo,
    });
    const publishedSwipe = getHeroStateSnapshot();
    assert.equal(
      publishedSwipe.version,
      swipeVersion + 1,
      "Swipe publishes one atomic target tuple",
    );
    assert.deepEqual(publishedSwipe.to, correctedPhoto);
    assert.deepEqual(publishedSwipe.goBackFrame, goBackTo);
    assert.deepEqual(publishedSwipe.chromeTo, chromeTo);
    assert.deepEqual(publishedSwipe.actionTo, actionTo);
    assert.deepEqual(publishedSwipe.titleTo, titleTo);
    assert.equal(areHeroSharedElementsReady(publishedSwipe), true);

    const correctedChrome = { ...chromeTo, y: chromeTo.y + 3, height: chromeTo.height - 3 };
    assert.equal(
      registerHeroTargetFrame({
        id: dog.id,
        runId: swipeRunId,
        role: "chrome",
        frame: correctedChrome,
      }),
      true,
    );
    assert.equal(getHeroStateSnapshot().version, swipeVersion + 2);
    assert.deepEqual(
      getHeroStateSnapshot().chromeTo,
      correctedChrome,
      "a real pre-landing correction still retargets the active run",
    );

    endHero(swipeRunId);
    const landedVersion = getHeroStateSnapshot().version;
    assert.equal(
      registerHeroTargetFrame({
        id: dog.id,
        runId: swipeRunId,
        role: "action",
        frame: { ...actionTo, y: actionTo.y + 8 },
      }),
      false,
      "ordinary registration cannot retarget after p lands",
    );
    assert.equal(getHeroStateSnapshot().version, landedVersion);
    assert.deepEqual(getHeroStateSnapshot().actionTo, actionTo);

    resetHeroTransitionForVerification();
    const chatRunId = startHero({
      id: dog.id,
      source: { uri: dog.images[0]!.url },
      sourceKind: "chat",
      sourceImageKey: dog.images[0]!.id,
      from: photoFrom,
      chrome: { dog, pages: dog.images.length, currentPage: 0 },
      onReady: () => {},
      onPaintFailure: () => {},
    });
    const chatVersion = getHeroStateSnapshot().version;
    assert.equal(
      registerHeroTargetFrame({
        id: dog.id,
        runId: chatRunId,
        role: "title",
        frame: titleTo,
      }),
      false,
      "Chat cannot inherit Swipe-only target roles",
    );
    registerHeroTargetFrame({
      id: dog.id,
      runId: chatRunId,
      role: "photo",
      frame: photoTo,
    });
    registerHeroTargetFrame({
      id: dog.id,
      runId: chatRunId,
      role: "goBack",
      frame: goBackTo,
    });
    assert.equal(getHeroStateSnapshot().version, chatVersion);
    registerHeroTargetFrame({
      id: dog.id,
      runId: chatRunId,
      role: "chrome",
      frame: chromeTo,
    });
    assert.equal(getHeroStateSnapshot().version, chatVersion + 1);
    assert.equal(areHeroSharedElementsReady(getHeroStateSnapshot()), true);
    assert.equal(getHeroStateSnapshot().actionTo, null);
    assert.equal(getHeroStateSnapshot().titleTo, null);

    resetHeroTransitionForVerification();
    const oldRunId = startHero({
      id: dog.id,
      source: { uri: dog.images[0]!.url },
      sourceKind: "chat",
      sourceImageKey: dog.images[0]!.id,
      from: photoFrom,
      chrome: { dog, pages: dog.images.length, currentPage: 0 },
      onReady: () => {},
      onPaintFailure: () => {},
    });
    registerHeroTargetFrame({ id: dog.id, runId: oldRunId, role: "photo", frame: photoTo });
    const replacementRunId = startHero({
      id: dog.id,
      source: { uri: dog.images[1]!.url },
      sourceKind: "chat",
      sourceImageKey: dog.images[1]!.id,
      from: photoFrom,
      chrome: { dog, pages: dog.images.length, currentPage: 1 },
      onReady: () => {},
      onPaintFailure: () => {},
    });
    const replacementVersion = getHeroStateSnapshot().version;
    assert.equal(
      registerHeroTargetFrame({
        id: dog.id,
        runId: oldRunId,
        role: "goBack",
        frame: goBackTo,
      }),
      false,
    );
    assert.equal(
      registerHeroTargetFrame({
        id: dog.id,
        runId: oldRunId,
        role: "chrome",
        frame: chromeTo,
      }),
      false,
      "late same-dog callbacks cannot complete a replacement run",
    );
    assert.equal(getHeroStateSnapshot().version, replacementVersion);
    assert.equal(getHeroStateSnapshot().to, null);
    registerHeroTargetFrame({
      id: dog.id,
      runId: replacementRunId,
      role: "photo",
      frame: correctedPhoto,
    });
    registerHeroTargetFrame({
      id: dog.id,
      runId: replacementRunId,
      role: "goBack",
      frame: goBackTo,
    });
    registerHeroTargetFrame({
      id: dog.id,
      runId: replacementRunId,
      role: "chrome",
      frame: chromeTo,
    });
    assert.equal(getHeroStateSnapshot().version, replacementVersion + 1);
    assert.deepEqual(getHeroStateSnapshot().to, correctedPhoto);

    resetHeroTransitionForVerification();
    const watchdogEvents: string[] = [];
    const incompleteRunId = startHero({
      id: dog.id,
      source: { uri: dog.images[0]!.url },
      sourceKind: "chat",
      sourceImageKey: dog.images[0]!.id,
      from: photoFrom,
      chrome: { dog, pages: dog.images.length, currentPage: 0 },
      onReady: () => watchdogEvents.push("navigate"),
      onPaintFailure: () => watchdogEvents.push("paint-fallback"),
      onCancel: (reason) => watchdogEvents.push(reason),
    });
    markHeroOverlayReady(incompleteRunId);
    assert.equal(dispatchHeroForwardNavigation(incompleteRunId), true);
    registerHeroTargetFrame({
      id: dog.id,
      runId: incompleteRunId,
      role: "photo",
      frame: photoTo,
    });
    clock.advance(699);
    registerHeroTargetFrame({
      id: dog.id,
      runId: incompleteRunId,
      role: "goBack",
      frame: goBackTo,
    });
    assert.equal(getHeroStateSnapshot().runId, incompleteRunId);
    clock.advance(1);
    assert.deepEqual(
      watchdogEvents,
      ["navigate", "readiness-timeout"],
      "partial target frames cannot extend the original readiness watchdog",
    );
    assert.equal(getHeroStateSnapshot().id, null);
    assert.equal(
      registerHeroTargetFrame({
        id: dog.id,
        runId: incompleteRunId,
        role: "chrome",
        frame: chromeTo,
      }),
      false,
      "a watchdog-abandoned batch cannot publish late",
    );
  });

const testCompleteTargetTuplePresentationWatchdog = () =>
  withForwardFakeClock((clock) => {
    const events: string[] = [];
    let runId = startHero({
      id: dog.id,
      source: { uri: dog.images[0]!.url },
      sourceKind: "chat",
      sourceImageKey: dog.images[0]!.id,
      from: photoFrom,
      chrome: { dog, pages: dog.images.length, currentPage: 0 },
      onReady: () => events.push("navigate"),
      onPaintFailure: () => events.push("paint-fallback"),
      onCancel: (reason) => events.push(reason),
    });
    markHeroOverlayReady(runId);
    assert.equal(dispatchHeroForwardNavigation(runId), true);
    clock.advance(699);
    registerPhotoBackTargetTuple(runId);
    assert.equal(areHeroSharedElementsReady(getHeroStateSnapshot()), true);
    clock.advance(1);
    assert.equal(
      getHeroStateSnapshot().id,
      dog.id,
      "a complete tuple gets one presentation window before motion starts",
    );
    assert.deepEqual(events, ["navigate"]);
    markHeroMotionStarted(runId);

    resetHeroTransitionForVerification();
    events.length = 0;
    runId = startHero({
      id: dog.id,
      source: { uri: dog.images[0]!.url },
      sourceKind: "chat",
      sourceImageKey: dog.images[0]!.id,
      from: photoFrom,
      chrome: { dog, pages: dog.images.length, currentPage: 0 },
      onReady: () => events.push("navigate"),
      onPaintFailure: () => events.push("paint-fallback"),
      onCancel: (reason) => events.push(reason),
    });
    markHeroOverlayReady(runId);
    assert.equal(dispatchHeroForwardNavigation(runId), true);
    clock.advance(699);
    registerPhotoBackTargetTuple(runId);
    clock.advance(699);
    registerHeroTargetFrame({
      id: dog.id,
      runId,
      role: "chrome",
      frame: { ...chromeTo, y: chromeTo.y + 4 },
    });
    clock.advance(1);
    assert.deepEqual(
      events,
      ["navigate", "readiness-timeout"],
      "post-publication corrections cannot extend the one presentation window",
    );
    assert.equal(getHeroStateSnapshot().id, null);
  });

const testSettledActionRefreshGeneration = () => {
  resetHeroTransitionForVerification();
  let fixture = settleSafeRuntimeSwipeHero();
  const staleFrame = { ...actionTo, y: actionTo.y + 40 };
  const settledVersion = getHeroStateSnapshot().version;
  assert.equal(
    registerHeroTargetFrame({
      id: dog.id,
      runId: fixture.runId,
      role: "action",
      frame: staleFrame,
    }),
    false,
    "an ordinary same-run callback cannot refresh a settled snapshot",
  );
  assert.equal(getHeroStateSnapshot().version, settledVersion);
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");
  assert.deepEqual(
    getHeroStateSnapshot().actionFrom,
    actionTo,
    "reverse keeps the landed action frame after a stale ordinary callback",
  );

  resetHeroTransitionForVerification();
  fixture = settleSafeRuntimeSwipeHero();
  const refreshedFrame = { ...actionTo, y: actionTo.y + 6 };
  const refreshVersion = getHeroStateSnapshot().version;
  assert.equal(
    refreshSettledHeroActionFrame({
      id: dog.id,
      forwardRunId: fixture.runId + 1,
      frame: refreshedFrame,
    }),
    false,
    "a wrong run cannot refresh a same-dog snapshot",
  );
  assert.equal(
    refreshSettledHeroActionFrame({
      id: dog.id,
      forwardRunId: fixture.runId,
      frame: refreshedFrame,
    }),
    true,
    "the deliberate post-settle generation can refresh its exact snapshot",
  );
  assert.equal(
    getHeroStateSnapshot().version,
    refreshVersion,
    "an internal reverse snapshot refresh does not emit unrelated UI state",
  );
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");
  assert.deepEqual(getHeroStateSnapshot().actionFrom, refreshedFrame);
  assert.equal(
    refreshSettledHeroActionFrame({
      id: dog.id,
      forwardRunId: fixture.runId,
      frame: actionTo,
    }),
    false,
    "a target callback cannot rewrite an active reverse",
  );

  resetHeroTransitionForVerification();
  fixture = settleSafeRuntimeSwipeHero();
  assert.equal(
    releaseHeroSourceOwnership({
      id: dog.id,
      sourceKind: "swipe",
      forwardRunId: fixture.runId,
    }),
    true,
  );
  assert.equal(
    refreshSettledHeroActionFrame({
      id: dog.id,
      forwardRunId: fixture.runId,
      frame: refreshedFrame,
    }),
    false,
    "a released source owner cannot authorize a settled refresh",
  );
};

const testForwardPhotoExposureGeometry = () => {
  const frozen = { x: 10, y: 20, width: 100, height: 200 };
  assert.deepEqual(getForwardPhotoExposureFrames(frozen, frozen), []);
  assert.deepEqual(
    getForwardPhotoExposureFrames(frozen, { x: 10, y: 15, width: 100, height: 205 }),
    [{ x: 10, y: 15, width: 100, height: 5 }],
    "top-only correction excludes the frozen intersection",
  );
  assert.deepEqual(
    getForwardPhotoExposureFrames(frozen, { x: 10, y: 20, width: 100, height: 205 }),
    [{ x: 10, y: 220, width: 100, height: 5 }],
    "bottom-only correction excludes the frozen intersection",
  );
  assert.deepEqual(
    getForwardPhotoExposureFrames(frozen, { x: 5, y: 20, width: 105, height: 200 }),
    [{ x: 5, y: 20, width: 5, height: 200 }],
    "left-only correction excludes the frozen intersection",
  );
  assert.deepEqual(
    getForwardPhotoExposureFrames(frozen, { x: 10, y: 20, width: 105, height: 200 }),
    [{ x: 110, y: 20, width: 5, height: 200 }],
    "right-only correction excludes the frozen intersection",
  );
  assert.deepEqual(
    getForwardPhotoExposureFrames(frozen, { x: 5, y: 15, width: 110, height: 210 }),
    [
      { x: 5, y: 15, width: 110, height: 5 },
      { x: 5, y: 220, width: 110, height: 5 },
      { x: 5, y: 20, width: 5, height: 200 },
      { x: 110, y: 20, width: 5, height: 200 },
    ],
    "overlap correction produces four non-overlapping exposed strips",
  );
  assert.deepEqual(
    getForwardPhotoExposureFrames(frozen, { x: 200, y: 300, width: 20, height: 30 }),
    [{ x: 200, y: 300, width: 20, height: 30 }],
    "a disjoint correction masks only the complete corrected target",
  );
};

const testMeasurementWatchdogDedupe = () => {
  let starts = 0;
  let navigations = 0;
  const finish = createHeroNavigationWatchdog(() => navigations++);
  finish(() => starts++);
  finish(() => starts++);
  assert.equal(starts, 1);
  assert.equal(navigations, 0);
};

const testMeasurementWatchdogCancellation = async () => {
  let starts = 0;
  let navigations = 0;
  const finish = createHeroNavigationWatchdog(() => navigations++);
  finish.cancel();
  finish(() => starts++);
  await delay(300);
  assert.equal(starts, 0, "a cancelled late measurement cannot start a hero");
  assert.equal(navigations, 0, "a cancelled measurement watchdog cannot navigate later");
};

const testPaintGateAndStaleRuns = () => {
  resetHeroTransitionForVerification();
  const events: string[] = [];
  const firstRun = startHero({
    id: "old-dog",
    source: { uri: "https://example.com/old.jpg" },
    sourceKind: "chat",
    sourceImageKey: "old-image",
    from: photoFrom,
  });
  const runId = startHero({
    id: dog.id,
    source: { uri: dog.images[0]!.url },
    sourceKind: "chat",
    sourceImageKey: dog.images[0]!.id,
    from: photoFrom,
    shadow: SWIPE_CARD_HERO_SHADOW,
    onReady: () => events.push("push:hero"),
    onPaintFailure: () => events.push("push:plain"),
  });
  markHeroOverlayReady(firstRun);
  assert.equal(
    registerHeroTargetFrame({
      id: "old-dog",
      runId: firstRun,
      role: "photo",
      frame: photoTo,
    }),
    false,
  );
  assert.deepEqual(events, []);
  assert.equal(getHeroStateSnapshot().to, null);
  assert.equal(isHeroShadowTransitionActive(getHeroStateSnapshot(), dog.id), false);
  assert.equal(shouldHideHeroEndpointPhoto(getHeroStateSnapshot(), dog.id, true), false);
  assert.equal(
    shouldHideHeroEndpointPhoto(getHeroStateSnapshot(), dog.id, false),
    false,
    "neither endpoint hides before the overlay image has native pixels",
  );
  markHeroOverlayReady(runId);
  markHeroOverlayReady(runId);
  assert.deepEqual(events, [], "overlay paint only commits hidden source ownership");
  assert.equal(dispatchHeroForwardNavigation(firstRun), false);
  assert.equal(dispatchHeroForwardNavigation(runId), true);
  assert.equal(dispatchHeroForwardNavigation(runId), false, "post-commit navigation is exact-once");
  assert.deepEqual(events, ["push:hero"]);
  assert.equal(isHeroShadowTransitionActive(getHeroStateSnapshot(), dog.id), true);
  assert.equal(shouldHideHeroEndpointPhoto(getHeroStateSnapshot(), dog.id, true), true);
  assert.equal(shouldHideHeroEndpointPhoto(getHeroStateSnapshot(), dog.id, false), true);

  resetHeroTransitionForVerification();
  let reentrantRunId = 0;
  const reentrantSourceRunId = startHero({
    id: "reentrant-source",
    source: { uri: "https://example.com/reentrant-source.jpg" },
    sourceKind: "chat",
    sourceImageKey: "reentrant-source-image",
    sourcePhotoGeneration: 1,
    from: photoFrom,
    onReady: () => {
      reentrantRunId = startHero({
        id: "reentrant-target",
        source: { uri: "https://example.com/reentrant-target.jpg" },
        sourceKind: "chat",
        sourceImageKey: "reentrant-target-image",
        sourcePhotoGeneration: 1,
        from: photoFrom,
      });
    },
    onPaintFailure: () => assert.fail("post-commit dispatch should win"),
  });
  markHeroOverlayReady(reentrantSourceRunId);
  assert.equal(dispatchHeroForwardNavigation(reentrantSourceRunId), true);
  assert.equal(getHeroStateSnapshot().runId, reentrantRunId);
  assert.equal(getHeroStateSnapshot().id, "reentrant-target");
  assert.equal(dispatchHeroForwardNavigation(reentrantSourceRunId), false);
  resetHeroTransitionForVerification();
};

const testForwardPaintTimeoutFallback = async () => {
  resetHeroTransitionForVerification();
  const events: string[] = [];
  const runId = startHero({
    id: dog.id,
    source: { uri: dog.images[0]!.url },
    sourceKind: "chat",
    sourceImageKey: dog.images[0]!.id,
    from: photoFrom,
    onReady: () => events.push("push:hero"),
    onPaintFailure: () => events.push("push:plain"),
  });
  await delay(760);
  markHeroOverlayReady(runId);
  assert.deepEqual(events, ["push:plain"]);
  assert.equal(getHeroStateSnapshot().id, null);
};

const testOpeningOwnershipAndForwardSupersession = () => {
  resetHeroTransitionForVerification();
  const openingCancellations: string[] = [];
  setHeroSourceOpening("dog-a", true, () => openingCancellations.push("a"));
  assert.equal(isHeroSourceOpening("dog-a"), true);
  setHeroSourceOpening("dog-b", true, () => openingCancellations.push("b"));
  assert.deepEqual(openingCancellations, ["a"]);
  assert.equal(isHeroSourceOpening("dog-a"), false);
  assert.equal(isHeroSourceOpening("dog-b"), true);
  cancelHeroSourceOpening("dog-b");
  cancelHeroSourceOpening("dog-b");
  assert.deepEqual(openingCancellations, ["a", "b"], "opening cancellation runs exactly once");

  const sourceInstanceToken = createHeroPhotoSourceInstanceToken();
  const oldSession = beginHeroPhotoSession({
    id: "dog-a",
    sourceInstanceToken,
    index: 0,
    imageKey: "a-image",
    generation: 1,
    source: { uri: "https://example.com/a.jpg" },
    applySourceSelection: () => ({ index: 0, generation: 2 }),
  });
  const events: string[] = [];
  const oldRun = startHero({
    id: "dog-a",
    source: { uri: "https://example.com/a.jpg" },
    sourceKind: "swipe",
    sourceImageKey: "a-image",
    sourcePhotoGeneration: 1,
    photoSessionToken: oldSession,
    from: photoFrom,
    onReady: () => events.push("a:navigate"),
    onPaintFailure: () => events.push("a:fallback"),
    onCancel: (reason) => events.push(`a:${reason}`),
  });
  const newRun = startHero({
    id: "dog-b",
    source: { uri: "https://example.com/b.jpg" },
    sourceKind: "chat",
    sourceImageKey: "b-image",
    from: photoFrom,
    onReady: () => events.push("b:navigate"),
    onPaintFailure: () => events.push("b:fallback"),
  });
  assert.notEqual(newRun, oldRun);
  assert.deepEqual(events, ["a:superseded"]);
  assert.equal(getHeroPhotoSelectionSnapshot(oldSession), null, "superseded session cannot leak");
  assert.equal(getHeroStateSnapshot().id, "dog-b");
  markHeroOverlayReady(oldRun);
  assert.deepEqual(events, ["a:superseded"], "stale A paint cannot navigate A");
  resetHeroTransitionForVerification();
};

const testReverseOwnershipCannotBeOverwritten = () => {
  resetHeroTransitionForVerification();
  settleChatSourceOwnership();
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");
  const reverseRun = getHeroStateSnapshot().runId;
  const cancellations: string[] = [];
  const rejectedRun = startHero({
    id: "dog-b",
    source: { uri: "https://example.com/b.jpg" },
    sourceKind: "chat",
    sourceImageKey: "b-image",
    from: photoFrom,
    onCancel: (reason) => cancellations.push(reason),
  });
  assert.equal(rejectedRun, reverseRun);
  assert.deepEqual(cancellations, ["reverse-in-flight"]);
  assert.equal(getHeroStateSnapshot().id, dog.id);
  assert.equal(getHeroStateSnapshot().phase, "reverse");
  resetHeroTransitionForVerification();
};

const testForwardReadinessAndCompletionWatchdogs = async () => {
  resetHeroTransitionForVerification();
  let events: string[] = [];
  let runId = startHero({
    id: dog.id,
    source: { uri: dog.images[0]!.url },
    sourceKind: "chat",
    sourceImageKey: dog.images[0]!.id,
    from: photoFrom,
    onReady: () => events.push("navigate"),
    onPaintFailure: () => events.push("fallback"),
    onCancel: (reason) => events.push(reason),
  });
  markHeroOverlayReady(runId);
  await delay(760);
  assert.deepEqual(events, ["fallback"], "lost post-commit effect uses ordinary navigation");
  assert.equal(
    getHeroStateSnapshot().id,
    null,
    "commit watchdog detaches the overlay before ordinary fallback",
  );
  assert.equal(dispatchHeroForwardNavigation(runId), false);
  assert.equal(
    registerHeroTargetFrame({
      id: dog.id,
      runId,
      role: "photo",
      frame: photoTo,
    }),
    false,
  );
  markHeroMotionStarted(runId);
  assert.deepEqual(events, ["fallback"], "late callbacks stay inert");

  resetHeroTransitionForVerification();
  events = [];
  runId = startHero({
    id: dog.id,
    source: { uri: dog.images[0]!.url },
    sourceKind: "chat",
    sourceImageKey: dog.images[0]!.id,
    from: photoFrom,
    onReady: () => events.push("navigate"),
    onPaintFailure: () => events.push("fallback"),
    onCancel: (reason) => events.push(reason),
  });
  markHeroOverlayReady(runId);
  assert.equal(dispatchHeroForwardNavigation(runId), true);
  await delay(760);
  assert.deepEqual(events, ["navigate", "readiness-timeout"]);
  assert.equal(
    getHeroStateSnapshot().id,
    null,
    "paint without target cannot leave controls locked",
  );

  resetHeroTransitionForVerification();
  events = [];
  runId = startHero({
    id: dog.id,
    source: { uri: dog.images[0]!.url },
    sourceKind: "chat",
    sourceImageKey: dog.images[0]!.id,
    sourcePhotoGeneration: 1,
    from: photoFrom,
    onReady: () => events.push("navigate"),
    onPaintFailure: () => events.push("fallback"),
    onCancel: (reason) => events.push(reason),
  });
  markHeroOverlayReady(runId);
  assert.equal(dispatchHeroForwardNavigation(runId), true);
  registerPhotoBackTargetTuple(runId, { chrome: null });
  assert.equal(
    markHeroTargetPhotoPainted({
      id: dog.id,
      runId,
      imageKey: dog.images[0]!.id,
      uri: dog.images[0]!.url,
      generation: 1,
    }),
    true,
  );
  markHeroMotionStarted(runId);
  await delay(760);
  assert.deepEqual(events, ["navigate"], "lost UI completion does not report cancellation");
  assert.equal(getHeroStateSnapshot().handoffPending, true);
  assert.equal(
    acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "photo", frame: photoTo }),
    true,
  );
  assert.equal(
    acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "goBack", frame: goBackTo }),
    true,
  );
  assert.equal(getHeroStateSnapshot().id, null, "lost completion still requires landed frames");
  assert.equal(
    startReverseHero(dog.id, { removeRoute: () => {} }),
    "started",
    "watchdog-settled forward remains truthfully reversible",
  );
  resetHeroTransitionForVerification();
};

const testForwardTargetHandoff = async () => {
  resetHeroTransitionForVerification();
  let unsafeCalls = 0;
  let fixture = prepareRuntimeSwipeForward(() => unsafeCalls++);
  assert.equal(
    markHeroTargetPhotoPainted({
      id: dog.id,
      runId: fixture.runId - 1,
      imageKey: dog.images[0]!.id,
      uri: dog.images[0]!.url,
      generation: fixture.generation,
    }),
    false,
  );
  assert.equal(
    markHeroTargetPhotoPainted({
      id: dog.id,
      runId: fixture.runId,
      imageKey: dog.images[1]!.id,
      uri: dog.images[0]!.url,
      generation: fixture.generation,
    }),
    false,
  );
  assert.equal(
    markHeroTargetPhotoPainted({
      id: dog.id,
      runId: fixture.runId,
      imageKey: dog.images[0]!.id,
      uri: dog.images[1]!.url,
      generation: fixture.generation,
    }),
    false,
  );
  assert.equal(
    markHeroTargetPhotoPainted({
      id: dog.id,
      runId: fixture.runId,
      imageKey: dog.images[0]!.id,
      uri: dog.images[0]!.url,
      generation: fixture.generation - 1,
    }),
    false,
  );
  assert.equal(
    markHeroTargetPhotoPainted({
      id: dog.id,
      runId: fixture.runId,
      imageKey: dog.images[0]!.id,
      uri: dog.images[0]!.url,
      generation: fixture.generation,
    }),
    true,
  );

  acknowledgeAllTargetFrames(fixture.runId);
  endHero(fixture.runId);
  assert.equal(getHeroStateSnapshot().phase, "forward");
  assert.equal(getHeroStateSnapshot().handoffPending, true);
  assert.equal(startReverseHero(dog.id, { removeRoute: () => assert.fail() }), "forward-in-flight");
  acknowledgeAllTargetFrames(fixture.runId);
  assert.equal(getHeroStateSnapshot().id, null, "pre-landing acks cannot satisfy landed ownership");
  assert.equal(unsafeCalls, 0, "the exact safe path never disables manual reverse");
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");

  resetHeroTransitionForVerification();
  unsafeCalls = 0;
  fixture = prepareRuntimeSwipeForward(() => unsafeCalls++);
  endHero(fixture.runId);
  const shiftedPhoto = { ...photoTo, x: photoTo.x - 4, y: photoTo.y - 6, width: 398, height: 620 };
  const shiftedAction = { ...actionTo, x: actionTo.x + 8, y: actionTo.y + 10 };
  const shiftedGoBack = { ...goBackTo, x: goBackTo.x - 12, y: goBackTo.y + 11 };
  assert.equal(
    registerHeroTargetFrame({
      id: dog.id,
      runId: fixture.runId,
      role: "action",
      frame: shiftedAction,
    }),
    false,
  );
  assert.deepEqual(
    getHeroStateSnapshot().actionTo,
    actionTo,
    "post-land target registration cannot retarget the frozen overlay",
  );
  assert.equal(
    acknowledgeHeroTargetFrame({
      id: dog.id,
      runId: fixture.runId,
      role: "goBack",
      frame: shiftedGoBack,
    }),
    false,
  );
  assert.equal(
    getHeroStateSnapshot().forwardFallback,
    null,
    "a mismatch cannot reveal an unpainted target",
  );
  assert.equal(shouldHideHeroEndpointPhoto(getHeroStateSnapshot(), dog.id, false), true);
  markHeroTargetPhotoPainted({
    id: dog.id,
    runId: fixture.runId,
    imageKey: dog.images[0]!.id,
    uri: dog.images[0]!.url,
    generation: fixture.generation,
  });
  assert.equal(
    getHeroStateSnapshot().forwardFallback,
    null,
    "exact pixels alone cannot reveal before the landed photo frame can be masked",
  );
  assert.equal(
    acknowledgeHeroTargetFrame({
      id: dog.id,
      runId: fixture.runId,
      role: "photo",
      frame: shiftedPhoto,
    }),
    false,
  );
  assert.deepEqual(getHeroStateSnapshot().forwardPhotoCorrection, shiftedPhoto);
  assert.equal(getHeroStateSnapshot().forwardFallback, "target");
  assert.equal(getHeroStateSnapshot().forwardGoBackRecoveryMode, "covered");
  assert.deepEqual(getHeroStateSnapshot().goBackFrame, goBackTo);
  assert.deepEqual(getHeroStateSnapshot().forwardGoBackCorrection, shiftedGoBack);
  assert.equal(
    acknowledgeHeroTargetFrame({
      id: dog.id,
      runId: fixture.runId,
      role: "action",
      frame: shiftedAction,
    }),
    false,
  );
  assert.deepEqual(getHeroStateSnapshot().actionTo, actionTo);
  assert.deepEqual(getHeroStateSnapshot().to, photoTo, "corrections stay out of band during q");
  assert.equal(shouldHideHeroEndpointPhoto(getHeroStateSnapshot(), dog.id, true), true);
  assert.equal(shouldHideHeroEndpointPhoto(getHeroStateSnapshot(), dog.id, false), false);
  const cover = getForwardGoBackOcclusionFrame(photoTo, goBackTo, shiftedGoBack);
  assert.deepEqual(cover, { x: 300, y: 610, width: 74, height: 42 });
  assert.ok(cover);
  assert.ok(cover.x <= goBackTo.x && cover.x <= shiftedGoBack.x);
  assert.ok(cover.x + cover.width >= goBackTo.x + goBackTo.width);
  assert.ok(cover.x + cover.width >= shiftedGoBack.x + shiftedGoBack.width);
  acknowledgeHeroTargetFrame({ id: dog.id, runId: fixture.runId, role: "chrome", frame: chromeTo });
  acknowledgeHeroTargetFrame({ id: dog.id, runId: fixture.runId, role: "title", frame: titleTo });
  assert.equal(getHeroStateSnapshot().phase, "forward", "late q acks cannot truncate recovery");
  completeForwardTargetRecovery(fixture.runId);
  assert.equal(unsafeCalls, 0);
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");
  assert.deepEqual(getHeroStateSnapshot().from, shiftedPhoto);
  assert.deepEqual(getHeroStateSnapshot().actionFrom, shiftedAction);
  assert.deepEqual(getHeroStateSnapshot().goBackFrame, shiftedGoBack);
  assert.equal(
    acknowledgeHeroTargetFrame({
      id: dog.id,
      runId: fixture.runId,
      role: "photo",
      frame: photoTo,
    }),
    false,
    "a late old-run ack cannot alter the reverse",
  );

  resetHeroTransitionForVerification();
  unsafeCalls = 0;
  let runId = prepareRuntimeChatForward(() => unsafeCalls++);
  endHero(runId);
  assert.equal(
    markHeroTargetPhotoPainted({
      id: dog.id,
      runId,
      imageKey: dog.images[0]!.id,
      uri: dog.images[0]!.url,
      generation: 1,
    }),
    true,
    "Chat forwards the deliberate generation-1 destination tuple",
  );
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "photo", frame: photoTo });
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "chrome", frame: chromeTo });
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "goBack", frame: goBackTo });
  assert.equal(getHeroStateSnapshot().id, null);
  assert.equal(unsafeCalls, 0);
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");

  resetHeroTransitionForVerification();
  unsafeCalls = 0;
  runId = prepareRuntimeChatForward(() => unsafeCalls++);
  endHero(runId);
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "photo", frame: photoTo });
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "chrome", frame: chromeTo });
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "goBack", frame: goBackTo });
  await delay(760);
  assert.equal(getHeroStateSnapshot().forwardFallback, null);
  assert.equal(shouldHideHeroEndpointPhoto(getHeroStateSnapshot(), dog.id, false), true);
  markHeroTargetPhotoPainted({
    id: dog.id,
    runId,
    imageKey: dog.images[0]!.id,
    uri: dog.images[0]!.url,
    generation: 1,
  });
  assert.equal(
    getHeroStateSnapshot().id,
    null,
    "paint atomically finishes an exact pending handoff",
  );
  assert.equal(unsafeCalls, 0);
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");

  resetHeroTransitionForVerification();
  unsafeCalls = 0;
  runId = prepareRuntimeChatForward(() => unsafeCalls++);
  endHero(runId);
  markHeroTargetPhotoPainted({
    id: dog.id,
    runId,
    imageKey: dog.images[0]!.id,
    uri: dog.images[0]!.url,
    generation: 1,
  });
  await delay(760);
  assert.equal(getHeroStateSnapshot().forwardFallback, null);
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "photo", frame: photoTo });
  assert.equal(getHeroStateSnapshot().forwardFallback, "target");
  assert.equal(getHeroStateSnapshot().forwardGoBackRecoveryMode, "complement");
  const lateShiftedGoBack = { ...goBackTo, x: goBackTo.x + 9, y: goBackTo.y + 13 };
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "chrome", frame: chromeTo });
  acknowledgeHeroTargetFrame({
    id: dog.id,
    runId,
    role: "goBack",
    frame: lateShiftedGoBack,
  });
  assert.equal(
    getHeroStateSnapshot().forwardGoBackRecoveryMode,
    "complement",
    "late shifted Back ack cannot flip ownership mode mid-q",
  );
  assert.equal(getHeroStateSnapshot().phase, "forward", "late complete tuple cannot truncate q");
  completeForwardTargetRecovery(runId);
  assert.equal(unsafeCalls, 0);
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");
  assert.deepEqual(getHeroStateSnapshot().goBackFrame, lateShiftedGoBack);

  resetHeroTransitionForVerification();
  unsafeCalls = 0;
  runId = prepareRuntimeChatForward(() => {
    unsafeCalls += 1;
    throw new Error("route update failed");
  });
  endHero(runId);
  await delay(760);
  assert.equal(unsafeCalls, 0);
  completeForwardTargetRecovery(runId);
  assert.equal(getHeroStateSnapshot().forwardFallback, null);
  assert.equal(getHeroStateSnapshot().phase, "forward");
  assert.equal(shouldHideHeroEndpointPhoto(getHeroStateSnapshot(), dog.id, false), true);
  markHeroTargetPhotoPainted({
    id: dog.id,
    runId,
    imageKey: dog.images[0]!.id,
    uri: dog.images[0]!.url,
    generation: 1,
  });
  assert.equal(getHeroStateSnapshot().forwardFallback, null);
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "photo", frame: photoTo });
  assert.equal(getHeroStateSnapshot().forwardFallback, "target");
  completeForwardTargetRecovery(runId);
  assert.equal(unsafeCalls, 1, "q completion reports an unsafe snapshot exactly once");
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "unavailable");

  resetHeroTransitionForVerification();
  unsafeCalls = 0;
  let reentrantRunId = 0;
  runId = prepareRuntimeChatForward(() => {
    unsafeCalls += 1;
    reentrantRunId = startHero({
      id: "newer-dog",
      source: { uri: "https://example.com/newer.jpg" },
      sourceKind: "chat",
      sourceImageKey: "newer-image",
      sourcePhotoGeneration: 1,
      from: photoFrom,
    });
  });
  endHero(runId);
  await delay(760);
  assert.equal(getHeroStateSnapshot().forwardFallback, null);
  markHeroTargetPhotoPainted({
    id: dog.id,
    runId,
    imageKey: dog.images[0]!.id,
    uri: dog.images[0]!.url,
    generation: 1,
  });
  assert.equal(getHeroStateSnapshot().forwardFallback, null);
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "photo", frame: photoTo });
  assert.equal(getHeroStateSnapshot().forwardFallback, "target");
  await delay(760);
  assert.equal(unsafeCalls, 1, "terminal watchdog cannot duplicate unsafe notification");
  assert.equal(getHeroStateSnapshot().runId, reentrantRunId);
  assert.equal(getHeroStateSnapshot().id, "newer-dog");
  completeForwardTargetRecovery(runId);
  assert.equal(
    getHeroStateSnapshot().runId,
    reentrantRunId,
    "stale completion cannot clear newer run",
  );
  assert.equal(
    acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "photo", frame: photoTo }),
    false,
  );
  resetHeroTransitionForVerification();
};

const testForwardTerminalRecoveryDeadlines = () => {
  const watchdogStep = 700;

  withForwardFakeClock((clock) => {
    let unsafeCalls = 0;
    const runId = prepareRuntimeChatForward(() => unsafeCalls++);
    endHero(runId);
    clock.advance(watchdogStep - 1);
    assert.equal(getHeroStateSnapshot().forwardFallback, null);
    clock.advance(1);
    assert.equal(
      getHeroStateSnapshot().forwardFallback,
      null,
      "the first deadline opens a bounded probe without detaching or revealing target pixels",
    );
    assert.equal(
      acknowledgeHeroTargetFrame({
        id: dog.id,
        runId: runId - 1,
        role: "photo",
        frame: photoTo,
      }),
      false,
      "a stale callback cannot satisfy the probe",
    );
    assert.equal(
      acknowledgeHeroTargetFrame({
        id: dog.id,
        runId,
        role: "photo",
        frame: { ...photoTo, y: photoTo.y + 9 },
      }),
      false,
      "a mismatch requests recovery without extending the probe deadline",
    );
    clock.advance(watchdogStep - 1);
    assert.equal(getHeroStateSnapshot().forwardFallback, null);
    clock.advance(1);
    assert.equal(getHeroStateSnapshot().phase, "forward");
    assert.equal(getHeroStateSnapshot().forwardFallback, "target");
    assert.equal(getHeroStateSnapshot().forwardRecoveryKind, "placeholder");
    assert.equal(unsafeCalls, 0, "placeholder q owns the visual handoff before detach");
    clock.advance(watchdogStep);
    assert.equal(getHeroStateSnapshot().id, null);
    assert.equal(unsafeCalls, 1, "missing callbacks reach idle and report unsafe exactly once");
    assert.equal(clock.pending(), 0);
    completeForwardTargetRecovery(runId);
    clock.advance(watchdogStep * 2);
    assert.equal(unsafeCalls, 1, "stale completion and timers remain inert");
  });

  withForwardFakeClock((clock) => {
    let unsafeCalls = 0;
    const runId = prepareRuntimeChatForward(() => unsafeCalls++);
    assert.equal(
      markHeroTargetPhotoPainted({
        id: dog.id,
        runId,
        imageKey: dog.images[0]!.id,
        uri: dog.images[0]!.url,
        generation: 1,
      }),
      true,
    );
    endHero(runId);
    clock.advance(watchdogStep * 2);
    assert.equal(getHeroStateSnapshot().phase, "forward");
    assert.equal(getHeroStateSnapshot().forwardFallback, "target");
    assert.equal(
      getHeroStateSnapshot().forwardRecoveryKind,
      "frozen-frame",
      "paint without a landed photo frame degrades through the frozen measured frame",
    );
    assert.equal(unsafeCalls, 0);
    clock.advance(watchdogStep);
    assert.equal(getHeroStateSnapshot().id, null);
    assert.equal(unsafeCalls, 1);
    assert.equal(startReverseHero(dog.id, { removeRoute: () => assert.fail() }), "unavailable");
  });

  withForwardFakeClock((clock) => {
    let unsafeCalls = 0;
    const runId = prepareRuntimeChatForward(() => unsafeCalls++);
    endHero(runId);
    clock.advance(watchdogStep);
    assert.equal(
      acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "photo", frame: photoTo }),
      true,
    );
    assert.equal(
      acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "chrome", frame: chromeTo }),
      true,
    );
    assert.equal(
      acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "goBack", frame: goBackTo }),
      true,
    );
    assert.equal(getHeroStateSnapshot().forwardFallback, null);
    assert.equal(
      markHeroTargetPhotoPainted({
        id: dog.id,
        runId,
        imageKey: dog.images[0]!.id,
        uri: dog.images[0]!.url,
        generation: 1,
      }),
      true,
      "late exact paint can still complete the safe handoff during the probe",
    );
    assert.equal(getHeroStateSnapshot().id, null);
    assert.equal(unsafeCalls, 0);
    assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");
  });

  withForwardFakeClock((clock) => {
    let unsafeCalls = 0;
    const runId = prepareRuntimeChatForward(() => unsafeCalls++);
    assert.equal(
      markHeroTargetPhotoPainted({
        id: dog.id,
        runId,
        imageKey: dog.images[0]!.id,
        uri: dog.images[0]!.url,
        generation: 1,
      }),
      true,
    );
    endHero(runId);
    clock.advance(watchdogStep);
    assert.equal(
      acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "photo", frame: photoTo }),
      true,
      "a late landed photo frame starts measured recovery during the probe",
    );
    assert.equal(getHeroStateSnapshot().forwardRecoveryKind, "measured");
    acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "chrome", frame: chromeTo });
    acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "goBack", frame: goBackTo });
    assert.equal(
      getHeroStateSnapshot().phase,
      "forward",
      "late exact callbacks cannot truncate an already-started q",
    );
    completeForwardTargetRecovery(runId);
    assert.equal(unsafeCalls, 0);
    assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");
  });

  withForwardFakeClock((clock) => {
    let unsafeCalls = 0;
    let reentrantRunId = 0;
    const runId = prepareRuntimeChatForward(() => {
      unsafeCalls += 1;
      reentrantRunId = startHero({
        id: "newer-dog",
        source: { uri: "https://example.com/newer.jpg" },
        sourceKind: "chat",
        sourceImageKey: "newer-image",
        sourcePhotoGeneration: 1,
        from: photoFrom,
      });
    });
    endHero(runId);
    clock.advance(watchdogStep * 3);
    assert.equal(unsafeCalls, 1);
    assert.equal(getHeroStateSnapshot().runId, reentrantRunId);
    assert.equal(getHeroStateSnapshot().id, "newer-dog");
    completeForwardTargetRecovery(runId);
    assert.equal(
      markHeroTargetPhotoPainted({
        id: dog.id,
        runId,
        imageKey: dog.images[0]!.id,
        uri: dog.images[0]!.url,
        generation: 1,
      }),
      false,
    );
    assert.equal(
      acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "photo", frame: photoTo }),
      false,
    );
    clock.advance(watchdogStep * 2);
    assert.equal(unsafeCalls, 1, "the old terminal path cannot clear or notify over a newer run");
    assert.equal(getHeroStateSnapshot().runId, reentrantRunId);
  });
};

const testRouteScopedSessionWithoutHero = () => {
  resetHeroTransitionForVerification();
  const sourceInstanceToken = createHeroPhotoSourceInstanceToken();
  let sourceIndex = 0;
  let sourceGeneration = 1;
  const token = beginHeroPhotoSession({
    id: dog.id,
    sourceInstanceToken,
    index: 0,
    imageKey: dog.images[0]!.id,
    generation: sourceGeneration,
    source: { uri: dog.images[0]!.url },
    applySourceSelection: (_index, imageKey) => {
      const exact = dog.images.findIndex((image) => image.id === imageKey);
      if (exact < 0) return null;
      sourceIndex = exact;
      sourceGeneration += 1;
      return { index: exact, generation: sourceGeneration };
    },
  });
  assert.equal(
    updateHeroPhotoSelection({
      id: dog.id,
      sessionToken: token,
      index: 1,
      imageKey: dog.images[1]!.id,
      source: { uri: dog.images[1]!.url },
    }),
    "synced",
  );
  assert.equal(sourceIndex, 1, "Reduce Motion/plain navigation still synchronizes source");
  assert.equal(getHeroPhotoSelectionSnapshot(token)?.imageKey, dog.images[1]!.id);
  endHeroPhotoSession(token);
  assert.equal(
    updateHeroPhotoSelection({
      id: dog.id,
      sessionToken: token,
      index: 2,
      imageKey: dog.images[2]!.id,
      source: { uri: dog.images[2]!.url },
    }),
    "stale",
  );
};

const finishSwipeReverse = (runId: number) => {
  markHeroOverlayReady(runId);
  markHeroMotionStarted(runId);
  endHero(runId);
  acknowledgeAllSourceFrames(runId);
};

const testAtomicPhotoRenderGeneration = () => {
  let renderState = { index: 0, generation: 1 };
  const firstKey = getHeroPhotoRenderKey(dog.images[0]!.id, renderState.generation);
  renderState = advanceHeroPhotoRenderState(1, renderState.generation);
  renderState = advanceHeroPhotoRenderState(0, renderState.generation);
  assert.deepEqual(
    renderState,
    { index: 0, generation: 3 },
    "coalesced A→B→A must still create a render-driving state change",
  );
  assert.notEqual(getHeroPhotoRenderKey(dog.images[0]!.id, renderState.generation), firstKey);
  const queuedSelection = advanceHeroPhotoRenderState(1, 1);
  const entry = getHeroPhotoEntrySnapshot(queuedSelection, dog.images);
  assert.deepEqual(
    { index: entry.index, generation: entry.generation, imageKey: entry.photo?.id },
    { index: 1, generation: 2, imageKey: dog.images[1]!.id },
    "rapid source page + open snapshots B:g2 atomically instead of render A plus mutable g2",
  );

  const selectedSecond = { index: 1, generation: 7 };
  const reordered = [dog.images[2]!, dog.images[0]!, dog.images[1]!];
  const reconciledReorder = reconcileHeroPhotoRenderState(selectedSecond, dog.images, reordered);
  assert.deepEqual(
    reconciledReorder,
    { index: 2, generation: 7 },
    "query reorder preserves the selected image key without inventing a paint generation",
  );
  const reconciledRemoval = reconcileHeroPhotoRenderState(reconciledReorder, reordered, [
    dog.images[2]!,
    dog.images[0]!,
  ]);
  assert.deepEqual(
    reconciledRemoval,
    { index: 1, generation: 8 },
    "removed selection falls back to a deterministic valid nonblank image",
  );
  const imageA = [dog.images[0]!];
  const imageB = [dog.images[1]!];
  const reconciledB = reconcileHeroPhotoRenderState({ index: 0, generation: 1 }, imageA, imageB);
  const reconciledA = reconcileHeroPhotoRenderState(reconciledB, imageB, imageA);
  assert.deepEqual(
    reconciledA,
    { index: 0, generation: 3 },
    "route-stable A→B→A replacements cannot reuse A's old native render key",
  );
};

const testSameKeyGenerationPaintGates = () => {
  resetHeroTransitionForVerification();
  let fixture = settleSwipeHero();
  paintCurrentSource(fixture);
  assert.equal(
    updateHeroPhotoSelection({
      id: dog.id,
      sessionToken: fixture.photoSessionToken,
      index: 1,
      imageKey: dog.images[1]!.id,
      source: { uri: dog.images[1]!.url },
    }),
    "synced",
  );
  assert.equal(
    updateHeroPhotoSelection({
      id: dog.id,
      sessionToken: fixture.photoSessionToken,
      index: 0,
      imageKey: dog.images[0]!.id,
      source: { uri: dog.images[0]!.url },
    }),
    "synced",
  );
  assert.equal(getHeroPhotoSelectionSnapshot(fixture.photoSessionToken)?.generation, 3);
  assert.equal(
    markHeroSourcePhotoPainted({
      id: dog.id,
      sourceInstanceToken: fixture.sourceInstanceToken,
      imageKey: dog.images[0]!.id,
      uri: dog.images[0]!.url,
      generation: 1,
    }),
    false,
    "late A:g1 cannot satisfy current A:g3",
  );
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");
  let reverseRun = getHeroStateSnapshot().runId;
  assert.equal(getHeroStateSnapshot().sourcePhotoGeneration, 3);
  finishSwipeReverse(reverseRun);
  assert.equal(getHeroStateSnapshot().id, dog.id, "reverse waits for the remounted A:g3 paint");
  assert.equal(paintCurrentSource(fixture), true);
  assert.equal(getHeroStateSnapshot().id, null);
  confirmHeroOverlayCleared(reverseRun);

  resetHeroTransitionForVerification();
  fixture = settleSwipeHero();
  updateHeroPhotoSelection({
    id: dog.id,
    sessionToken: fixture.photoSessionToken,
    index: 1,
    imageKey: dog.images[1]!.id,
    source: { uri: dog.images[1]!.url },
  });
  paintCurrentSource(fixture);
  updateHeroPhotoSelection({
    id: dog.id,
    sessionToken: fixture.photoSessionToken,
    index: 0,
    imageKey: dog.images[0]!.id,
    source: { uri: dog.images[0]!.url },
  });
  updateHeroPhotoSelection({
    id: dog.id,
    sessionToken: fixture.photoSessionToken,
    index: 1,
    imageKey: dog.images[1]!.id,
    source: { uri: dog.images[1]!.url },
  });
  assert.equal(getHeroPhotoSelectionSnapshot(fixture.photoSessionToken)?.generation, 4);
  assert.equal(
    markHeroSourcePhotoPainted({
      id: dog.id,
      sourceInstanceToken: fixture.sourceInstanceToken,
      imageKey: dog.images[1]!.id,
      uri: dog.images[1]!.url,
      generation: 2,
    }),
    false,
    "late B:g2 cannot satisfy current B:g4",
  );
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");
  reverseRun = getHeroStateSnapshot().runId;
  finishSwipeReverse(reverseRun);
  assert.equal(getHeroStateSnapshot().id, dog.id, "reverse waits for the remounted B:g4 paint");
  assert.equal(paintCurrentSource(fixture), true);
  assert.equal(getHeroStateSnapshot().id, null);
  confirmHeroOverlayCleared(reverseRun);
};

const testLastPhotoSyncAndReverse = () => {
  resetHeroTransitionForVerification();
  const fixture = settleSwipeHero();
  assert.equal(
    updateHeroPhotoSelection({
      id: dog.id,
      sessionToken: fixture.photoSessionToken,
      index: 2,
      imageKey: dog.images[2]!.id,
      source: { uri: dog.images[2]!.url },
    }),
    "synced",
  );
  assert.equal(fixture.appliedIndex(), 2);
  assert.equal(getHeroPhotoSelectionSnapshot(fixture.photoSessionToken)?.index, 2);
  paintCurrentSource(fixture);

  const events: string[] = [];
  assert.equal(
    startReverseHero(dog.id, {
      removeRoute: () => events.push("remove"),
      postHandoff: () => events.push("action"),
    }),
    "started",
  );
  const reverse = getHeroStateSnapshot();
  assert.equal(reverse.source?.uri, dog.images[2]!.url);
  assert.equal(reverse.sourceImageKey, dog.images[2]!.id);
  assert.equal(reverse.chrome?.currentPage, 2);
  assert.deepEqual(reverse.from, photoTo);
  assert.deepEqual(reverse.to, photoFrom);
  assert.deepEqual(reverse.bottomSurfaceLocations, bottomSurfaceLocations);
  assert.deepEqual(reverse.titleFrom, titleTo);
  assert.deepEqual(reverse.titleTo, titleFrom);
  assert.deepEqual(reverse.shadowFrom, NO_HERO_SHADOW);
  assert.deepEqual(reverse.shadowTo, SWIPE_CARD_HERO_SHADOW);
  assert.equal(reverse.topSurfaceFromOpacity, 1);
  assert.equal(reverse.topSurfaceToOpacity, 1);

  markHeroOverlayReady(reverse.runId);
  markHeroMotionStarted(reverse.runId);
  endHero(reverse.runId);
  endHero(reverse.runId);
  assert.deepEqual(events, ["remove"]);
  acknowledgeAllSourceFrames(reverse.runId);
  assert.equal(getHeroStateSnapshot().id, null);
  confirmHeroOverlayCleared(reverse.runId);
  confirmHeroOverlayCleared(reverse.runId);
  assert.deepEqual(events, ["remove", "action"]);
};

const testReverseFreezesPhotoSessionGeneration = () => {
  resetHeroTransitionForVerification();
  const fixture = settleSwipeHero();
  paintCurrentSource(fixture);
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");
  const reverse = getHeroStateSnapshot();
  assert.equal(
    updateHeroPhotoSelection({
      id: dog.id,
      sessionToken: fixture.photoSessionToken,
      index: 1,
      imageKey: dog.images[1]!.id,
      source: { uri: dog.images[1]!.url },
    }),
    "in-flight",
    "queued pagination cannot retarget a reverse that already owns A:g1",
  );
  const selection = getHeroPhotoSelectionSnapshot(fixture.photoSessionToken);
  assert.equal(selection?.imageKey, dog.images[0]!.id);
  assert.equal(selection?.generation, 1);
  assert.equal(getHeroStateSnapshot().sourceImageKey, dog.images[0]!.id);
  finishSwipeReverse(reverse.runId);
  assert.equal(getHeroStateSnapshot().id, null, "frozen A paint hands off without watchdog delay");
  confirmHeroOverlayCleared(reverse.runId);
};

const testPhotoOnlySwipeHeroStillSynchronizes = () => {
  resetHeroTransitionForVerification();
  const sourceInstanceToken = createHeroPhotoSourceInstanceToken();
  let generation = 1;
  let sourceIndex = 0;
  const photoSessionToken = beginHeroPhotoSession({
    id: dog.id,
    sourceInstanceToken,
    index: 0,
    imageKey: dog.images[0]!.id,
    generation,
    source: { uri: dog.images[0]!.url },
    applySourceSelection: (_index, imageKey) => {
      const index = dog.images.findIndex((image) => image.id === imageKey);
      if (index < 0) return null;
      sourceIndex = index;
      generation += 1;
      return { index, generation };
    },
  });
  const runId = startHero({
    id: dog.id,
    source: { uri: dog.images[0]!.url },
    sourceKind: "swipe",
    sourceImageKey: dog.images[0]!.id,
    sourcePhotoGeneration: 1,
    photoSessionToken,
    from: photoFrom,
    shadow: SWIPE_CARD_HERO_SHADOW,
    onReady: () => {},
    onPaintFailure: () => assert.fail("photo-only Swipe fixture overlay must paint"),
  });
  markHeroOverlayReady(runId);
  assert.equal(dispatchHeroForwardNavigation(runId), true);
  registerPhotoBackTargetTuple(runId, { chrome: null });
  assert.equal(
    markHeroTargetPhotoPainted({
      id: dog.id,
      runId,
      imageKey: dog.images[0]!.id,
      uri: dog.images[0]!.url,
      generation: 1,
    }),
    true,
  );
  markHeroMotionStarted(runId);
  endHero(runId);
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "photo", frame: photoTo });
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "goBack", frame: goBackTo });
  assert.equal(
    updateHeroPhotoSelection({
      id: dog.id,
      sessionToken: photoSessionToken,
      index: 2,
      imageKey: dog.images[2]!.id,
      source: { uri: dog.images[2]!.url },
    }),
    "synced",
  );
  assert.equal(sourceIndex, 2);
  markHeroSourcePhotoPainted({
    id: dog.id,
    sourceInstanceToken,
    imageKey: dog.images[2]!.id,
    uri: dog.images[2]!.url,
    generation,
  });
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");
  const reverse = getHeroStateSnapshot();
  assert.equal(reverse.chrome, null, "photo synchronization cannot depend on shared chrome");
  assert.equal(reverse.source?.uri, dog.images[2]!.url);
  assert.equal(reverse.sourcePhotoGeneration, 2);
  markHeroOverlayReady(reverse.runId);
  markHeroMotionStarted(reverse.runId);
  endHero(reverse.runId);
  markHeroSourceFocused({ id: dog.id, runId: reverse.runId });
  assert.equal(
    acknowledgeHeroSourceFrame({
      id: dog.id,
      runId: reverse.runId,
      role: "photo",
      frame: photoFrom,
    }),
    true,
  );
  assert.equal(getHeroStateSnapshot().id, null);
  confirmHeroOverlayCleared(reverse.runId);
};

const testSourcePaintGate = () => {
  resetHeroTransitionForVerification();
  const fixture = settleSwipeHero();
  const events: string[] = [];
  assert.equal(startReverseHero(dog.id, { removeRoute: () => events.push("remove") }), "started");
  const reverse = getHeroStateSnapshot();
  markHeroOverlayReady(reverse.runId);
  markHeroMotionStarted(reverse.runId);
  endHero(reverse.runId);
  acknowledgeAllSourceFrames(reverse.runId);
  assert.equal(getHeroStateSnapshot().id, dog.id, "exact frames cannot bypass source pixel paint");
  assert.equal(
    markHeroSourcePhotoPainted({
      id: dog.id,
      sourceInstanceToken: fixture.sourceInstanceToken,
      imageKey: dog.images[1]!.id,
      uri: dog.images[1]!.url,
      generation: fixture.sourceGeneration() + 1,
    }),
    false,
  );
  assert.equal(getHeroStateSnapshot().id, dog.id);
  assert.equal(paintCurrentSource(fixture), true);
  assert.equal(getHeroStateSnapshot().id, null);
  confirmHeroOverlayCleared(reverse.runId);
  assert.deepEqual(events, ["remove"]);
};

const testStaleSourcePaintCannotReplaceCurrent = () => {
  resetHeroTransitionForVerification();
  const fixture = settleSwipeHero();
  assert.equal(
    updateHeroPhotoSelection({
      id: dog.id,
      sessionToken: fixture.photoSessionToken,
      index: 1,
      imageKey: dog.images[1]!.id,
      source: { uri: dog.images[1]!.url },
    }),
    "synced",
  );
  paintCurrentSource(fixture);
  assert.equal(
    markHeroSourcePhotoPainted({
      id: dog.id,
      sourceInstanceToken: fixture.sourceInstanceToken,
      imageKey: dog.images[0]!.id,
      uri: dog.images[0]!.url,
      generation: 1,
    }),
    false,
    "late A onDisplay must not replace already-painted B",
  );
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");
  const runId = getHeroStateSnapshot().runId;
  markHeroOverlayReady(runId);
  markHeroMotionStarted(runId);
  endHero(runId);
  acknowledgeAllSourceFrames(runId);
  assert.equal(getHeroStateSnapshot().id, null, "B remained paint-ready without a second callback");
  confirmHeroOverlayCleared(runId);
};

const testReorderedMissingAndStaleSelection = () => {
  resetHeroTransitionForVerification();
  const reordered = settleSwipeHero();
  reordered.setSourceOrder([dog.images[2]!, dog.images[0]!, dog.images[1]!]);
  assert.equal(
    updateHeroPhotoSelection({
      id: dog.id,
      sessionToken: reordered.photoSessionToken,
      index: 2,
      imageKey: dog.images[2]!.id,
      source: { uri: dog.images[2]!.url },
    }),
    "reordered",
  );
  assert.equal(reordered.appliedIndex(), 0, "source maps by exact key, not target index");
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "unavailable");

  resetHeroTransitionForVerification();
  const missing = settleSwipeHero();
  missing.setSourceOrder([dog.images[0]!, dog.images[1]!]);
  assert.equal(
    updateHeroPhotoSelection({
      id: dog.id,
      sessionToken: missing.photoSessionToken,
      index: 2,
      imageKey: dog.images[2]!.id,
      source: { uri: dog.images[2]!.url },
    }),
    "missing",
  );
  assert.equal(getHeroPhotoSelectionSnapshot(missing.photoSessionToken), null);
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "unavailable");

  resetHeroTransitionForVerification();
  const stale = settleSwipeHero();
  const newerRun = startHero({
    id: dog.id,
    source: { uri: dog.images[0]!.url },
    sourceKind: "chat",
    sourceImageKey: dog.images[0]!.id,
    from: photoFrom,
  });
  assert.equal(
    updateHeroPhotoSelection({
      id: dog.id,
      sessionToken: stale.photoSessionToken,
      index: 2,
      imageKey: dog.images[2]!.id,
      source: { uri: dog.images[2]!.url },
    }),
    "stale",
  );
  assert.equal(getHeroStateSnapshot().runId, newerRun);
  assert.equal(getHeroStateSnapshot().source?.uri, dog.images[0]!.url);
};

const testChatContentInvalidation = () => {
  resetHeroTransitionForVerification();
  resetSwipeActionFlightForVerification();
  settleChatSourceOwnership();
  assert.equal(isHeroPhotoMutationAllowed(), true);
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");
  let queuedPhotoMutations = 0;
  if (isHeroPhotoMutationAllowed()) queuedPhotoMutations += 1;
  assert.equal(
    queuedPhotoMutations,
    0,
    "a queued Chat photo tap cannot mutate destination pixels after reverse owns the store",
  );
  let boundaryTiltStarts = 0;
  const attemptQueuedBoundaryTilt = () => {
    if (!isHeroPhotoMutationAllowed()) return;
    const token = beginSwipeActionFlight(dog.id);
    if (!token) return;
    boundaryTiltStarts += 1;
  };
  attemptQueuedBoundaryTilt();
  attemptQueuedBoundaryTilt();
  assert.equal(
    boundaryTiltStarts,
    0,
    "queued first/last-image taps cannot begin a tilt token after Chat reverse starts",
  );
  assert.equal(getIsSwipeActionInFlight(), false);
  resetHeroTransitionForVerification();
  const invalidatedRun = settleChatSourceOwnership();
  assert.equal(
    getHeroOwnedForwardRunId({ id: dog.id, sourceKind: "chat" }),
    invalidatedRun,
    "a destination can capture its exact settled Chat generation",
  );
  invalidateHeroForContentChange(dog.id, invalidatedRun);
  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "unavailable");

  resetHeroTransitionForVerification();
  const staleRun = settleChatSourceOwnership();
  const newerRun = settleChatSourceOwnership();
  invalidateHeroForContentChange(dog.id, staleRun);
  assert.equal(
    getHeroOwnedForwardRunId({ id: dog.id, sourceKind: "chat" }),
    newerRun,
    "stale route content cannot revoke a newer settled Chat generation",
  );
  assert.equal(
    startReverseHero(dog.id, { removeRoute: () => {} }),
    "started",
    "the newer Chat snapshot remains reversible after stale content invalidation",
  );

  resetHeroTransitionForVerification();
  const staleGeometryRun = settleChatSourceOwnership();
  const newerGeometryRun = settleChatSourceOwnership();
  invalidateHeroGeometryForScroll({
    id: dog.id,
    photoSessionToken: null,
    forwardRunId: staleGeometryRun,
  });
  assert.equal(
    getHeroOwnedForwardRunId({ id: dog.id, sourceKind: "chat" }),
    newerGeometryRun,
    "stale route geometry cannot revoke a newer settled Chat generation",
  );
  assert.equal(
    startReverseHero(dog.id, { removeRoute: () => {} }),
    "started",
    "the newer Chat snapshot remains reversible after stale geometry invalidation",
  );
};

const testChatTargetOnlyChrome = () => {
  resetHeroTransitionForVerification();
  const runId = startHero({
    id: dog.id,
    source: { uri: dog.images[0]!.url },
    sourceKind: "chat",
    sourceImageKey: dog.images[0]!.id,
    sourcePhotoGeneration: 1,
    from: photoFrom,
    chrome: { dog, pages: dog.images.length, currentPage: 0 },
    onReady: () => {},
    onPaintFailure: () => assert.fail("Chat chrome fixture overlay must paint"),
  });
  markHeroOverlayReady(runId);
  assert.equal(dispatchHeroForwardNavigation(runId), true);
  registerHeroTargetFrame({ id: dog.id, runId, role: "photo", frame: photoTo });
  registerHeroTargetFrame({ id: dog.id, runId, role: "goBack", frame: goBackTo });
  assert.equal(
    areHeroSharedElementsReady(getHeroStateSnapshot()),
    false,
    "Chat waits for target dots/distance even though it has no source chrome",
  );
  registerHeroTargetFrame({ id: dog.id, runId, role: "chrome", frame: chromeTo });
  assert.equal(areHeroSharedElementsReady(getHeroStateSnapshot()), true);
  assert.equal(getHeroStateSnapshot().chromeFrom, null);
  assert.equal(
    markHeroTargetPhotoPainted({
      id: dog.id,
      runId,
      imageKey: dog.images[0]!.id,
      uri: dog.images[0]!.url,
      generation: 1,
    }),
    true,
  );
  markHeroMotionStarted(runId);
  endHero(runId);
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "photo", frame: photoTo });
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "chrome", frame: chromeTo });
  acknowledgeHeroTargetFrame({ id: dog.id, runId, role: "goBack", frame: goBackTo });

  assert.equal(startReverseHero(dog.id, { removeRoute: () => {} }), "started");
  const reverse = getHeroStateSnapshot();
  assert.deepEqual(
    reverse.chromeFrom,
    chromeTo,
    "reverse fades from the fixed target chrome frame",
  );
  assert.equal(reverse.chromeTo, null, "Chat never invents source chrome geometry");
  assert.equal(areHeroSharedElementsReady(reverse), true);
  resetHeroTransitionForVerification();
};

const testReverseWatchdogs = async () => {
  resetHeroTransitionForVerification();
  let fixture = settleSwipeHero();
  let events: string[] = [];
  let result = startReverseHero(dog.id, {
    removeRoute: () => events.push("remove"),
    postHandoff: () => events.push("action"),
  });
  assert.equal(result, "started");
  let reverseRun = getHeroStateSnapshot().runId;
  await delay(760);
  assert.deepEqual(events, [], "pre-paint timeout must not hard-pop the route");
  assert.equal(getHeroStateSnapshot().reverseFallback, "scene");
  assert.equal(getHeroStateSnapshot().overlayReady, false);
  assert.equal(
    getHeroStateSnapshot().settledSourceOwner,
    null,
    "scene fallback releases the settled hold while the opaque profile still covers it",
  );
  assert.equal(isHeroSourceSurfaceHeld(getHeroStateSnapshot(), dog.id), false);
  assert.equal(
    shouldHideHeroEndpointPhoto(getHeroStateSnapshot(), dog.id, true),
    false,
    "scene fallback keeps the complete source painted underneath",
  );
  markHeroOverlayReady(reverseRun);
  assert.equal(
    getHeroStateSnapshot().overlayReady,
    false,
    "late overlay paint cannot steal ownership from a scene fallback",
  );
  completeReverseSceneFallback(reverseRun);
  completeReverseSceneFallback(reverseRun);
  assert.deepEqual(events, ["remove"], "scene fallback removes the route exactly once after fade");
  assert.equal(getHeroStateSnapshot().id, null);
  confirmHeroOverlayCleared(reverseRun);
  confirmHeroOverlayCleared(reverseRun);
  assert.deepEqual(events, ["remove", "action"]);

  resetHeroTransitionForVerification();
  fixture = settleSwipeHero();
  paintCurrentSource(fixture);
  events = [];
  result = startReverseHero(dog.id, {
    removeRoute: () => events.push("remove"),
    postHandoff: () => events.push("action"),
  });
  assert.equal(result, "started");
  reverseRun = getHeroStateSnapshot().runId;
  markHeroOverlayReady(reverseRun);
  markHeroMotionStarted(reverseRun);
  await delay(760);
  assert.deepEqual(
    events,
    ["remove"],
    "lost UI completion enters the normal landed handoff instead of clearing the overlay",
  );
  assert.equal(getHeroStateSnapshot().handoffPending, true);
  assert.equal(getHeroStateSnapshot().reverseFallback, null);
  acknowledgeAllSourceFrames(reverseRun);
  assert.equal(getHeroStateSnapshot().id, null, "normal source acks finish the watchdog handoff");
  confirmHeroOverlayCleared(reverseRun);
  assert.deepEqual(events, ["remove", "action"]);

  resetHeroTransitionForVerification();
  fixture = settleSwipeHero();
  paintCurrentSource(fixture);
  events = [];
  result = startReverseHero(dog.id, {
    removeRoute: () => events.push("remove"),
    postHandoff: () => events.push("action"),
  });
  assert.equal(result, "started");
  reverseRun = getHeroStateSnapshot().runId;
  markHeroOverlayReady(reverseRun);
  markHeroMotionStarted(reverseRun);
  endHero(reverseRun);
  await delay(760);
  assert.deepEqual(events, ["remove"], "post-pop recovery never dispatches a second removal");
  assert.equal(getHeroStateSnapshot().reverseFallback, "handoff");
  assert.equal(
    shouldHideHeroEndpointPhoto(getHeroStateSnapshot(), dog.id, true),
    false,
    "handoff recovery releases covered source endpoints under the landed overlay",
  );
  acknowledgeAllSourceFrames(reverseRun);
  assert.equal(
    getHeroStateSnapshot().id,
    dog.id,
    "late normal acks cannot truncate an in-progress recovery crossfade",
  );
  completeReverseHandoffRecovery(reverseRun);
  completeReverseHandoffRecovery(reverseRun);
  assert.equal(getHeroStateSnapshot().id, null);
  await delay(760);
  assert.deepEqual(
    events,
    ["remove", "action"],
    "lost overlay-removal effect still confirms session/action exactly once",
  );
  confirmHeroOverlayCleared(reverseRun);
  confirmHeroOverlayCleared(reverseRun);
  assert.deepEqual(events, ["remove", "action"]);
};

const testPendingOverlayClearCannotBeDiscardedByNewRuns = async () => {
  let events: string[] = [];
  const finishReverseIntoConfirmationWindow = (postHandoff: () => void) => {
    const fixture = settleSwipeHero();
    paintCurrentSource(fixture);
    const result = startReverseHero(dog.id, {
      removeRoute: () => events.push("old:remove"),
      postHandoff,
    });
    assert.equal(result, "started");
    const runId = getHeroStateSnapshot().runId;
    markHeroOverlayReady(runId);
    markHeroMotionStarted(runId);
    endHero(runId);
    acknowledgeAllSourceFrames(runId);
    assert.equal(getHeroStateSnapshot().id, null, "reverse is waiting only for overlay clear");
    assert.equal(
      isSwipeSurfaceHeroLocked(),
      true,
      "pending overlay removal still owns the surface",
    );
    assert.equal(
      isSwipeDeckMutationHeroLocked(),
      true,
      "pending overlay removal still owns exact source deck geometry",
    );
    return runId;
  };

  resetHeroTransitionForVerification();
  let reentrantForwardRun = 0;
  const firstReverseRun = finishReverseIntoConfirmationWindow(() => {
    events.push("old:action");
    reentrantForwardRun = startHero({
      id: "reentrant-forward",
      source: { uri: "https://example.com/reentrant-forward.jpg" },
      sourceKind: "chat",
      sourceImageKey: "reentrant-forward-image",
      from: photoFrom,
    });
  });
  const pendingDeckIdle = waitForSwipeDeckMutationHeroIdle(100);
  const rejectedOuterRun = startHero({
    id: "outer-forward",
    source: { uri: "https://example.com/outer-forward.jpg" },
    sourceKind: "chat",
    sourceImageKey: "outer-forward-image",
    from: photoFrom,
    onCancel: (reason) => events.push(`outer:${reason}`),
  });
  assert.deepEqual(events, ["old:remove", "outer:superseded", "old:action"]);
  assert.equal(await pendingDeckIdle, true, "pending overlay confirmation publishes deck unlock");
  assert.equal(rejectedOuterRun, reentrantForwardRun);
  assert.equal(
    getHeroStateSnapshot().id,
    "reentrant-forward",
    "outer forward cannot overwrite the run created by the pending completion",
  );
  confirmHeroOverlayCleared(firstReverseRun);
  assert.deepEqual(events, ["old:remove", "outer:superseded", "old:action"]);

  resetHeroTransitionForVerification();
  events = [];
  const nestedDogId = "reentrant-settled";
  const secondReverseRun = finishReverseIntoConfirmationWindow(() => {
    events.push("old:action");
    const nestedForwardRun = startHero({
      id: nestedDogId,
      source: { uri: "https://example.com/reentrant-settled.jpg" },
      sourceKind: "chat",
      sourceImageKey: "reentrant-settled-image",
      sourcePhotoGeneration: 1,
      from: photoFrom,
      onReady: () => {},
      onPaintFailure: () => assert.fail("nested Chat fixture overlay must paint"),
    });
    markHeroOverlayReady(nestedForwardRun);
    assert.equal(dispatchHeroForwardNavigation(nestedForwardRun), true);
    registerPhotoBackTargetTuple(nestedForwardRun, { id: nestedDogId, chrome: null });
    assert.equal(
      markHeroTargetPhotoPainted({
        id: nestedDogId,
        runId: nestedForwardRun,
        imageKey: "reentrant-settled-image",
        uri: "https://example.com/reentrant-settled.jpg",
        generation: 1,
      }),
      true,
    );
    markHeroMotionStarted(nestedForwardRun);
    endHero(nestedForwardRun);
    acknowledgeHeroTargetFrame({
      id: nestedDogId,
      runId: nestedForwardRun,
      role: "photo",
      frame: photoTo,
    });
    acknowledgeHeroTargetFrame({
      id: nestedDogId,
      runId: nestedForwardRun,
      role: "goBack",
      frame: goBackTo,
    });
  });
  let pendingWillStarts = 0;
  assert.equal(
    startReverseHero(nestedDogId, {
      removeRoute: () => events.push("outer:remove"),
      onWillStart: () => pendingWillStarts++,
    }),
    "completion-pending",
    "outer reverse yields to the unconfirmed completion",
  );
  assert.equal(pendingWillStarts, 0, "completion-pending cannot reset a prior reverse clock");
  assert.deepEqual(events, ["old:remove", "old:action"]);
  assert.equal(getHeroStateSnapshot().id, null);
  assert.equal(
    startReverseHero(nestedDogId, {
      removeRoute: () => events.push("retry:remove"),
      onWillStart: () => pendingWillStarts++,
    }),
    "started",
    "the reentrantly settled hero remains available for an explicit retry",
  );
  assert.equal(pendingWillStarts, 1, "the explicit validated retry owns one clock reset");
  confirmHeroOverlayCleared(secondReverseRun);
  assert.deepEqual(events, ["old:remove", "old:action"]);
  resetHeroTransitionForVerification();

  events = [];
  const competingDogId = "competing-dog";
  finishReverseIntoConfirmationWindow(() => {
    events.push("old:action");
    startHero({
      id: competingDogId,
      source: { uri: "https://example.com/competing-dog.jpg" },
      sourceKind: "chat",
      sourceImageKey: "competing-dog-image",
      from: photoFrom,
    });
  });
  const restoredExit = createProfileExitCoordinator();
  let restoredRemovals = 0;
  let restoredHandoffs = 0;
  assert.equal(
    restoredExit.claim({
      nativeRemoval: () => restoredRemovals++,
      postHandoff: () => restoredHandoffs++,
    }),
    "first",
  );
  const restoredCallbacks = restoredExit.commitImmediate();
  assert.ok(restoredCallbacks);
  assert.equal(
    startReverseHero(dog.id, {
      removeRoute: restoredCallbacks.nativeRemoval!,
      postHandoff: restoredCallbacks.postHandoff,
    }),
    "completion-pending",
  );
  assert.equal(restoredExit.restoreBlocked(restoredCallbacks), true);
  assert.equal(getHeroStateSnapshot().id, competingDogId);
  assert.equal(getHeroStateSnapshot().phase, "forward");
  if (getHeroStateSnapshot().phase === null) {
    assert.fail("the restored dog-A exit must not run while dog B owns the global Hero");
  }
  assert.equal(restoredExit.phase(), "idle");
  assert.equal(restoredExit.claim({ nativeRemoval: () => restoredRemovals++ }), "duplicate");
  assert.equal(restoredRemovals, 0);
  assert.equal(restoredHandoffs, 0);
  assert.deepEqual(events, ["old:remove", "old:action"]);
  resetHeroTransitionForVerification();
};

const testIncompleteForwardBackAndNativeFallback = () => {
  resetHeroTransitionForVerification();
  const runId = startHero({
    id: dog.id,
    source: { uri: dog.images[0]!.url },
    sourceKind: "chat",
    sourceImageKey: dog.images[0]!.id,
    from: photoFrom,
  });
  assert.equal(startReverseHero(dog.id, { removeRoute: () => assert.fail() }), "forward-in-flight");
  assert.equal(getHeroStateSnapshot().runId, runId, "Back cannot abandon an unfinished scene");

  resetHeroTransitionForVerification();
  settleSwipeHero();
  clearHeroForNativeFallback(dog.id);
  assert.equal(startReverseHero(dog.id, { removeRoute: () => assert.fail() }), "unavailable");
};

const testReverseWillStartBoundary = () => {
  resetHeroTransitionForVerification();
  const fixture = settleSwipeHero();
  paintCurrentSource(fixture);
  let starts = 0;
  assert.equal(
    startReverseHero(dog.id, {
      removeRoute: () => {},
      onWillStart: () => starts++,
    }),
    "started",
  );
  assert.equal(starts, 1, "the validated reverse invokes its pre-publication boundary once");
  assert.equal(
    startReverseHero(dog.id, {
      removeRoute: () => assert.fail("the competing reverse cannot own removal"),
      onWillStart: () => starts++,
    }),
    "in-flight",
  );
  assert.equal(starts, 1, "an in-flight reverse cannot reset the existing UI clock");

  resetHeroTransitionForVerification();
  const forwardRunId = startHero({
    id: dog.id,
    source: { uri: dog.images[0]!.url },
    sourceKind: "chat",
    sourceImageKey: dog.images[0]!.id,
    from: photoFrom,
  });
  assert.equal(
    startReverseHero(dog.id, {
      removeRoute: () => assert.fail("unfinished forward cannot remove"),
      onWillStart: () => starts++,
    }),
    "forward-in-flight",
  );
  assert.equal(getHeroStateSnapshot().runId, forwardRunId);
  assert.equal(starts, 1, "an unfinished forward cannot reset the motion clock");

  resetHeroTransitionForVerification();
  assert.equal(
    startReverseHero(dog.id, {
      removeRoute: () => assert.fail("unavailable reverse cannot remove"),
      onWillStart: () => starts++,
    }),
    "unavailable",
  );
  assert.equal(starts, 1);

  resetHeroTransitionForVerification();
  const invalidPhotoFixture = settleSwipeHero();
  endHeroPhotoSession(invalidPhotoFixture.photoSessionToken);
  assert.equal(
    startReverseHero(dog.id, {
      removeRoute: () => assert.fail("invalid photo capability cannot remove"),
      onWillStart: () => starts++,
    }),
    "unavailable",
  );
  assert.equal(starts, 1, "invalid photo ownership cannot reset the motion clock");
  resetHeroTransitionForVerification();
};

const testNativeAndManualReverseRace = () => {
  resetHeroTransitionForVerification();
  let fixture = settleSwipeHero();
  paintCurrentSource(fixture);
  let events: string[] = [];
  assert.equal(
    startReverseHero(dog.id, {
      removeRoute: () => events.push("manual-remove"),
      postHandoff: () => events.push("action"),
    }),
    "started",
  );
  let reverseRun = getHeroStateSnapshot().runId;
  clearHeroForNativeFallback(dog.id);
  assert.deepEqual(
    events,
    [],
    "native edge pop cancels pre-removal manual reverse without double-pop",
  );
  assert.equal(getHeroStateSnapshot().id, null);
  confirmHeroOverlayCleared(reverseRun);
  confirmHeroOverlayCleared(reverseRun);
  assert.deepEqual(events, ["action"], "native/manual race posts handoff at most once");

  resetHeroTransitionForVerification();
  fixture = settleSwipeHero();
  paintCurrentSource(fixture);
  events = [];
  assert.equal(
    startReverseHero(dog.id, {
      removeRoute: () => events.push("manual-remove"),
      postHandoff: () => events.push("action"),
    }),
    "started",
  );
  reverseRun = getHeroStateSnapshot().runId;
  markHeroOverlayReady(reverseRun);
  markHeroMotionStarted(reverseRun);
  endHero(reverseRun);
  assert.deepEqual(events, ["manual-remove"]);
  clearHeroForNativeFallback(dog.id);
  assert.equal(
    getHeroStateSnapshot().id,
    dog.id,
    "cleanup cannot cancel a landed manual reverse that already owns route removal",
  );
  acknowledgeAllSourceFrames(reverseRun);
  assert.equal(getHeroStateSnapshot().id, null);
  confirmHeroOverlayCleared(reverseRun);
  confirmHeroOverlayCleared(reverseRun);
  assert.deepEqual(events, ["manual-remove", "action"]);
};

const testSwipeActionFlightOwnership = () => {
  resetSwipeActionFlightForVerification();
  const first = beginSwipeActionFlight();
  assert.ok(first);
  assert.equal(getIsSwipeActionInFlight(), true);
  assert.equal(beginSwipeActionFlight(), null, "a second action cannot own the active flight");
  assert.equal(endSwipeActionFlight("stale-flight"), false);
  assert.equal(
    getIsSwipeActionInFlight(),
    true,
    "a stale failure/completion cannot unlock the owning action",
  );

  let profileOpens = 0;
  if (!getIsSwipeActionInFlight()) profileOpens += 1;
  assert.equal(profileOpens, 0, "X4: exiting A rejects a queued profile/photo interaction");

  assert.equal(endSwipeActionFlight(first), true);
  assert.equal(endSwipeActionFlight(first), false, "completion releases exactly once");
  assert.equal(getIsSwipeActionInFlight(), false);
  if (!getIsSwipeActionInFlight()) profileOpens += 1;
  assert.equal(profileOpens, 1, "B becomes interactive only after the owning action settles");

  const second = beginSwipeActionFlight();
  assert.ok(second);
  assert.notEqual(second, first);
  assert.equal(endSwipeActionFlight(first), false, "late T1 completion cannot unlock T2");
  assert.equal(getIsSwipeActionInFlight(), true);
  assert.equal(endSwipeActionFlight(second), true);
};

const testSwipeRestoreFlightOwnership = async () => {
  resetSwipeActionFlightForVerification();

  const actionA = beginSwipeActionFlight("dog-a", "swipe");
  assert.ok(actionA);
  const restoreA = beginSwipeRestoreFlight("dog-a");
  assert.ok(restoreA);
  assert.notEqual(restoreA, actionA, "restore invalidates A's delayed action settle token");
  assert.equal(endSwipeActionFlight(actionA), false);
  assert.equal(claimSwipeRestoreFlight("dog-a"), null, "pending restore cannot be claimed");
  assert.equal(commitSwipeRestoreFlight("dog-b", restoreA), false);
  assert.equal(commitSwipeRestoreFlight("dog-a", "stale-restore"), false);
  assert.equal(commitSwipeRestoreFlight("dog-a", restoreA), true);
  assert.equal(claimSwipeRestoreFlight("dog-b"), null, "only committed A can claim A's reset");
  assert.equal(claimSwipeRestoreFlight("dog-a"), restoreA);
  assert.equal(claimSwipeRestoreFlight("dog-a"), null, "A's reset is claimed exactly once");
  assert.equal(isSwipeActionFlightOwner(restoreA), true);
  assert.equal(endSwipeActionFlight(restoreA), true);

  const genericTilt = beginSwipeActionFlight();
  assert.ok(genericTilt);
  assert.equal(
    beginSwipeRestoreFlight("dog-a"),
    null,
    "an unkeyed tilt cannot be superseded by a restore",
  );
  assert.equal(isSwipeActionFlightOwner(genericTilt), true);
  assert.equal(endSwipeActionFlight(genericTilt), true);

  const exactDogTilt = beginSwipeActionFlight("dog-a");
  assert.ok(exactDogTilt);
  assert.equal(
    beginSwipeRestoreFlight("dog-a"),
    null,
    "a same-dog boundary tilt is an interaction and cannot be superseded by a restore",
  );
  assert.equal(isSwipeActionFlightOwner(exactDogTilt), true);
  assert.equal(endSwipeActionFlight(exactDogTilt), true);

  const slowActionA = beginSwipeActionFlight("dog-a", "swipe");
  assert.ok(slowActionA);
  assert.equal(endSwipeActionFlight(slowActionA), true);
  const newerActionB = beginSwipeActionFlight("dog-b");
  assert.ok(newerActionB);
  assert.equal(
    beginSwipeRestoreFlight("dog-a"),
    null,
    "slow A failure cannot replace B's newer exact action",
  );
  assert.equal(isSwipeActionFlightOwner(newerActionB), true);
  const waitForB = waitForSwipeActionFlightIdle(100);
  assert.equal(endSwipeActionFlight(newerActionB), true);
  assert.equal(await waitForB, true, "deferred A restoration wakes when B settles");

  const abandonedRestore = beginSwipeRestoreFlight("dog-c");
  assert.ok(abandonedRestore);
  assert.equal(expirePendingSwipeRestoreForVerification(abandonedRestore), true);
  assert.equal(getIsSwipeActionInFlight(), false, "an unclaimed restore cannot leak its lock");

  const committedRestore = beginSwipeRestoreFlight("dog-d");
  assert.ok(committedRestore);
  assert.equal(commitSwipeRestoreFlight("dog-d", committedRestore), true);
  assert.equal(
    expirePendingSwipeRestoreForVerification(committedRestore),
    false,
    "a committed restore survives until its exact handler claims or cancels it",
  );
  assert.equal(endSwipeActionFlight(committedRestore), true);
};

const testSwipeJournalOrderingAndRestore = () => {
  const dogA = { ...dog, id: "dog-a", name: "A" } as SwipeDog;
  const dogB = { ...dog, id: "dog-b", name: "B" } as SwipeDog;
  const cards = [dogA, dogB, dog];
  const sessionId = 41;
  let nextOperation = 0;
  const createState = (): typeof swipeInitialState => ({
    ...swipeInitialState,
    request: { ...swipeInitialState.request, data: cards, loading: false },
    config: { ...swipeInitialState.config, sessionId, swipeJournal: [] },
  });
  const selectorState = (state: typeof swipeInitialState) => ({ dogs: state });
  const visibleIds = (state: typeof swipeInitialState) =>
    getActiveCards(selectorState(state)).map((card) => card.id);
  const request = (state: typeof swipeInitialState, id: string) =>
    swipeReducer(
      state,
      SwipeActions.request({
        deckMember: true,
        id,
        operationId: `operation-${++nextOperation}`,
        swipeType: "INTERESTED" as never,
      }),
    );
  const operationFor = (state: typeof swipeInitialState, id: string) => {
    const entry = state.config.swipeJournal.find((candidate) => candidate.id === id);
    assert.ok(entry, `expected journal operation for ${id}`);
    return entry.operationId;
  };
  const journalSummary = (state: typeof swipeInitialState) =>
    state.config.swipeJournal.map(({ id, status }) => ({ id, status }));
  const success = (state: typeof swipeInitialState, id: string, clearLikeLimit = false) =>
    swipeReducer(
      state,
      SwipeActions.success({
        clearLikeLimit,
        id,
        operationId: operationFor(state, id),
        sessionId,
      }),
    );
  const failure = (state: typeof swipeInitialState, id: string) =>
    swipeReducer(
      state,
      SwipeActions.failure({ id, operationId: operationFor(state, id), sessionId }),
    );
  const restore = (state: typeof swipeInitialState, id: string) =>
    swipeReducer(
      state,
      SwipeActions.restoreDeferred({ id, operationId: operationFor(state, id), sessionId }),
    );
  const undo = (state: typeof swipeInitialState, id: string) =>
    swipeReducer(
      state,
      SwipeActions.swipeBack({ id, operationId: operationFor(state, id), sessionId }),
    );

  const baseState = createState();
  const rejectedNonCurrent = swipeReducer(
    baseState,
    SwipeActions.request({
      deckMember: true,
      id: dogB.id,
      operationId: "rejected-non-current",
      swipeType: "INTERESTED" as never,
    }),
  );
  assert.deepEqual(rejectedNonCurrent, baseState, "only the exact current deck dog may hide");
  const nonDeckState = swipeReducer(
    baseState,
    SwipeActions.request({
      deckMember: false,
      id: dogB.id,
      operationId: "profile-operation",
      swipeType: "INTERESTED" as never,
    }),
  );
  assert.deepEqual(nonDeckState.request.data, baseState.request.data);
  assert.equal(nonDeckState.config.lastCardId, undefined);
  assert.deepEqual(
    visibleIds(nonDeckState),
    cards.map((card) => card.id),
  );
  assert.deepEqual(nonDeckState.config.swipeJournal, [
    {
      deckMember: false,
      id: dogB.id,
      operationId: "profile-operation",
      sessionId,
      status: "pending",
    },
  ]);

  let swipeState = request(createState(), dogA.id);
  assert.deepEqual(
    swipeState.request.data.map((card) => card.id),
    [dogA.id, dogB.id, dog.id],
  );
  assert.deepEqual(swipeState.config.swipeJournal, [
    {
      deckMember: true,
      id: dogA.id,
      operationId: "operation-1",
      sessionId,
      status: "pending",
    },
  ]);
  assert.deepEqual(visibleIds(swipeState), [dogB.id, dog.id]);
  assert.equal(
    getLastCardId(selectorState(swipeState)),
    undefined,
    "pending cards cannot be revealed and re-swiped by Swipe Back",
  );
  const pendingUndoState = undo(swipeState, dogA.id);
  assert.deepEqual(pendingUndoState, swipeState, "the reducer also rejects a pending undo");

  swipeState = request(swipeState, dogB.id);
  assert.deepEqual(
    journalSummary(swipeState),
    [
      { id: dogA.id, status: "pending" },
      { id: dogB.id, status: "pending" },
    ],
    "B acceptance cannot destructively splice unresolved A",
  );
  assert.deepEqual(
    swipeState.request.data.map((card) => card.id),
    [dogA.id, dogB.id, dog.id],
  );
  assert.deepEqual(visibleIds(swipeState), [dog.id]);

  resetHeroTransitionForVerification();
  settleSwipeHero();
  assert.equal(isSwipeDeckMutationHeroLocked(), true, "C's settled profile owns deck geometry");
  swipeState = success(swipeState, dogA.id);
  assert.deepEqual(
    swipeState.request.data.map((card) => card.id),
    [dogA.id, dogB.id, dog.id],
    "success(A) records terminal state but cannot mutate frames under C's settled Hero",
  );
  assert.deepEqual(visibleIds(swipeState), [dog.id]);
  assert.equal(swipeState.config.swipeJournal[0]?.status, "succeeded");
  clearHeroForNativeFallback(dog.id);

  swipeState = request(swipeState, dog.id);
  assert.deepEqual(
    swipeState.request.data.map((card) => card.id),
    [dogB.id, dog.id],
    "the next accepted swipe compacts only terminal, no-longer-undoable A",
  );
  assert.deepEqual(journalSummary(swipeState), [
    { id: dogB.id, status: "pending" },
    { id: dog.id, status: "pending" },
  ]);

  swipeState = request(request(createState(), dogA.id), dogB.id);
  swipeState = success(swipeState, dogB.id);
  swipeState = failure(swipeState, dogA.id);
  assert.equal(
    getLastCardId(selectorState(swipeState)),
    dogB.id,
    "terminal B remains a truthful undo head while failed A is still held",
  );
  swipeState = restore(swipeState, dogA.id);
  assert.deepEqual(
    swipeState.request.data.map((card) => card.id),
    [dogA.id, dog.id],
    "eligible A restoration compacts committed B without ever deleting A",
  );
  assert.deepEqual(swipeState.config.swipeJournal, []);
  assert.deepEqual(visibleIds(swipeState), [dogA.id, dog.id]);
  assert.equal(
    getLastCardId(selectorState(swipeState)),
    undefined,
    "rewinding to older A invalidates B's now-misleading undo head",
  );

  swipeState = request(request(createState(), dogA.id), dogB.id);
  swipeState = failure(swipeState, dogA.id);
  swipeState = failure(swipeState, dogB.id);
  const prematureBRestore = restore(swipeState, dogB.id);
  assert.deepEqual(
    prematureBRestore,
    swipeState,
    "B remains held because revealing it would still leave earlier A current",
  );
  swipeState = restore(swipeState, dogA.id);
  assert.deepEqual(journalSummary(swipeState), [{ id: dogB.id, status: "failed" }]);
  assert.deepEqual(visibleIds(swipeState), [dogA.id, dog.id]);
  swipeState = request(swipeState, dogA.id);
  swipeState = restore(swipeState, dogB.id);
  assert.deepEqual(
    journalSummary(swipeState),
    [{ id: dogA.id, status: "pending" }],
    "B restores only after A leaves and B becomes the exact next card",
  );
  assert.deepEqual(visibleIds(swipeState), [dogB.id, dog.id]);

  swipeState = request(createState(), dogA.id);
  swipeState = success(swipeState, dogA.id);
  assert.equal(getLastCardId(selectorState(swipeState)), dogA.id);
  const undoneOperationId = operationFor(swipeState, dogA.id);
  const staleUndoState = swipeReducer(
    swipeState,
    SwipeActions.swipeBack({
      id: dogB.id,
      operationId: "stale-dog-b-operation",
      sessionId,
    }),
  );
  assert.deepEqual(staleUndoState, swipeState, "a stale exact-id undo cannot reveal another card");
  swipeState = undo(swipeState, dogA.id);
  assert.deepEqual(swipeState.config.swipeJournal, []);
  assert.deepEqual(visibleIds(swipeState), [dogA.id, dogB.id, dog.id]);
  assert.equal(getLastCardId(selectorState(swipeState)), undefined);
  const reswipedState = request(swipeState, dogA.id);
  assert.notEqual(
    operationFor(reswipedState, dogA.id),
    undoneOperationId,
    "a reswipe owns a new exact operation",
  );

  const slowCards = Array.from({ length: 13 }, (_, index) => ({
    ...dog,
    id: `slow-dog-${index + 1}`,
    name: `Slow ${index + 1}`,
  })) as SwipeDog[];
  swipeState = {
    ...createState(),
    request: { ...createState().request, data: slowCards },
  };
  for (const slowDog of slowCards.slice(0, 9)) swipeState = request(swipeState, slowDog.id);
  const currentSlowCard = getActiveCards(selectorState(swipeState))[0];
  const renderableSlowCards = getRenderableCards(selectorState(swipeState));
  assert.equal(currentSlowCard?.id, slowCards[9]?.id);
  assert.ok(
    renderableSlowCards.some((card) => card.id === currentSlowCard?.id),
    "the exact current card remains mounted beyond eight pending operations",
  );
  assert.ok(renderableSlowCards.length <= 8, "slow journal rendering stays bounded");

  const resetAt = new Date(Date.now() + 60_000);
  swipeState = request(createState(), dogA.id);
  swipeState = {
    ...swipeState,
    config: { ...swipeState.config, likeLimitResetAt: resetAt },
  };
  swipeState = success(swipeState, dogA.id);
  swipeState = swipeReducer(
    swipeState,
    SwipeActions.failure({
      id: dogB.id,
      operationId: "missing-operation",
      sessionId,
    }),
  );
  assert.equal(
    swipeState.config.likeLimitResetAt,
    resetAt,
    "an unrelated concurrent success/failure cannot clear A's future like limit",
  );
  const clearingState = request(createState(), dogA.id);
  const clearingStateWithLimit = {
    ...clearingState,
    config: { ...clearingState.config, likeLimitResetAt: resetAt },
  };
  assert.equal(success(clearingStateWithLimit, dogA.id, true).config.likeLimitResetAt, undefined);

  const sessionState = request(createState(), dogA.id);
  const sessionOperationId = operationFor(sessionState, dogA.id);
  const refetchState = dogsReducer(sessionState, DogActions.list.refetch());
  assert.equal(refetchState.request.loading, true);
  assert.deepEqual(refetchState.request.data, sessionState.request.data);
  assert.deepEqual(refetchState.config.swipeJournal, sessionState.config.swipeJournal);
  assert.equal(refetchState.config.sessionId, sessionId, "refetch preserves the active session");
  const loggedOutState = dogsReducer(refetchState, DogActions.logout.logout());
  assert.equal(loggedOutState.config.sessionId, sessionId + 1);
  assert.deepEqual(loggedOutState.request.data, []);
  assert.deepEqual(loggedOutState.config.swipeJournal, []);
  const staleTerminalState = dogsReducer(
    loggedOutState,
    DogActions.swipe.success({
      clearLikeLimit: true,
      id: dogA.id,
      operationId: sessionOperationId,
      sessionId,
    }),
  );
  assert.deepEqual(staleTerminalState, loggedOutState, "old-session terminal cannot mutate logout");
};

const testDeckPromotionCancelsOldHeroOwner = () => {
  resetHeroTransitionForVerification();
  let openingCancellations = 0;
  setHeroSourceOpening("dog-a", true, () => openingCancellations++);
  assert.equal(isSwipeSurfaceHeroLocked(), true);
  let actionStarts = 0;
  if (!isSwipeSurfaceHeroLocked() && beginSwipeActionFlight()) actionStarts += 1;
  assert.equal(actionStarts, 0, "inverse X4: Like cannot start during A profile measurement");
  assert.equal(getIsSwipeActionInFlight(), false);
  cancelNonCurrentSwipeHeroOwner("dog-b");
  assert.equal(openingCancellations, 1);
  assert.equal(isSwipeSurfaceHeroLocked(), false, "B unlocks only after A opening is cancelled");

  const runId = startHero({
    id: "dog-a",
    source: { uri: "https://example.com/a.jpg" },
    sourceKind: "swipe",
    sourceImageKey: "a-image",
    sourcePhotoGeneration: 1,
    from: photoFrom,
  });
  assert.equal(isSwipeSurfaceHeroLocked(), true);
  cancelNonCurrentSwipeHeroOwner("dog-a");
  assert.equal(getHeroStateSnapshot().runId, runId, "current A keeps its forward ownership");
  cancelNonCurrentSwipeHeroOwner("dog-b");
  assert.equal(getHeroStateSnapshot().id, null);
  assert.equal(isSwipeSurfaceHeroLocked(), false);

  resetHeroTransitionForVerification();
  let reentrantOpeningCancellations = 0;
  const reentrantRunId = startHero({
    id: "dog-a",
    source: { uri: "https://example.com/a.jpg" },
    sourceKind: "swipe",
    sourceImageKey: "a-image",
    sourcePhotoGeneration: 1,
    from: photoFrom,
    onReady: () => {},
    onPaintFailure: () => {},
    onCancel: () => setHeroSourceOpening("dog-a", true, () => reentrantOpeningCancellations++),
  });
  setHeroSourceOpening("dog-a", true);
  abandonHero("dog-a", reentrantRunId);
  assert.equal(
    isHeroSourceOpening("dog-a"),
    true,
    "a reentrant same-dog opening acquired by onCancel survives the old run cleanup",
  );
  cancelHeroSourceOpening("dog-a");
  assert.equal(reentrantOpeningCancellations, 1);

  resetHeroTransitionForVerification();
  setHeroSourceOpening(dog.id, true);
  settleSwipeHero();
  assert.equal(
    isSwipeSurfaceHeroLocked(),
    false,
    "forward completion defensively releases a leaked source-opening owner",
  );
  assert.equal(
    isSwipeDeckMutationHeroLocked(),
    true,
    "settled reverse geometry still reserves the covered source deck",
  );
  clearHeroForNativeFallback(dog.id);
  assert.equal(isSwipeDeckMutationHeroLocked(), false);
};

const testSourceInvariants = async () => {
  const [
    overlay,
    store,
    mainCard,
    image,
    personalInfo,
    feedback,
    feedbackStyles,
    actionBar,
    actionBarStyles,
    dogProfile,
    stackLayout,
    chatHeader,
    swipeHandler,
    swipeGesture,
    swipeScreen,
    swipeLock,
    swipeReducerSource,
    swipeSelectors,
    swipeSaga,
    swipeListSaga,
    changeLocation,
    swipeBack,
    swipeFeedback,
    pagination,
    reduceMotion,
    screenReader,
    motion,
    pressable,
    goBack,
    dogProfileStyles,
    exitCoordinatorSource,
    profileExitControllerSource,
    profileSwipeActionsSource,
    profileSwipeIntentSource,
    profileSwipeConsumerSource,
    profileHeroTargetsSource,
    profileHeroPresentationSource,
    renderedProfileDogSource,
    profileRouteHeroOwnershipSource,
    profileScenePresentationSource,
    profileReverseRemovalSource,
  ] = await Promise.all([
    readFile("src/components/HeroTransition/index.tsx", "utf8"),
    readFile("src/components/HeroTransition/store.ts", "utf8"),
    readFile("src/components/MainCard/index.tsx", "utf8"),
    readFile("src/components/Image.tsx", "utf8"),
    readFile("src/components/MainCard/components/PersonalInfo/index.tsx", "utf8"),
    readFile("src/components/FeedbackCard/index.tsx", "utf8"),
    readFile("src/components/FeedbackCard/styles.ts", "utf8"),
    readFile("src/components/MatchActionBar/index.tsx", "utf8"),
    readFile("src/components/MatchActionBar/styles.ts", "utf8"),
    readFile("src/views/DogProfile/index.tsx", "utf8"),
    readFile("src/app/(app)/_layout.tsx", "utf8"),
    readFile("src/views/Chat/components/Header/index.tsx", "utf8"),
    readFile("src/views/(tabs)/Swipe/components/SwipeHandler/index.tsx", "utf8"),
    readFile("src/views/(tabs)/Swipe/components/SwipeHandler/hooks/useSwipeGesture.ts", "utf8"),
    readFile("src/views/(tabs)/Swipe/index.tsx", "utf8"),
    readFile("src/store/swipeActionFlight.ts", "utf8"),
    readFile("src/store/reducers/dogs/swipe.ts", "utf8"),
    readFile("src/store/selectors.ts", "utf8"),
    readFile("src/store/sagas/dogs/swipe.ts", "utf8"),
    readFile("src/store/sagas/dogs/list.ts", "utf8"),
    readFile("src/views/(tabs)/Swipe/components/ChangeLocation.tsx", "utf8"),
    readFile("src/views/(tabs)/Swipe/components/SwipeBackButton/index.tsx", "utf8"),
    readFile("src/views/(tabs)/Swipe/components/SwipeRequestFeedback/index.tsx", "utf8"),
    readFile("src/components/MainCard/components/Pagination/index.tsx", "utf8"),
    readFile("src/hooks/useReduceMotion.ts", "utf8"),
    readFile("src/hooks/useScreenReaderEnabled.ts", "utf8"),
    readFile("src/components/HeroTransition/motion.tsx", "utf8"),
    readFile("src/components/PressableArea.tsx", "utf8"),
    readFile("src/views/DogProfile/components/GoBack/index.tsx", "utf8"),
    readFile("src/views/DogProfile/styles.ts", "utf8"),
    readFile("src/views/DogProfile/exitCoordinator.ts", "utf8"),
    readFile("src/views/DogProfile/hooks/useProfileExitController.ts", "utf8"),
    readFile("src/views/DogProfile/hooks/useProfileSwipeActions.ts", "utf8"),
    readFile("src/store/profileSwipeIntent.ts", "utf8"),
    readFile("src/views/(tabs)/Swipe/components/ProfileSwipeIntentConsumer.tsx", "utf8"),
    readFile("src/views/DogProfile/hooks/useProfileHeroTargets.ts", "utf8"),
    readFile("src/views/DogProfile/hooks/useProfileHeroPresentation.ts", "utf8"),
    readFile("src/views/DogProfile/hooks/useRenderedProfileDog.ts", "utf8"),
    readFile("src/views/DogProfile/hooks/useProfileRouteHeroOwnership.ts", "utf8"),
    readFile("src/views/DogProfile/hooks/useProfileScenePresentation.ts", "utf8"),
    readFile("src/views/DogProfile/hooks/useProfileReverseRemoval.ts", "utf8"),
  ]);

  assert.match(overlay, /styles\.imageFrame[\s\S]*styles\.clippedSurface/);
  assert.match(overlay, /hero\.bottomSurfaceLocations/);
  assert.match(overlay, /topSurfaceStyle/);
  assert.match(overlay, /markHeroMotionStarted\(heroRunId\)/);
  assert.match(overlay, /dispatchHeroForwardNavigation\(heroRunId\)/);
  assert.match(overlay, /titleX\.value = withTiming\(titleTo\.x, config\)/);
  assert.match(overlay, /sourceBio && sourceBioFrame/);
  assert.match(overlay, /numberOfLines=\{sourceBio\.numberOfLines\}/);
  assert.match(
    overlay,
    /colors=\{\[\s*"rgba\(0, 0, 0, \.65\)"/,
    "the flying photo keeps the same contrast-safe top scrim as the real card",
  );
  const sourceBioDissolve =
    overlay.match(/const sourceBioStyle = useAnimatedStyle\(\(\) => \(\{[\s\S]*?\}\)\);/)?.[0] ??
    "";
  assert.match(
    sourceBioDissolve,
    /hero\.phase === "reverse"\s+\? interpolate\(progress\.value, \[0\.65, 1\], \[0, 1\], Extrapolation\.CLAMP\)\s+: interpolate\(progress\.value, \[0, 0\.35\], \[1, 0\], Extrapolation\.CLAMP\)/,
    "the source bio leaves in the first 35% forward and returns only in the final 35% reverse",
  );
  assert.match(overlay, /<GoBack visualOnly/);
  assert.match(overlay, /targetOnlyChromeFrame/);
  assert.match(overlay, /hero\.sourceKind === "chat"/);
  assert.match(overlay, /progressRunId\.current !== heroRunId/);
  assert.match(overlay, /const \[imageAssignedRunId, setImageAssignedRunId\] = useState\(0\)/);
  assert.match(overlay, /const \[hostLaidOutRunId, setHostLaidOutRunId\] = useState\(0\)/);
  assert.match(
    overlay,
    /const overlayVisible =\s+imageAssignedRunId === heroRunId &&\s+hostLaidOutRunId === heroRunId &&\s+!\(hero\.phase === "reverse" && hero\.reverseFallback === "scene"\)/,
    "FWO becomes presentable only when this run owns both the image and laid-out host",
  );
  const overlayPresentationGate =
    overlay.match(
      /useEffect\(\(\) => \{\s+if \(!hero\.phase \|\| !overlayVisible \|\| overlayReady \|\| !heroRunId\) return;[\s\S]*?\}, \[hero\.phase, heroRunId, overlayReady, overlayVisible\]\);/,
    )?.[0] ?? "";
  assert.match(
    overlayPresentationGate,
    /const commitFrame = requestAnimationFrame\(\(\) => \{\s+presentationFrame = requestAnimationFrame\(\(\) => \{[\s\S]*markHeroOverlayReady\(heroRunId\)/,
    "endpoint ownership transfers only after two presented frames",
  );
  assert.match(overlayPresentationGate, /cancelAnimationFrame\(commitFrame\)/);
  assert.match(
    overlayPresentationGate,
    /if \(presentationFrame !== null\) cancelAnimationFrame\(presentationFrame\)/,
    "a phase/run/fallback change cancels the nested presentation frame",
  );
  assert.match(overlay, /isHeroForwardMotionReady\(hero\)/);
  assert.match(stackLayout, /const profileScreenListeners = \(\{ route \}/);
  assert.match(stackLayout, /transitionEnd: \(\{ data \}/);
  assert.match(stackLayout, /listeners=\{profileScreenListeners\}/);
  assert.match(
    stackLayout,
    /markHeroDestinationPresented\(\{ id: params\.id, runId, closing: data\.closing \}\)/,
    "the navigator forwards native open and close events to the exact store contract",
  );
  assert.match(mainCard, /heroRunId: String\(heroRunId\)/);
  assert.match(chatHeader, /heroRunId: String\(heroRunId\)/);
  assert.doesNotMatch(
    overlay,
    /nativeEndpointsPresented/,
    "forward presentation cannot be inferred from JS animation frames",
  );
  assert.match(
    overlay,
    /const \[reverseEndpointsCommittedRunId, setReverseEndpointsCommittedRunId\] = useState\(0\)/,
    "the existing JS commit barrier is scoped to the already-presented reverse source",
  );
  const reverseEndpointCommitGate =
    overlay.match(
      /useEffect\(\(\) => \{\s+if \(hero\.phase !== "reverse" \|\| !sharedElementsReady \|\| !overlayReady \|\| !heroRunId\) return;[\s\S]*?\}, \[hero\.phase, heroRunId, overlayReady, sharedElementsReady\]\);/,
    )?.[0] ?? "";
  assert.match(
    reverseEndpointCommitGate,
    /const commitFrame = requestAnimationFrame\(\(\) => \{\s+presentationFrame = requestAnimationFrame\(\(\) => \{[\s\S]*setReverseEndpointsCommittedRunId\(heroRunId\)/,
    "reverse keeps its endpoint opacity-zero commit barrier",
  );
  assert.match(reverseEndpointCommitGate, /cancelAnimationFrame\(commitFrame\)/);
  assert.match(
    reverseEndpointCommitGate,
    /if \(presentationFrame !== null\) cancelAnimationFrame\(presentationFrame\)/,
    "a phase or run change cancels the reverse commit frame",
  );
  const endpointGatedMotionSections = [
    [
      "photo and shadow",
      overlay.match(
        /\/\/ The photo owns transition completion\.[\s\S]*?(?=\n  \/\/ Distance and pagination)/,
      )?.[0] ?? "",
    ],
    [
      "distance and pagination",
      overlay.match(
        /\/\/ Distance and pagination own a different layout region[\s\S]*?(?=\n  \/\/ Action controls)/,
      )?.[0] ?? "",
    ],
    [
      "action controls",
      overlay.match(
        /\/\/ Action controls share the photo's deadline[\s\S]*?(?=\n  \/\/ Name \+ age)/,
      )?.[0] ?? "",
    ],
    [
      "name and age",
      overlay.match(
        /\/\/ Name \+ age are the same semantic element[\s\S]*?(?=\n  const animatedStyle)/,
      )?.[0] ?? "",
    ],
  ] as const;
  for (const [label, section] of endpointGatedMotionSections) {
    assert.match(
      section,
      /!motionPresentationReady \|\|/,
      `${label} motion cannot start before its direction-specific presentation gate`,
    );
    assert.match(
      section,
      /\n    motionPresentationReady,\n/,
      `${label} motion re-runs when exact presentation ownership arrives`,
    );
  }
  assert.match(overlay, /onLayout=\{\(\) => setHostLaidOutRunId\(heroRunId\)\}/);
  assert.match(overlay, /onDisplay=\{\(\) => setImageAssignedRunId\(heroRunId\)\}/);
  assert.doesNotMatch(
    overlay,
    /onDisplay=\{(?:\(\) =>\s*)?markHeroOverlayReady/,
    "expo-image assignment cannot directly seize endpoint ownership",
  );
  assert.match(
    overlay,
    /<View[\s\S]*?onLayout=\{\(\) => setHostLaidOutRunId\(heroRunId\)\}[\s\S]*?style=\{\[StyleSheet\.absoluteFill, \{ opacity: overlayVisible \? 1 : 0 \}]}[\s\S]*?<Animated\.View[\s\S]*?style=\{\[StyleSheet\.absoluteFill, overlayRecoveryStyle\]}/,
    "plain host presentation stays independent from the nested failure-recovery opacity",
  );
  assert.match(overlay, /completeForwardTargetRecovery/);
  assert.match(overlay, /completeReverseHandoffRecovery/);
  assert.doesNotMatch(
    overlay,
    /readiness-timeout/,
    "the store is the sole owner of forward readiness deadlines so its atomic-batch rearm cannot be undercut",
  );
  assert.match(overlay, /hero\.forwardFallback === "target"/);
  assert.match(overlay, /hero\.forwardGoBackRecoveryMode === "covered"/);
  assert.match(overlay, /getForwardGoBackOcclusionFrame/);
  assert.match(overlay, /getForwardPhotoExposureFrames/);
  const exposureMaskBlock =
    overlay.match(/\{forwardPhotoExposureFrames\.map[\s\S]*?\)\)\}/)?.[0] ?? "";
  assert.match(
    exposureMaskBlock,
    /backgroundColor: theme\.colors\.background/,
    "photo exposure masks use the actually visible theme surface in light and dark",
  );
  assert.doesNotMatch(exposureMaskBlock, /theme\.colors\.black/);
  assert.match(
    overlay,
    /needsOffscreenAlphaCompositing=\{\s*Platform\.OS === "android" \? recoveryActive : undefined\s*\}/,
  );
  assert.match(
    overlay,
    /renderToHardwareTextureAndroid=\{\s*Platform\.OS === "android" \? recoveryActive : undefined\s*\}/,
  );
  assert.doesNotMatch(
    overlay,
    /(?:needsOffscreenAlphaCompositing|renderToHardwareTextureAndroid)=\{\s*Platform\.OS === "android" &&/,
    "iOS must receive undefined rather than an explicit false compositing prop",
  );
  const shadowCarrierBlock =
    overlay.match(/const shadowCarrierColor =[^;]+;\n  const forwardPhotoExposureFrames/)?.[0] ??
    "";
  assert.match(shadowCarrierBlock, /hero\.shadowFrom\.opacity > 0/);
  assert.match(shadowCarrierBlock, /hero\.shadowTo\.opacity > 0/);
  assert.match(shadowCarrierBlock, /hero\.shadowFrom\.elevation > 0/);
  assert.match(shadowCarrierBlock, /hero\.shadowTo\.elevation > 0/);
  assert.match(
    shadowCarrierBlock,
    /\? theme\.colors\.background\s+: "transparent"/,
    "only a semantic shadow/elevation endpoint makes the flying photo carrier opaque",
  );
  assert.doesNotMatch(
    shadowCarrierBlock,
    /sourceKind|"chat"/,
    "shadowless Chat avatars keep the shared carrier transparent",
  );
  assert.match(overlay, /confirmHeroOverlayCleared/);
  assert.match(overlay, /FullWindowOverlay unstable_accessibilityContainerViewIsModal=\{false\}/);
  const heroStatusBarOwner =
    overlay.match(
      /const HeroStatusBarOwner = \(\) => \{[\s\S]*?\n\};\n\n\/\*\*\n \* A transparent native modal/,
    )?.[0] ?? "";
  assert.match(
    heroStatusBarOwner,
    /const photoTravel = hero\.from && hero\.to \? hero\.to\.y - hero\.from\.y : 0;/,
    "status ownership derives from the measured photo path",
  );
  assert.match(
    heroStatusBarOwner,
    /const statusBarGlyphCenterY = Math\.max\(10, insets\.top \* 0\.45\);/,
    "the switch boundary follows the device's real safe-area glyph band",
  );
  assert.match(
    heroStatusBarOwner,
    /\(statusBarGlyphCenterY - hero\.from\.y\) \/ photoTravel/,
    "forward and reverse switch when the photo edge crosses the glyphs",
  );
  assert.match(
    overlay,
    /const STATUS_BAR_FORWARD_PRESENTATION_HYSTERESIS = 0\.28;/,
    "forward switches one measured presentation pose before the unsafe dark-glyph frame",
  );
  assert.match(
    overlay,
    /const STATUS_BAR_REVERSE_PRESENTATION_HYSTERESIS = 0\.15;/,
    "reverse waits until the measured simultaneous-contrast band",
  );
  assert.match(
    heroStatusBarOwner,
    /hero\.phase === "reverse"[\s\S]*\? STATUS_BAR_REVERSE_PRESENTATION_HYSTERESIS[\s\S]*: -STATUS_BAR_FORWARD_PRESENTATION_HYSTERESIS/,
    "the UIKit status owner uses direction-specific presentation hysteresis around the measured crossing",
  );
  assert.match(
    heroStatusBarOwner,
    /Math\.max\(\s*0\.15,\s*Math\.min\(0\.85, rawSwitchProgress \+ presentationOffset\)/,
    "degenerate/off-screen source geometry cannot pin one status style forever",
  );
  assert.match(
    heroStatusBarOwner,
    /activeStatusRunId\.current = hero\.runId;[\s\S]*setPastSwitchPoint\(false\)/,
    "a new hero resets status ownership before paint",
  );
  assert.match(
    heroStatusBarOwner,
    /if \(activeStatusRunId\.current !== runId\) return;[\s\S]*setPastSwitchPoint\(true\)/,
    "a queued callback from a superseded run cannot mutate the current status owner",
  );
  assert.match(
    heroStatusBarOwner,
    /if \(next && !previous\) runOnJS\(commitPastSwitchPoint\)\(hero\.runId\)/,
    "status ownership advances monotonically once within a run",
  );
  assert.match(
    heroStatusBarOwner,
    /return <StatusBar animated=\{false\} style=\{style\} \/>;/,
    "the Hero status-bar owner switches foreground style without fading system glyphs",
  );
  assert.match(overlay, /shadowOpacity: shadowOpacity\.value/);
  assert.match(mainCard, /beginHeroPhotoSession/);
  assert.match(mainCard, /updateHeroPhotoSelection\([\s\S]*setPhotoState/);
  assert.match(mainCard, /advanceHeroPhotoRenderState/);
  assert.match(mainCard, /getHeroPhotoEntrySnapshot\([\s\S]*photoStateRef\.current/);
  assert.match(mainCard, /key=\{getHeroPhotoRenderKey/);
  assert.match(mainCard, /ownedForwardRunRef/);
  assert.match(mainCard, /cancelHeroSourceOpening/);
  assert.match(mainCard, /getIsSwipeActionInFlight\(\)/);
  assert.match(mainCard, /useIsSwipeActionInFlight/);
  assert.match(mainCard, /isSwipeSurfaceHeroLocked\(\)/);
  assert.match(mainCard, /useIsSwipeSurfaceHeroLocked/);
  assert.match(mainCard, /currentPhoto\?\.id \?\? currentPhoto\?\.url/);
  assert.match(mainCard, /useScreenReaderEnabled/);
  assert.match(mainCard, /reduceMotion \|\| screenReaderEnabled/);
  assert.match(mainCard, /beginSwipeActionFlight\(dog\.id\)/);
  assert.match(
    mainCard,
    /const gotoPreviousImage = \(\) => \{\s+if \(!isHeroPhotoMutationAllowed\(\)\) return;/,
    "the previous-image boundary rechecks generic Hero ownership before tilting",
  );
  assert.match(
    mainCard,
    /const gotoNextImage = \(\) => \{\s+if \(!isHeroPhotoMutationAllowed\(\)\) return;/,
    "the next-image boundary rechecks generic Hero ownership before tilting",
  );
  assert.match(mainCard, /BOUNDARY_TILT_WATCHDOG_MS/);
  assert.match(mainCard, /boundaryTiltWatchdogRef/);
  assert.match(
    mainCard,
    /scheduleRecovery\(\);[\s\S]*runOnUI\(settleBoundaryTiltAtRest\)\(token\)/,
    "a lost/interrupted recovery callback already has an exact-token retry armed",
  );
  assert.match(
    mainCard,
    /cancelAnimation\(rotation\);[\s\S]*withSpring\(0,[\s\S]*if \(finished\) runOnJS\(finishBoundaryTilt\)\(token\)/,
  );
  assert.match(
    mainCard,
    /requestAnimationFrame\(\(\) => \{[\s\S]*boundaryTiltTokenRef\.current !== token[\s\S]*if \(!endSwipeActionFlight\(token\)\) return;[\s\S]*clearBoundaryTiltWatchdog\(\)/,
    "the watchdog survives until canonical rotation has painted and exact release succeeds",
  );
  assert.match(
    mainCard,
    /mountedRef\.current = false;[\s\S]*clearBoundaryTiltWatchdog\(\);[\s\S]*endSwipeActionFlight\(token\)/,
    "unmount cancels every timer/frame and releases only its captured tilt token",
  );
  assert.match(
    mainCard,
    /heroTransition === "1" &&\s+heroRunId !== undefined &&\s+\{[\s\S]*heroSceneTransition: "1",[\s\S]*heroRunId: String\(heroRunId\)/,
  );
  assert.match(mainCard, /onReady: \(\) => navigate\("1", startedRunId \?\? undefined\)/);
  assert.match(mainCard, /sourceInteractionLocked/);
  assert.match(mainCard, /bioAnchorRef/);
  assert.match(mainCard, /hideBio=\{hideSourceBio\}/);
  assert.match(mainCard, /sourceBio:/);
  assert.match(
    mainCard,
    /colors=\{\[\s*"rgba\(0, 0, 0, \.65\)"/,
    "the real photo scrim keeps status glyphs readable over pale images",
  );
  assert.match(mainCard, /overlayOwnsSharedEndpoint/);
  assert.match(mainCard, /startPhotoGeneration/);
  assert.match(mainCard, /heroPhotoGeneration: entryPhotoGeneration/);
  assert.match(mainCard, /markHeroTargetPhotoPainted/);
  assert.match(mainCard, /acknowledgeHeroTargetFrame/);
  assert.match(mainCard, /registerHeroTargetFrame/);
  assert.match(mainCard, /role: "photo"/);
  assert.match(mainCard, /role: "chrome"/);
  assert.doesNotMatch(mainCard, /setHero(?:Target|ChromeTarget)\(/);
  assert.match(mainCard, /destinationHeroHandoffRunId/);
  assert.match(mainCard, /activeHero\.forwardRecoveryKind === "placeholder"/);
  assert.match(
    mainCard,
    /shouldFadeLateTargetPhoto \? \(reduceMotion \? 0 : HERO_MORPH_DURATION\)/,
  );
  assert.doesNotMatch(
    mainCard,
    /useHeroRecoveryProgress|endpointRecoveryStyle|sourceDetailsRecoveryStyle/,
    "photo-covered gradients, chrome, title and bio stay full during group crossfade",
  );
  assert.match(image, /onDisplay=\{onDisplay\}/);
  assert.match(image, /onLoad=\{onLoad\}/);
  assert.match(image, /\{ source, onDisplay, onLoad, transition, \.\.\.props \}/);
  assert.match(image, /<AbsoluteImage[\s\S]*transition=\{transition\}/);
  assert.match(personalInfo, /<View>[\s\S]*<LinearGradient[\s\S]*<Container/);
  assert.match(personalInfo, /bioAnchorRef/);
  assert.match(personalInfo, /hideBio/);
  assert.match(
    feedback,
    /const sourceSurfaceHeld = isFirst && isHeroSourceSurfaceHeld\(activeHero, dog\.id, "swipe"\)/,
  );
  assert.match(
    feedback,
    /<ClippedCard\s+\$sourceSurfaceHeld=\{sourceSurfaceHeld\}\s+pointerEvents=\{sourceSurfaceHeld \? "none" : "auto"\}\s+accessibilityElementsHidden=\{sourceSurfaceHeld\}\s+importantForAccessibility=\{sourceSurfaceHeld \? "no-hide-descendants" : "auto"\}/,
    "the whole clipped card is hidden and made inert while the settled source is covered",
  );
  assert.match(feedback, /pointerEvents=\{isFirst \? "auto" : "none"\}/);
  assert.match(feedback, /handoffShadowRecovery/);
  assert.match(feedback, /SWIPE_CARD_HERO_SHADOW\.opacity \* recovery\.value/);
  assert.match(feedbackStyles, /overflow: visible/);
  assert.match(feedbackStyles, /export const ClippedCard[\s\S]*overflow: hidden/);
  assert.match(actionBar, /const SourceHandoffAcknowledgement/);
  assert.match(actionBar, /const TargetHandoffAcknowledgement/);
  assert.match(actionBar, /const targetForwardRunId = useRef<number \| null>\(null\)/);
  assert.match(
    actionBar,
    /const targetMeasurement =[\s\S]*kind: "active" as const[\s\S]*kind: "settled" as const/,
    "the action measurement captures active or post-settle authority before either async boundary",
  );
  assert.match(
    actionBar,
    /targetMeasurement\?\.kind === "active"[\s\S]*registerHeroTargetFrame[\s\S]*targetMeasurement\?\.kind === "settled"[\s\S]*refreshSettledHeroActionFrame/,
    "ordinary registration and deliberate settled refresh use separate APIs",
  );
  assert.match(actionBar, /\$interactionLocked=\{interactionLocked\}/);
  assert.match(actionBar, /getIsSwipeActionInFlight\(\)/);
  assert.match(actionBar, /isSwipeSurfaceHeroLocked\(\)/);
  assert.match(actionBar, /handoffRecovery/);
  assert.match(actionBar, /recoveryStyle/);
  assert.match(actionBar, /activeHero\.forwardFallback === "target"/);
  assert.match(actionBar, /isHeroSourceSurfaceHeld\(activeHero, sharedDogId, "swipe"\)/);
  assert.match(actionBar, /if \(!handoffRecovery\) return \{\}/);
  assert.match(actionBarStyles, /props\.\$hidden \|\| props\.\$interactionLocked/);
  assert.match(
    dogProfile,
    /import \{ useReduceMotion \} from "@\/hooks\/useReduceMotion";/,
    "DogProfile reads the live Reduce Motion preference",
  );
  assert.match(
    dogProfile,
    /import \{ useScreenReaderEnabled \} from "@\/hooks\/useScreenReaderEnabled";/,
    "DogProfile reads the live screen-reader preference",
  );
  assert.match(dogProfile, /const reduceMotion = useReduceMotion\(\);/);
  assert.match(dogProfile, /const screenReaderEnabled = useScreenReaderEnabled\(\);/);
  assert.match(dogProfile, /import \{ useIsFocused \} from "@react-navigation\/native";/);
  assert.match(dogProfile, /const isFocused = useIsFocused\(\);/);
  const routeStableDogBlock = renderedProfileDogSource;
  assert.match(
    routeStableDogBlock,
    /getHeroSharedContentFingerprint\(queryDog, \{\s+locale,\s+formattedAge,\s+formattedDistance,\s+\}\)/,
    "the route fingerprint freezes locale-sensitive shared strings before paint",
  );
  assert.match(
    routeStableDogBlock,
    /const \[renderedDog, setRenderedDog\] = useState\(queryDog\);/,
  );
  assert.equal(
    [...routeStableDogBlock.matchAll(/useLayoutEffect\(\(\) => \{/g)].length,
    2,
    "geometry and query ownership reconcile synchronously before paint",
  );
  assert.match(
    routeStableDogBlock,
    /if \(!isFocused \|\| activeHero\.phase !== null \|\| swipeActionInFlight\) return;/,
    "an unfocused route or any active Hero/action flight defers geometry invalidation",
  );
  assert.match(
    routeStableDogBlock,
    /if \(!isFocused\) return;[\s\S]*if \(activeHero\.phase !== null \|\| swipeActionInFlight\) return;/,
    "shared query pixels stay route-stable until the focused route is globally idle",
  );
  assert.match(
    routeStableDogBlock,
    /pendingDogRef\.current\?\.revision !== pending\.revision/,
    "a superseded query candidate cannot expose or invalidate from a stale layout effect",
  );
  assert.match(
    routeStableDogBlock,
    /heroAtInvalidation\.runId !== activeHero\.runId/,
    "an idle render revalidates the exact Hero generation at the mutation boundary",
  );
  assert.match(
    routeStableDogBlock,
    /invalidateHeroGeometryForScroll\(\{\s+id,\s+photoSessionToken: heroPhotoSessionToken,\s+forwardRunId: getForwardRunId\(\),\s+\}\);\s+router\.setParams\(\{ heroTransition: "0" \}\)/,
    "geometry ownership is invalidated before the changed layout can continue as reversible",
  );
  assert.match(
    routeStableDogBlock,
    /if \(heroPhotoSessionToken\) \{\s+invalidateHeroPhotoSession\(\{ id, sessionToken: heroPhotoSessionToken \}\);\s+\} else \{\s+invalidateHeroForContentChange\(id, getForwardRunId\(\)\);\s+\}\s+router\.setParams\(\{ heroTransition: "0" \}\);\s+publishPendingDog\(\);/,
    "shared query changes invalidate exact ownership and disable Hero before exposing new pixels",
  );
  assert.match(
    profileRouteHeroOwnershipSource,
    /const capturedRef = useRef\(isFocused\);[\s\S]*const forwardRunIdRef = useRef<number \| null>\([\s\S]*getHeroOwnedForwardRunId/,
    "the destination stores an exact forward-generation capability",
  );
  assert.match(
    profileRouteHeroOwnershipSource,
    /if \(capturedRef\.current \|\| !isFocused\) return;\s+capturedRef\.current = true;[\s\S]*forwardRunIdRef\.current = getHeroOwnedForwardRunId/,
    "one focused route captures its own forward generation once instead of reading a newer settled visit",
  );
  assert.match(
    routeStableDogBlock,
    /windowDimensions\.width,[\s\S]*windowDimensions\.height,[\s\S]*windowDimensions\.scale,[\s\S]*windowDimensions\.fontScale,[\s\S]*insets\.top,[\s\S]*insets\.right,[\s\S]*insets\.bottom,[\s\S]*insets\.left,[\s\S]*topInset/,
    "the geometry fingerprint covers the window, font scale, every safe-area edge and action inset",
  );
  assert.match(
    dogProfile,
    /unmatchExitCoordinator\.queue\(\(\) => router\.dismissTo\(SceneName\.Messages\)\)/,
    "Unmatch queues one exact-once reverse exit and stack truncation",
  );
  assert.match(
    dogProfile,
    /\(unmatchMutationOwnedRef\.current \|\| unmatchExitCoordinator\.status\(\) === "pending"\) &&\s+!unmatchExitCoordinator\.isRequestIntent\(intent\)/,
    "only the pending Unmatch coordinator can bypass its mutation/exit ownership gate",
  );
  assert.match(
    profileExitControllerSource,
    /if \(exitRequested\.current\) return "blocked";/,
    "a second exit cannot be accepted while silently dropping its post-handoff",
  );
  assert.match(
    dogProfile,
    /const sceneInteractionLocked =[\s\S]*?swipeActionInFlight \|\|\s+unmatchLoading \|\|\s+returningToTop;/,
    "Unmatch and the scroll-return choreography make every scene interaction inert",
  );
  assert.match(
    profileExitControllerSource,
    /getIsSwipeActionInFlight\(\) \|\| isUnmatchOwnedOrPending\(\)[\s\S]*?event\.preventDefault\(\);/,
    "Android hardware/native removal cannot steal the Unmatch-owned route",
  );
  assert.doesNotMatch(
    dogProfile,
    /router\.push\(SceneName\.Messages\)/,
    "Unmatch cannot leave a matched profile behind Messages in the stack",
  );
  assert.match(profileHeroTargetsSource, /registerHeroTargetFrame/);
  assert.match(profileHeroTargetsSource, /"goBack" \| "title"/);
  assert.match(profileHeroTargetsSource, /publishFrame\("title"/);
  assert.match(profileHeroTargetsSource, /publishFrame\("goBack"/);
  assert.doesNotMatch(dogProfile, /setHero(?:TitleTarget|GoBackTarget)\(/);
  assert.match(profileHeroPresentationSource, /const descriptionOpacity = useSharedValue\(1\);/);
  assert.match(
    profileHeroPresentationSource,
    /const revealDescriptionAfterForward = useRef\(false\);/,
  );
  const profileDescriptionForwardGate =
    profileHeroPresentationSource.match(
      /useEffect\(\(\) => \{\s+const matchingForwardBio = Boolean\([\s\S]*?\}, \[activeHero\.phase, activeHero\.sourceBio, descriptionOpacity, matchingHeroActive\]\);/,
    )?.[0] ?? "";
  assert.match(
    profileDescriptionForwardGate,
    /matchingHeroActive && activeHero\.phase === "forward" && activeHero\.sourceBio/,
    "only a matching forward bio transfer claims the profile description",
  );
  assert.match(
    profileDescriptionForwardGate,
    /if \(matchingForwardBio\) \{\s+revealDescriptionAfterForward\.current = true;\s+cancelAnimation\(descriptionOpacity\);\s+descriptionOpacity\.value = 0;\s+return;\s+\}\s+if \(matchingHeroActive \|\| !revealDescriptionAfterForward\.current\) return;\s+revealDescriptionAfterForward\.current = false;\s+cancelAnimation\(descriptionOpacity\);\s+descriptionOpacity\.value = withTiming\(1, \{ duration: 140 \}\);/,
    "the real profile description stays hidden for the whole matching hero and fades in only after it clears",
  );
  const profileDescriptionReverseFade =
    profileHeroPresentationSource.match(
      /const profileDescriptionHeroStyle = useAnimatedStyle\(\(\) => \{[\s\S]*?\n  \}, \[[\s\S]*?\n  \]\);/,
    )?.[0] ?? "";
  assert.match(
    profileDescriptionReverseFade,
    /matchingHeroActive &&\s+activeHero\.sourceBio &&\s+activeHero\.phase === "reverse" &&\s+activeHero\.reverseFallback !== "scene"/,
    "the reverse description dissolve is disabled when the scene fallback owns the fade",
  );
  assert.match(
    profileDescriptionReverseFade,
    /if \(!realOverlayReverse\) return \{ opacity: descriptionOpacity\.value \};[\s\S]*interpolate\(heroProgress\.value, \[0, 0\.08\], \[1, 0\], Extrapolation\.CLAMP\)/,
    "a real overlay reverse clears the profile description during its first 8%",
  );
  const performClaimedExitBlock =
    profileExitControllerSource.match(
      /const performClaimedExit = useCallback\([\s\S]*?const finishClaimedExit = useCallback/,
    )?.[0] ?? "";
  assert.match(
    performClaimedExitBlock,
    /forceOrdinary \|\| reduceMotionRef\.current \|\| screenReaderEnabledRef\.current[\s\S]*releaseRouteHeroOwnership\(\);[\s\S]*removeRoute\(\);[\s\S]*callbacks\.postHandoff\?\.\(\);/,
    "accessibility exits release exact route ownership and use the ordinary route/action path",
  );
  assert.match(
    performClaimedExitBlock,
    /const result = startReverseHero\(id, \{\s+removeRoute,\s+postHandoff: callbacks\.postHandoff,[\s\S]*onWillStart: \(\) => \{\s+heroProgress\.value = 0;\s+\},\s+\}\)/,
    "the validated top pose enters the existing reverse handoff",
  );
  const beforeStartReverse =
    performClaimedExitBlock.split("const result = startReverseHero")[0] ?? "";
  assert.doesNotMatch(
    beforeStartReverse,
    /heroProgress\.value = 0/,
    "DogProfile cannot reset a competing reverse clock before the store validates ownership",
  );
  assert.match(
    performClaimedExitBlock,
    /if \(result === "started"\) return "accepted";\s+if \(result === "in-flight" \|\| result === "completion-pending"\) return "blocked";/,
    "a reverse owned by another request cannot silently consume this coordinator's callbacks",
  );
  assert.match(
    profileExitControllerSource,
    /if \(result === "blocked"\) \{\s+profileExitCoordinator\.restoreBlocked\(callbacks\);\s+setBlockedExitRetryRevision\(\(revision\) => revision \+ 1\);/,
    "blocked reverse ownership restores the exact first callbacks for a guarded retry",
  );
  assert.match(
    profileExitControllerSource,
    /profileExitCoordinator\.phase\(\) !== "idle"[\s\S]*!isFocused[\s\S]*!navigation\.isFocused\(\)[\s\S]*appStateStatus !== "active"[\s\S]*appStateRef\.current !== "active"[\s\S]*const shouldRevalidateExactHeroPose =[\s\S]*hasExactRouteHeroOwnership\(\);[\s\S]*profileExitCoordinator\.beginReturn\(\)[\s\S]*startScrollReturnRef\.current\?\.\(generation, false\)[\s\S]*const callbacks = profileExitCoordinator\.commitImmediate\(\);[\s\S]*performClaimedExit\(callbacks, false\)[\s\S]*profileExitCoordinator\.restoreBlocked\(callbacks\)/,
    "a blocked first callback retries only while the native route is still focused and its competing Hero owner has changed",
  );
  assert.match(
    profileExitControllerSource,
    /\}, \[\s+activeHeroVersion,\s+appStateStatus,\s+blockedExitRetryRevision,/,
    "the restored first callback retries only after an active-AppState render",
  );
  const requestExitBlock =
    profileExitControllerSource.match(
      /const requestExit = useCallback\([\s\S]*?\n  \);\n\n  useEffect/,
    )?.[0] ?? "";
  assert.match(
    requestExitBlock,
    /if \(exitRequested\.current\) return "blocked";\s+exitRequested\.current = true;\s+const claimResult = profileExitCoordinator\.claim\(\{ nativeRemoval, postHandoff \}\)/,
    "the first request claims both callbacks before any asynchronous scroll return",
  );
  assert.match(
    requestExitBlock,
    /!isFocusedRef\.current \|\| !navigation\.isFocused\(\) \|\| appStateRef\.current !== "active"[\s\S]*return "blocked";[\s\S]*if \(exitRequested\.current\)/,
    "hidden/inactive async exits remain pending before they can claim or navigate",
  );
  assert.match(
    dogProfile,
    /unmatchExitCoordinator\.attempt\([\s\S]*?\}, \[\s+activeHero\.phase,\s+appStateStatus,\s+isFocused,/,
    "pending Unmatch retries when both app activity and route focus can change",
  );
  assert.match(
    requestExitBlock,
    /const shouldPresentExactHeroPose =\s+!reduceMotionRef\.current &&\s+!screenReaderEnabledRef\.current[\s\S]*hasExactRouteHeroOwnership\(\);[\s\S]*if \(shouldPresentExactHeroPose\)/,
    "every exact reversible exit asks the UI thread for a live pose, including threshold-crossing momentum",
  );
  assert.doesNotMatch(
    requestExitBlock,
    /profileScrollOffset\.value|scrollOffset >/,
    "a stale JS offset sample cannot bypass the UI presentation gate",
  );
  assert.match(
    requestExitBlock,
    /profileExitCoordinator\.beginReturn\(\)[\s\S]*startScrollReturnRef\.current\?\.\(generation, false\)/,
  );
  assert.match(renderedProfileDogSource, /invalidateHeroGeometryForScroll/);
  assert.match(profileExitControllerSource, /router\.setParams\(\{ heroTransition: "0" \}\)/);
  assert.match(profileExitControllerSource, /exitRequested/);
  assert.match(profileExitControllerSource, /getHeroStateSnapshot\(\)/);
  assert.match(profileExitControllerSource, /result === "forward-in-flight"/);
  assert.match(profileScenePresentationSource, /completeReverseSceneFallback/);
  assert.match(dogProfile, /reverseSceneRemoving/);
  assert.match(dogProfile, /holdsCompletedReverseScene/);
  assert.match(
    profileExitControllerSource,
    /if \(removalDispatched\.current\) return;\s+removalDispatched\.current = true;/,
    "one reverse request can schedule native route removal only once",
  );
  assert.match(
    profileExitControllerSource,
    /deferReverseRemoval\(dispatchRemoval\);\s+return;/,
    "reverse first commits an opacity-zero target scene instead of removing the route inline",
  );
  const deferredRemovalEffect =
    profileReverseRemovalSource.match(
      /useEffect\(\(\) => \{\s+if \(removalCommit === 0\) return;[\s\S]*?\}, \[removalCommit\]\);/,
    )?.[0] ?? "";
  assert.match(deferredRemovalEffect, /const frame = requestAnimationFrame\(\(\) => \{/);
  assert.match(deferredRemovalEffect, /pendingRemovalRef\.current !== removeRoute/);
  assert.match(
    deferredRemovalEffect,
    /pendingRemovalRef\.current = null;\s+removeRoute\(\);/,
    "native removal runs in the post-commit frame and consumes its callback before dispatch",
  );
  assert.match(profileHeroTargetsSource, /acknowledgeHeroTargetFrame/);
  assert.match(profileHeroTargetsSource, /activeHero\.handoffPending/);
  assert.match(dogProfile, /startPhotoGeneration=\{Number\(heroPhotoGeneration\)\}/);
  assert.match(profileHeroTargetsSource, /Boolean\(activeHero\.title\)/);
  assert.match(profileHeroPresentationSource, /forwardGoBackRecoveryMode === "complement"/);
  assert.match(dogProfile, /style=\{\[hideRealGoBack[\s\S]*goBackRecoveryStyle\]\}/);
  assert.match(dogProfile, /style=\{\[hideProfileTitle[\s\S]*targetRecoveryStyle\]\}/);
  assert.match(profileSwipeActionsSource, /deckMember: false/);
  assert.match(profileSwipeActionsSource, /operationId: createSwipeOperationId\(\)/);
  assert.match(mainCard, /profileSource: "swipe"/);
  assert.match(mainCard, /swipeSessionId: String\(swipeSessionId\)/);
  assert.match(
    profileSwipeActionsSource,
    /state\.dogs\.config\.sessionId !== parsedSessionId \|\|\s+getCurrentCardId\(state\) !== dogId \|\|\s+!queueProfileSwipeIntent/,
    "a swipe-profile reaction transfers only to the exact source dog and Redux session",
  );
  assert.match(
    profileSwipeIntentSource,
    /const token = beginSwipeActionFlight\(input\.dogId, "swipe"\)/,
    "the deferred reaction owns the global swipe lock before the source can accept input",
  );
  assert.match(
    profileSwipeConsumerSource,
    /AppState\.currentState !== "active" \|\|\s+isSwipeSurfaceHeroLocked\(\)/,
    "the source consumer pauses while inactive or covered by the Hero",
  );
  assert.match(
    profileSwipeConsumerSource,
    /neutralFrames < NEUTRAL_PRESENTATION_FRAMES[\s\S]*handler\.gotoDirectionFromProfile[\s\S]*consumeProfileSwipeIntent/,
    "the card presents neutral frames before adopting and consuming the exact reaction",
  );
  assert.match(
    swipeHandler,
    /gotoDirectionFromProfile:[\s\S]*triggerProfileSwipe[\s\S]*actionFlightToken\.current = ownerToken;[\s\S]*requestSwipe\(swipeType, 500, false, ownerToken\)/,
    "the exact source handler adopts the transferred token before starting its swipe",
  );
  assert.match(
    profileScenePresentationSource,
    /if \(holdsCompletedReverseScene\) return \{ opacity: 0 \}/,
    "scene fallback stays transparent when its terminal watchdog clears Hero state",
  );
  assert.match(
    profileScenePresentationSource,
    /!usesHeroScene \|\| matchingHeroActive \|\| !sceneSettled[\s\S]*cancelHeroSourceOpening\(id\)/,
    "the settled destination releases any stale source-opening owner before interaction resumes",
  );
  assert.match(dogProfile, /<S\.Scene/);
  assert.match(profileHeroPresentationSource, /activeHero\.reverseFallback !== "scene"/);
  assert.match(dogProfile, /holdsCompletedReverseScene[\s\S]{0,80}\? sourceStatusStyle/);
  assert.match(
    dogProfile,
    /<StatusBar\s+animated=\{false\}\s+style=\{[\s\S]*?contentUnderStatusBar[\s\S]*?sourceStatusStyle[\s\S]*?"light"/,
    "the scrolled light surface switches to dark native glyphs and returns to light photo glyphs without a crossfade",
  );
  assert.match(
    dogProfileStyles,
    /export const Container = styled\(Animated\.ScrollView\)\.attrs/,
    "DogProfile owns a Reanimated scroll surface",
  );
  assert.match(
    profileExitControllerSource,
    /const profileScrollRef = useAnimatedRef<Animated\.ScrollView>\(\);\s+const profileScrollOffset = useScrollViewOffset\(profileScrollRef\)/,
    "the actual native offset remains available without JS scroll invalidation",
  );
  assert.match(
    profileExitControllerSource,
    /returnScrollActive\.value \? returnScrollDriver\.value : null[\s\S]*scrollTo\(profileScrollRef, 0, Math\.max\(0, nextOffset\), false\)/,
    "the return driver scrolls on the UI thread without native easing overshoot",
  );
  assert.match(
    profileExitControllerSource,
    /returnScrollActive\.value = false;\s+returnScrollRequest\.value = null;\s+cancelAnimation\(returnScrollDriver\)/,
    "every pause, fallback and disposal invalidates the pending UI request before cancellation",
  );
  assert.doesNotMatch(
    dogProfile,
    /handleProfileScroll|scrollInvalidatedReverse/,
    "ordinary profile scrolling preserves the settled Hero snapshot",
  );
  assert.match(
    dogProfile,
    /<S\.Container ref=\{profileScrollRef\} scrollEventThrottle=\{16\}>/,
    "ordinary scroll no longer installs a JS invalidation callback",
  );
  assert.match(
    exitCoordinatorSource,
    /if \(distance <= 0\.5\) return 0;[\s\S]*const minimum = retry \? 100 : 80;[\s\S]*const maximum = retry \? 160 : 220;[\s\S]*const distanceFactor = retry \? 0\.6 : 1\.6;[\s\S]*minimum \+ distance \* distanceFactor/,
    "scroll-return duration is delay-free at top, continuous above tolerance, and bounded over distance",
  );
  const scrollRequestWorklet =
    profileExitControllerSource.match(
      /useAnimatedReaction\(\s+\(\) => returnScrollRequest\.value,[\s\S]*?const startScrollReturn = useCallback/,
    )?.[0] ?? "";
  assert.match(
    scrollRequestWorklet,
    /const liveOffset = Math\.max\(0, profileScrollOffset\.value\);[\s\S]*returnScrollDriver\.value = liveOffset;[\s\S]*returnScrollRequest\.value\?\.nonce !== request\.nonce \|\|[\s\S]*returnScrollRequest\.value\?\.generation !== request\.generation[\s\S]*scrollTo\(profileScrollRef, 0, liveOffset, false\);\s+returnScrollActive\.value = true;/,
    "the UI thread captures live momentum, seeds the driver and freezes that pose before activation",
  );
  assert.match(
    scrollRequestWorklet,
    /if \(liveOffset <= 0\.5\) \{[\s\S]*scrollTo\(profileScrollRef, 0, 0, false\);[\s\S]*runOnJS\(notifyScrollReturnFinished\)\(request\.generation\);[\s\S]*return;/,
    "already-top exits bypass the unreliable zero-distance native timing completion",
  );
  assert.doesNotMatch(
    profileExitControllerSource.match(
      /const startScrollReturn = useCallback\([\s\S]*?startScrollReturnRef\.current = startScrollReturn;/,
    )?.[0] ?? "",
    /returnScrollActive\.value = true|returnScrollDriver\.value = 0/,
    "JS cannot activate a stale zero driver before the UI live-offset capture",
  );
  assert.match(scrollRequestWorklet, /Easing\.out\(Easing\.cubic\)/);
  assert.match(
    scrollRequestWorklet,
    /!returnScrollActive\.value \|\|[\s\S]*returnScrollRequest\.value\?\.nonce !== request\.nonce \|\|[\s\S]*returnScrollRequest\.value\?\.generation !== request\.generation[\s\S]*scrollTo\(profileScrollRef, 0, 0, false\);\s+runOnJS\(notifyScrollReturnFinished\)\(request\.generation\)/,
    "only the current UI request can land zero before JS enters the presentation gate",
  );
  assert.match(
    profileExitControllerSource,
    /const bootstrapDuration = retry \? RETURN_RETRY_MAX_DURATION_MS : RETURN_MAX_DURATION_MS;[\s\S]*returnWatchdogExpiredRef\.current\?\.\(generation\);[\s\S]*bootstrapDuration \+ RETURN_WATCHDOG_GRACE_MS[\s\S]*returnScrollRequest\.value =/,
    "JS arms a conservative watchdog before publishing a fallible UI request",
  );
  assert.match(
    profileExitControllerSource,
    /returnWatchdogExpiredRef\.current\?\.\(generation\);\s+\}, duration \+ RETURN_WATCHDOG_GRACE_MS\)/,
    "the watchdog is armed from the UI-computed live-distance duration",
  );
  assert.match(
    profileExitControllerSource,
    /activeReturnGenerationRef\.current = null;\s+stopScrollReturnMotion\(\);[\s\S]*armReturnWatchdogRef\.current = null;/,
    "unmount invalidates generations and late timer acknowledgements before releasing refs",
  );
  const finishScrollReturnBlock =
    profileExitControllerSource.match(
      /const finishScrollReturn = useCallback\([\s\S]*?finishScrollReturnRef\.current = finishScrollReturn;/,
    )?.[0] ?? "";
  assert.equal(
    [...finishScrollReturnBlock.matchAll(/requestAnimationFrame\(\(\) => \{/g)].length,
    2,
    "reverse waits for two complete top-presentation frames",
  );
  assert.match(
    finishScrollReturnBlock,
    /navigation\.isFocused\(\)[\s\S]*hasExactRouteHeroOwnership\(\)[\s\S]*profileScrollOffset\.value[\s\S]*actualOffset > 0\.5[\s\S]*profileExitCoordinator\.commitReverse\(topPresentationGeneration\)/,
    "the final frame revalidates native focus, exact ownership and the actual top pose before reverse",
  );
  assert.match(
    profileExitControllerSource,
    /const handleReturnWatchdogExpired = useCallback\([\s\S]*profileExitCoordinator\.retry\(generation\)[\s\S]*startScrollReturnRef\.current\?\.\(retryGeneration, true\)/,
    "one watchdog retry asks the UI thread to recapture its actual offset",
  );
  assert.match(
    profileExitControllerSource,
    /AppState\.addEventListener\("change"[\s\S]*pauseScrollReturnWithoutExit\(\)[\s\S]*profileExitCoordinator\.resume\(\)[\s\S]*startScrollReturnRef\.current\?\.\(resumedGeneration, false\)/,
    "backgrounding pauses without snapping and resumes from the live offset",
  );
  assert.match(
    profileExitControllerSource,
    /!isFocusedRef\.current \|\|[\s\S]*!navigation\.isFocused\(\) \|\|[\s\S]*appStateRef\.current !== "active"[\s\S]*if \(getHeroStateSnapshot\(\)\.phase !== null\) return;[\s\S]*profileExitCoordinator\.commitFallback/,
    "ordinary fallback cannot pop above an unfocused/inactive profile or through another global Hero owner",
  );
  assert.match(
    requestExitBlock,
    /const heroSnapshot = getHeroStateSnapshot\(\);[\s\S]*heroSnapshot\.phase !== null/,
    "every active global Hero blocks a new route exit, regardless of dog id",
  );
  assert.match(
    profileExitControllerSource,
    /if \(getHeroStateSnapshot\(\)\.phase !== null\) return;[\s\S]*const callbacks = profileExitCoordinator\.commitImmediate/,
    "a restored first callback waits for the global single-flight store to become idle",
  );
  assert.match(
    profileExitControllerSource,
    /if \(!isFocused\) \{\s+pauseScrollReturnWithoutExit\(\);\s+return;\s+\}[\s\S]*profileExitCoordinator\.phase\(\) !== "paused"[\s\S]*hasExactRouteHeroOwnership\(\)[\s\S]*profileExitCoordinator\.resume\(\)/,
    "focus loss pauses in place and focus regain revalidates before resuming",
  );
  assert.match(
    routeStableDogBlock,
    /if \(isReturningToTop\(\)\) \{[\s\S]*fallbackPendingExit\(\);[\s\S]*return;/,
    "geometry and content reconciliation cannot publish through an active return",
  );
  assert.match(profileExitControllerSource, /Platform\.OS === "ios"[\s\S]*gestureEnabled: false/);
  assert.match(stackLayout, /gestureEnabled: true/);
  assert.match(stackLayout, /heroSceneTransition\?: string/);
  assert.match(stackLayout, /presentation: "transparentModal"/);
  assert.match(chatHeader, /sourceKind: "chat"/);
  assert.match(chatHeader, /sourcePhotoGeneration: 1/);
  assert.match(chatHeader, /heroPhotoGeneration: 1/);
  assert.match(chatHeader, /topSurfaceFromOpacity: 0/);
  assert.match(chatHeader, /topSurfaceToOpacity: 1/);
  assert.match(chatHeader, /chrome: \{ dog, pages: dog\.images\.length, currentPage: 0 \}/);
  assert.match(chatHeader, /useScreenReaderEnabled/);
  assert.match(chatHeader, /reduceMotion \|\| screenReaderEnabled/);
  assert.match(
    chatHeader,
    /heroTransition === "1" &&\s+heroRunId !== undefined &&\s+\{[\s\S]*heroSceneTransition: "1",[\s\S]*heroRunId: String\(heroRunId\)/,
    "chat marks an immutable hero scene only after its overlay-gated navigation is ready",
  );
  assert.match(chatHeader, /onReady: \(\) => navigate\("1", startedRunId \?\? undefined\)/);
  assert.equal(
    [...chatHeader.matchAll(/navigate\("1", startedRunId \?\? undefined\)/g)].length,
    1,
    "only the overlay-ready callback may request a hero scene",
  );
  assert.equal(
    [...chatHeader.matchAll(/heroSceneTransition/g)].length,
    1,
    "chat has no unconditional hero-scene route writer",
  );
  assert.doesNotMatch(
    `${mainCard}\n${chatHeader}\n${dogProfile}`,
    /setParams\(\{[^}]*heroSceneTransition/,
    "the immutable hero-scene route parameter is never mutated after navigation",
  );
  assert.match(chatHeader, /setHeroSourceOpening\(dogId, true, cancelPendingOpening\)/);
  assert.match(chatHeader, /profileInteractionLocked/);
  assert.match(chatHeader, /cancelHeroSourceOpening/);
  assert.match(chatHeader, /ownedForwardRunRef/);
  assert.match(chatHeader, /isHeroSourceSurfaceHeld\(activeHero, dogId, "chat"\)/);
  assert.match(chatHeader, /shouldHideHeroEndpointPhoto\(activeHero, dogId, true, "chat"\)/);
  assert.match(
    chatHeader,
    /releaseHeroSourceOwnership\(\{\s+id: dogId,\s+sourceKind: "chat",\s+forwardRunId: ownedForwardRunRef\.current,\s+\}\);\s+ownedForwardRunRef\.current = null;/,
    "Chat releases the exact owned run before clearing its ABA guard",
  );
  assert.match(
    chatHeader,
    /onUnsafeHandoff: \(\) => router\.setParams\(\{ heroTransition: "0" \}\)/,
  );
  assert.match(mainCard, /onUnsafeHandoff: \(\) => router\.setParams\(\{ heroTransition: "0" \}\)/);
  assert.match(swipeHandler, /beginSwipeActionFlight\(card\.id, "swipe"\)/);
  assert.match(swipeHandler, /deckMember: true/);
  assert.match(swipeHandler, /operationId: createSwipeOperationId\(\)/);
  assert.match(swipeHandler, /claimSwipeRestoreFlight\(card\.id\)/);
  assert.match(swipeHandler, /endSwipeActionFlight/);
  assert.match(swipeHandler, /isSwipeActionFlightOwner\(ownedGestureFlightToken\)/);
  assert.match(swipeHandler, /!swipeActionInFlight/);
  assert.match(swipeHandler, /!swipeHeroLocked/);
  assert.match(swipeHandler, /isSwipeSurfaceHeroLocked\(\)/);
  assert.match(swipeHandler, /finishActionFlight\(\)/);
  assert.match(swipeHandler, /gestureFlight\.current\?\.token === token/);
  assert.doesNotMatch(swipeHandler, /gestureFlightTokens/);
  assert.match(swipeHandler, /mounted\.current = false/);
  assert.match(swipeHandler, /if \(!mounted\.current\)/);
  assert.match(swipeHandler, /!swipeActionInFlight \|\| gestureOwnsActionFlight/);
  assert.match(swipeGesture, /motionInFlight\.value/);
  assert.match(swipeGesture, /motionGeneration\.value !== generation/);
  assert.match(swipeGesture, /panGeneration\.value !== generation/);
  assert.match(swipeGesture, /panGrantRequestInFlight\.value/);
  assert.match(
    swipeGesture,
    /if \(panGrantState\.value !== "granted"\) return;[\s\S]*translation\.x\.value = pendingTranslationX\.value/,
  );
  assert.match(swipeGesture, /runOnJS\(requestGestureGrant\)\(generation\)/);
  assert.match(swipeGesture, /Gesture\.Pan\(\)[\s\S]*\.onStart\(/);
  assert.doesNotMatch(swipeGesture, /Gesture\.Pan\(\)[\s\S]*\.onBegin\(/);
  assert.match(swipeGesture, /runOnJS\(onSwipeRequest\)\(swipeType, ownerToken\)/);
  assert.match(
    swipeGesture,
    /runOnJS\(onSwipeComplete\)\(swipeDirection, ownerToken\);[\s\S]*runOnJS\(safelyEnableWithDelay\)/,
    "the exact B action lease survives its synchronous journal request acceptance",
  );
  assert.match(
    swipeGesture,
    /motionGeneration\.value = generation;[\s\S]*cancelAnimation\(translation\.x\)[\s\S]*cancelAnimation\(translation\.y\)/,
  );
  assert.match(swipeGesture, /resetCompletedAxes\.value === 3/);
  assert.match(swipeGesture, /requestAnimationFrame\(\(\) =>/);
  assert.match(
    swipeGesture,
    /if \(finished === false\)[\s\S]*scheduleResetRetry\)\(generation, ownerToken\)/,
  );
  assert.doesNotMatch(
    swipeGesture,
    /if \(finished === false\)[\s\S]{0,180}notifyPositionResetSettled/,
    "a cancelled noncanonical reset cannot release its exact lease",
  );
  assert.match(swipeGesture, /runOnJS\(cancelEnableTimer\)\(\)/);
  assert.match(swipeGesture, /\.onFinalize\([\s\S]*settleFinalizedGesture/);
  assert.match(swipeScreen, /cancelNonCurrentSwipeHeroOwner\(currentCardId\)/);
  assert.match(swipeScreen, /useSelector\(getRenderableCards\)/);
  assert.doesNotMatch(swipeScreen, /\.slice\(0, MAX_TO_RENDER\)/);
  assert.match(swipeScreen, /pointerEvents=\{swipeHeroLocked \? "none" : "auto"\}/);
  assert.match(swipeScreen, /handler\?\.dogId !== currentCard/);
  assert.match(swipeLock, /activeFlight\?\.token !== token/);
  assert.match(swipeLock, /activeFlight\.dogId !== dogId/);
  assert.match(swipeLock, /waitForSwipeActionFlightIdle/);
  assert.match(swipeLock, /schedulePendingRestoreCleanup/);
  assert.match(swipeLock, /purpose: "interaction" \| "swipe"/);
  assert.match(swipeLock, /activeFlight\.purpose !== "swipe"/);
  assert.match(swipeLock, /phase: "claimed" \| "committed" \| "pending"/);
  assert.match(swipeLock, /commitSwipeRestoreFlight/);
  assert.match(swipeLock, /activeFlight\.phase !== "pending"/);
  assert.match(swipeReducerSource, /swipeJournal: SwipeJournalEntry\[\]/);
  assert.match(swipeReducerSource, /deckMember: boolean/);
  assert.match(swipeReducerSource, /operationId: string/);
  assert.match(swipeReducerSource, /sessionId: number/);
  assert.match(swipeReducerSource, /status: "failed" \| "pending" \| "succeeded"/);
  assert.match(swipeReducerSource, /journalEntry\.status = "succeeded"/);
  assert.match(
    swipeReducerSource,
    /const swipeUserSuccess[\s\S]*journalEntry\.status = "succeeded";[\s\S]*const swipeUserError/,
  );
  assert.doesNotMatch(
    swipeReducerSource.match(/const swipeUserSuccess[\s\S]*?const swipeUserError/)?.[0] ?? "",
    /request\.data =/,
    "an API success cannot compact deck geometry directly",
  );
  assert.match(swipeReducerSource, /currentAfterRestore\?\.id !== payload\.id\) return draft/);
  assert.match(swipeReducerSource, /undoEntry\?\.status !== "succeeded"/);
  assert.match(swipeReducerSource, /draft\.config\.lastCardId !== payload\.id/);
  assert.match(swipeSelectors, /swipeJournal\.filter\(\(entry\) => entry\.deckMember\)/);
  assert.match(swipeSelectors, /undoEntry\?\.status !== "succeeded"/);
  assert.match(swipeSelectors, /RECENT_JOURNAL_TRANSFORMS_TO_RENDER/);
  assert.match(swipeSelectors, /activeCards\.slice\(0, ACTIVE_CARDS_TO_RENDER\)/);
  assert.match(swipeSaga, /yield\* acquireFailedSwipeRestore\([\s\S]*operationId,[\s\S]*sessionId/);
  assert.match(swipeSaga, /yield call\(waitForSwipeDeckMutationHeroIdle, RESTORE_WAIT_SLICE_MS\)/);
  assert.match(swipeSaga, /yield call\(waitForSwipeActionFlightIdle, RESTORE_WAIT_SLICE_MS\)/);
  assert.match(swipeSaga, /entry\.operationId === operationId/);
  assert.match(swipeSaga, /entry\.sessionId === sessionId/);
  assert.match(swipeSaga, /currentAfterRestore\?\.id !== id/);
  assert.match(swipeSaga, /yield take\("\*"\)/);
  assert.match(swipeSaga, /watchSwipeRequestSessions/);
  assert.match(swipeSaga, /yield take\(LogoutAction\.Logout\)/);
  assert.match(swipeSaga, /yield cancel\(sessionTask\)/);
  assert.match(swipeSaga, /yield take\(LogoutAction\.Logout\)[\s\S]*yield cancel\(sessionTask\)/);
  assert.doesNotMatch(swipeSaga, /takeEvery|takeLatest/);
  assert.match(
    swipeListSaga,
    /takeLatest\([\s\S]*ListAction\.RefetchDogsRequest,[\s\S]*ListAction\.FetchDogsRequest/,
  );
  assert.match(swipeSaga, /success\(\{ clearLikeLimit, id, operationId, sessionId \}\)/);
  assert.match(
    swipeSaga,
    /failure\(\{ id[^}]*operationId, sessionId[^}]*\}\)[\s\S]*yield\* acquireFailedSwipeRestore/,
    "failure status is journaled before any cancellable Hero/action wait",
  );
  assert.match(
    swipeSaga,
    /commitSwipeRestoreFlight\(id, deferredToken\)[\s\S]*restoreDeferred\(\{ id, operationId, sessionId \}\)/,
    "restore lease commits before Redux can reveal the exact dog",
  );
  assert.match(
    swipeSaga,
    /if \(stillHeld\) \{[\s\S]*endSwipeActionFlight\(deferredToken\);[\s\S]*continue;/,
    "a reducer-rejected restore releases its exact lease and retries instead of stranding the dog",
  );
  assert.doesNotMatch(
    swipeSaga,
    /if \(!becameIdle\) return null/,
    "bounded wait slices revalidate instead of terminally dropping a failed restore",
  );
  assert.match(changeLocation, /getIsSwipeActionInFlight\(\)/);
  assert.match(changeLocation, /isSwipeSurfaceHeroLocked\(\)/);
  assert.match(changeLocation, /disabled=\{interactionLocked\}/);
  assert.match(swipeBack, /getIsSwipeActionInFlight\(\)/);
  assert.match(swipeBack, /isSwipeSurfaceHeroLocked\(\)/);
  assert.match(
    swipeBack,
    /getLastCardId\(stateBeforeUndo\) !== lastCardId[\s\S]*beginSwipeRestoreFlight\(lastCardId\)[\s\S]*commitSwipeRestoreFlight\(lastCardId, restoreToken\)[\s\S]*operationId: undoEntry\.operationId[\s\S]*sessionId: undoEntry\.sessionId/,
  );
  assert.match(swipeBack, /!canGoBack \|\| interactionLocked/);
  assert.match(swipeBack, /useIsSwipeDeckMutationHeroLocked\(\)/);
  assert.match(
    swipeBack,
    /if \(!canGoBack \|\| heroOwnsDeck \|\| swipeActionInFlight\) return null;[\s\S]*exiting=\{SlideOutRight\} entering=\{SlideInRight\}/,
    "undo animates out for the full profile/deck ownership window and returns after the card settles",
  );
  assert.match(swipeFeedback, /getIsSwipeActionInFlight\(\)/);
  assert.match(swipeFeedback, /isSwipeSurfaceHeroLocked\(\)/);
  assert.match(swipeFeedback, /FeedbackInteractionBoundary/);
  assert.match(swipeFeedback, /pointerEvents=\{interactionLocked \? "none" : "auto"\}/);
  assert.match(pagination, /reduceMotion/);
  assert.match(reduceMotion, /reduceMotionChanged/);
  assert.match(reduceMotion, /generation === activeGeneration/);
  assert.match(reduceMotion, /reduceMotionEnabled = true/);
  assert.match(screenReader, /isScreenReaderEnabled\(\)/);
  assert.match(screenReader, /screenReaderChanged/);
  assert.match(screenReader, /let screenReaderEnabled = true/);
  assert.match(motion, /recovery: SharedValue<number>/);
  assert.match(motion, /useHeroRecoveryProgress/);
  assert.match(pressable, /React\.forwardRef<View, PressableProps>/);
  assert.match(pressable, /<Pressable[\s\S]*ref=\{ref\}/);
  assert.match(goBack, /export type GoBackRef = View/);
  const sharedContentFingerprint =
    store.match(
      /export const getHeroSharedContentFingerprint = \([\s\S]*?\): string => \{[\s\S]*?\n\};/,
    )?.[0] ?? "";
  assert.match(sharedContentFingerprint, /new Date\(dog\.birthDate\)\.getTime\(\)/);
  assert.match(sharedContentFingerprint, /dog\.id/);
  assert.match(sharedContentFingerprint, /dog\.name/);
  assert.match(sharedContentFingerprint, /dog\.bio \?\? null/);
  assert.match(sharedContentFingerprint, /dog\.distance \?\? null/);
  assert.match(sharedContentFingerprint, /dog\.breed\?\.slug \?\? null/);
  assert.match(sharedContentFingerprint, /sharedStrings\.locale/);
  assert.match(sharedContentFingerprint, /sharedStrings\.formattedAge/);
  assert.match(sharedContentFingerprint, /sharedStrings\.formattedDistance/);
  assert.match(
    sharedContentFingerprint,
    /dog\.images\.map\(\(image\) => \[image\.id, image\.url, image\.blurhash \?\? null\]\)/,
    "the stable fingerprint preserves ordered image identity, pixels and placeholder",
  );
  assert.match(
    store,
    /export const getHeroOwnedForwardRunId[\s\S]*settledHero\?\.id === args\.id[\s\S]*return settledHero\.runId/,
    "a route can capture its active or settled forward generation without publishing private Hero state",
  );
  assert.match(
    store,
    /expectedForwardRunId === undefined \|\| settledHero\.runId === expectedForwardRunId/,
    "Chat content invalidation cannot clear a different settled forward generation",
  );
  assert.match(
    store,
    /args\.photoSessionToken != null \|\|[\s\S]*args\.forwardRunId === undefined \|\|[\s\S]*hero\.runId === args\.forwardRunId/,
    "Chat geometry invalidation requires the route generation while Swipe keeps exact-session authority",
  );
  assert.match(store, /"target-handoff"[\s\S]*"target-probe"[\s\S]*"target-recovery"/);
  assert.match(store, /"awaiting-commit"/);
  assert.match(store, /case "awaiting-commit"[\s\S]*fallback\(\)/);
  assert.match(store, /dispatchHeroForwardNavigation/);
  assert.doesNotMatch(
    store.match(
      /export const markHeroOverlayReady[\s\S]*?export const dispatchHeroForwardNavigation/,
    )?.[0] ?? "",
    /runtime\.onReady\(\)/,
    "overlay paint cannot navigate before source opacity commits",
  );
  assert.match(store, /markHeroTargetPhotoPainted/);
  assert.match(store, /state\.sourceImageKey !== args\.imageKey/);
  assert.match(store, /state\.sourcePhotoGeneration !== args\.generation/);
  assert.match(store, /initialTargetRoles: ReadonlySet<HeroTargetRole>/);
  assert.match(store, /pendingTargetFrames: Map<HeroTargetRole, HeroFrame>/);
  assert.match(store, /targetFramesPublished: boolean/);
  const atomicTargetRegistration =
    store.match(
      /export const registerHeroTargetFrame[\s\S]*?\/\*\*\n \* The forward overlay may only release/,
    )?.[0] ?? "";
  assert.match(atomicTargetRegistration, /runtime\.id !== args\.id/);
  assert.match(atomicTargetRegistration, /runtime\.runId !== args\.runId/);
  assert.match(atomicTargetRegistration, /runtime\.motionLanded/);
  assert.match(
    atomicTargetRegistration,
    /for \(const role of runtime\.initialTargetRoles\)[\s\S]*runtime\.targetFramesPublished = true;[\s\S]*setState\(\{[\s\S]*to: frames\.get\("photo"\)![\s\S]*goBackFrame: frames\.get\("goBack"\)!/,
    "the first complete target tuple reaches subscribers through one state update",
  );
  assert.match(
    store,
    /settledHero\.runId !== args\.forwardRunId/,
    "same-dog target callbacks cannot rewrite a different forward snapshot",
  );
  assert.doesNotMatch(
    store,
    /export const setHero(?:Target|ChromeTarget|TitleTarget|GoBackTarget)/,
    "legacy target setters cannot bypass atomic publication",
  );
  const sourceActionRegistration =
    store.match(
      /export const registerHeroActionFrame[\s\S]*?export const refreshSettledHeroActionFrame/,
    )?.[0] ?? "";
  assert.doesNotMatch(
    sourceActionRegistration,
    /role: "target"|settledHero/,
    "source action registration cannot mutate active or settled target geometry",
  );
  assert.match(store, /runtime\.correctedTargetFrames\.clear\(\)/);
  assert.match(store, /forwardGoBackRecoveryMode/);
  assert.match(store, /forwardPhotoCorrection/);
  assert.match(store, /recoveryRequested/);
  assert.match(store, /forwardRecoveryKind: "measured" \| "frozen-frame" \| "placeholder" \| null/);
  assert.match(
    store,
    /runtime\.targetPhotoPainted && runtime\.correctedTargetFrames\.has\("photo"\)/,
  );
  assert.match(store, /setHeroForwardTimerSchedulerForVerification/);
  assert.match(store, /case "target-probe":[\s\S]*beginForwardTerminalRecovery\(runId\)/);
  assert.match(store, /runtime\.targetPhotoPainted \? "frozen-frame" : "placeholder"/);
  assert.match(store, /resolveForwardTargetHandoff\(args\.runId\)/);
  assert.match(store, /onUnsafeHandoff/);
  assert.match(store, /runtime\.onUnsafeHandoff\?\.\(\)/);
  assert.match(
    store,
    /hero\.phase === "forward" && hero\.forwardFallback === "target"[\s\S]*return isForwardSource/,
  );
  assert.match(store, /reverseFallback: "scene" \| "handoff" \| null/);
  assert.match(store, /"scene-fallback" \| "handoff-recovery"/);
  assert.match(store, /case "motion":[\s\S]*endHero\(runId\)/);
  assert.match(store, /case "handoff":[\s\S]*beginReverseHandoffRecovery\(runId\)/);
  assert.match(store, /runtime\.stage !== "handoff"/);
  assert.match(store, /completeReverseSceneFallback/);
  assert.match(store, /completeReverseHandoffRecovery/);
  assert.match(store, /scheduleOverlayClearConfirmation/);
  assert.match(store, /OVERLAY_CLEAR_CONFIRM_WATCHDOG_MS/);
  assert.match(store, /waitForSwipeDeckMutationHeroIdle/);
  assert.match(store, /overlayClearPending !== null/);
  assert.match(
    store,
    /takeOverlayClearPending[\s\S]*discardOverlayClearPending\(\);[\s\S]*setState\(\{\}\)/,
  );
  assert.match(store, /args\.sourceKind === "swipe" && args\.chrome/);
  assert.match(store, /export const releaseHeroSourceOwnership/);
  assert.match(
    store,
    /const activeSourceMatches = sourceKind === undefined \|\| hero\.sourceKind === sourceKind/,
  );
  assert.match(
    store,
    /sourceKind === undefined \|\| hero\.settledSourceOwner\.sourceKind === sourceKind/,
  );
  assert.match(
    store,
    /state\.sourceKind === args\.sourceKind[\s\S]*state\.runId === args\.forwardRunId/,
  );
  assert.match(
    store,
    /settledHero\.sourceKind !== args\.sourceKind[\s\S]*settledHero\.runId !== args\.forwardRunId[\s\S]*owner\.sourceKind !== args\.sourceKind/,
  );
  assert.match(store, /reverse-in-flight/);
  assert.match(store, /"completion-pending"/);
  const reverseStartBoundary =
    store.match(/export const startReverseHero = \([\s\S]*?export const endHero =/)?.[0] ?? "";
  assert.match(
    reverseStartBoundary,
    /callbacks\.onWillStart\?\.\(\);\s+setState\(\{\s+runId,/,
    "the motion reset runs once at the validated synchronous pre-publication boundary",
  );
  assert.equal(
    [...reverseStartBoundary.matchAll(/callbacks\.onWillStart\?\.\(\)/g)].length,
    1,
    "blocked and unavailable reverse outcomes have no clock-reset callback",
  );
  assert.match(store, /openingHeroSources\.size > 0/);
  assert.match(store, /isSwipeDeckMutationHeroLocked[\s\S]*settledHero\?\.sourceKind === "swipe"/);
  assert.doesNotMatch(store, /requestAnimationFrame/, "reverse handoff cannot use RAF guesses");
};

const main = async () => {
  testHeroSharedContentFingerprint();
  testForwardSingleFlight();
  testForwardNativePresentationGate();
  testAtomicInitialTargetFrameCollection();
  testCompleteTargetTuplePresentationWatchdog();
  testSettledActionRefreshGeneration();
  testForwardPhotoExposureGeometry();
  testMeasurementWatchdogDedupe();
  await testMeasurementWatchdogCancellation();
  testPaintGateAndStaleRuns();
  await testForwardPaintTimeoutFallback();
  testSettledSourceOwnershipLifecycle();
  testSettledSourceOwnershipInvalidation();
  testScopedSourceOwnershipRelease();
  testPendingExitCoordinator();
  testProfileExitCoordinator();
  testOpeningOwnershipAndForwardSupersession();
  testReverseOwnershipCannotBeOverwritten();
  await testForwardReadinessAndCompletionWatchdogs();
  await testForwardTargetHandoff();
  testForwardTerminalRecoveryDeadlines();
  testRouteScopedSessionWithoutHero();
  testAtomicPhotoRenderGeneration();
  testSameKeyGenerationPaintGates();
  testLastPhotoSyncAndReverse();
  testReverseFreezesPhotoSessionGeneration();
  testPhotoOnlySwipeHeroStillSynchronizes();
  testSourcePaintGate();
  testStaleSourcePaintCannotReplaceCurrent();
  testReorderedMissingAndStaleSelection();
  testChatTargetOnlyChrome();
  testChatContentInvalidation();
  await testReverseWatchdogs();
  await testPendingOverlayClearCannotBeDiscardedByNewRuns();
  testIncompleteForwardBackAndNativeFallback();
  testReverseWillStartBoundary();
  testNativeAndManualReverseRace();
  testSwipeActionFlightOwnership();
  await testSwipeRestoreFlightOwnership();
  testSwipeJournalOrderingAndRestore();
  testDeckPromotionCancelsOldHeroOwner();
  await testSourceInvariants();
  resetHeroTransitionForVerification();
  resetSwipeActionFlightForVerification();
  process.stdout.write("verify:hero-transition PASS\n");
};

void main();
