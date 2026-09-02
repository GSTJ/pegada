import prisma from "@pegada/database";

import { getSubscriptionMetrics } from "../services/subscription-metrics-service";

/**
 * The monthly churn readout.
 *
 *   pnpm api metrics:subscriptions
 *   pnpm api metrics:subscriptions --from 2026-09-01 --to 2026-09-30
 *
 * Prints the counts as JSON and exits. Sandbox events are left out unless
 * `--include-sandbox` is passed.
 */

const DAYS = 30;
const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;

const readFlag = (argv: string[], flag: string) => {
  const index = argv.indexOf(`--${flag}`);

  return index === -1 ? undefined : argv[index + 1];
};

const parseDate = (value: string | undefined, flag: string, fallback: Date) => {
  if (!value) return fallback;

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError(`--${flag} is not a date: ${value}`);
  }

  return parsed;
};

/**
 * `--to 2026-09-30` reads as the whole of the 30th. A bare date parses to
 * midnight, which would silently drop that day's events from a month report.
 */
const endOfDay = (value: string | undefined, parsed: Date) => {
  const isBareDate = value !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(value);

  return isBareDate
    ? new Date(parsed.getTime() + MILLISECONDS_IN_A_DAY - 1)
    : parsed;
};

const report = async () => {
  const argv = process.argv.slice(2);
  const now = new Date();

  const from = parseDate(
    readFlag(argv, "from"),
    "from",
    new Date(now.getTime() - DAYS * MILLISECONDS_IN_A_DAY),
  );
  const toFlag = readFlag(argv, "to");
  const to = endOfDay(toFlag, parseDate(toFlag, "to", now));

  const metrics = await getSubscriptionMetrics({
    from,
    to,
    includeSandbox: argv.includes("--include-sandbox"),
  });

  console.log(
    JSON.stringify(
      { from: from.toISOString(), to: to.toISOString(), ...metrics },
      null,
      2,
    ),
  );
};

const main = async () => {
  try {
    await report();
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
