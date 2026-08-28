import { formatDate } from ".";

// The module only needs `i18n.language` and `i18n.t` to choose a branch; the
// rest of the app's i18n bootstrap has no business running here.
jest.mock<Record<string, unknown>>("@/i18n", () => ({
  __esModule: true,
  default: {
    language: "en-US",
    t: (key: string) => key,
  },
}));

// Nothing renders in this file, but importing the component pulls both in.
jest.mock<{ View: string }>("react-native", () => ({ View: "div" }));
jest.mock<Record<string, unknown>>("./styles", () => ({
  DateText: "span",
  styles: {},
}));

const NOW = new Date("2026-08-26T12:00:00.000Z");

beforeAll(() => {
  jest.useFakeTimers().setSystemTime(NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

describe("chat day separator", () => {
  // The bug: the date-fns pattern was "EEE., d MMM", and `.` is a literal in a
  // date-fns pattern rather than an escape — so en-US rendered "Fri., 31 Jul"
  // and pt-BR, whose own abbreviation already ends in a period, rendered
  // "sex.., 31 de jul".
  it("formats an older day this year without a stray abbreviation dot", () => {
    expect(formatDate(new Date("2026-07-31T17:12:00.000Z"))).toBe(
      "Fri, 31 Jul",
    );
  });

  it("still says Today and Yesterday", () => {
    expect(formatDate(new Date("2026-08-26T09:00:00.000Z"))).toBe("chat.today");
    expect(formatDate(new Date("2026-08-25T09:00:00.000Z"))).toBe(
      "chat.yesterday",
    );
  });

  it("names the weekday inside the current week", () => {
    expect(formatDate(new Date("2026-08-24T09:00:00.000Z"))).toBe("Monday");
  });

  it("falls back to a full date for other years", () => {
    expect(formatDate(new Date("2025-03-04T09:00:00.000Z"))).toBe(
      "4 Mar, 2025",
    );
  });
});
