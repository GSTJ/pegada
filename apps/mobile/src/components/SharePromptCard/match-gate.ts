import { getData, StorageKeys, storeData } from "@/services/storage";

/**
 * Runs `show` the first time a new-match screen is dismissed without the
 * review prompt having claimed that moment, and never again.
 *
 * The caller decides whether the moment is free; this only enforces "once per
 * install". In practice the review prompt takes the first match and this
 * takes the next one, which is why the storage key still says `firstMatch`:
 * renaming it would read as unset on every device that already has the flag
 * and ask those users a second time.
 *
 * The flag is written BEFORE `show`, not after: both exits from the match
 * screen are async (they wait on an interstitial), so two dismissals can be
 * in flight at once, and a flag written afterwards would let the second one
 * read `null` and show a second prompt. Writing first means the worst case is
 * a prompt that never appears, rather than one that appears twice, and the
 * whole point of the gate is that this is a one-shot ask.
 */
export const runMatchSharePrompt = async (show: () => void) => {
  if (await getData(StorageKeys.FirstMatchSharePrompt)) return false;

  await storeData(StorageKeys.FirstMatchSharePrompt, "shown");
  show();

  return true;
};
