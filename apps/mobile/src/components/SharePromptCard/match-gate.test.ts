import { getData, storeData } from "@/services/storage";

import { runMatchSharePrompt } from "./match-gate";

// The key is spelled out rather than pulled from the real module: importing
// it drags in `expo-secure-store`, which ships untransformed ESM and takes
// the suite down before the first assertion.
jest.mock<Record<string, unknown>>("@/services/storage", () => ({
  StorageKeys: { FirstMatchSharePrompt: "firstMatchSharePrompt" },
  getData: jest.fn(),
  storeData: jest.fn(),
}));

const mockGetData = jest.mocked(getData);
const mockStoreData = jest.mocked(storeData);

beforeEach(() => {
  mockGetData.mockResolvedValue(null);
  mockStoreData.mockResolvedValue("shown");
});

test("shows the prompt on the first match it is offered", async () => {
  const show = jest.fn();

  await expect(runMatchSharePrompt(show)).resolves.toBe(true);

  expect(show).toHaveBeenCalledTimes(1);
  expect(mockStoreData).toHaveBeenCalledWith("firstMatchSharePrompt", "shown");
});

test("never shows it again once the flag is stored", async () => {
  mockGetData.mockResolvedValue("shown");
  const show = jest.fn();

  await expect(runMatchSharePrompt(show)).resolves.toBe(false);

  expect(show).not.toHaveBeenCalled();
  expect(mockStoreData).not.toHaveBeenCalled();
});

/**
 * Both exits from the match screen await an interstitial before they get
 * here, so two dismissals can overlap. The flag has to be written before the
 * prompt is shown, or the second one reads `null` and shows a second sheet.
 */
test("stores the flag before showing, so an overlapping dismissal is gated", async () => {
  const order: string[] = [];
  mockStoreData.mockImplementation(async () => {
    order.push("store");
    return "shown";
  });

  await runMatchSharePrompt(() => order.push("show"));

  expect(order).toStrictEqual(["store", "show"]);
});
