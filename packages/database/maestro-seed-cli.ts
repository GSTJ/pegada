/**
 * Command line entry point for the Maestro seed. See maestro-seed.ts for what
 * each command writes.
 *
 * Split out of that file so the seed can be imported from a test: this module
 * reads `import.meta`, which the API package's jest transform (CommonJS)
 * refuses to parse, and one unparseable line at the bottom of the file made
 * the whole fixture untestable.
 *
 *   pnpm -F @pegada/database maestro:seed
 *   pnpm -F @pegada/database maestro:reset-match
 *   pnpm -F @pegada/database maestro:seed-delete-me
 *   pnpm -F @pegada/database maestro:purge-delete-me
 *   pnpm -F @pegada/database maestro:check-delete-me
 */

import prisma from ".";
import {
  DELETE_ME_EMAIL,
  deleteMeExists,
  purgeDeleteMeUser,
  resetMatchMePreLike,
  seedDeleteMeUser,
  seedMaestroFixtures,
} from "./maestro-seed";

const command = process.argv[2] ?? "seed";

const run = async () => {
  if (command === "seed") {
    console.log(JSON.stringify(await seedMaestroFixtures(), null, 2));
  } else if (command === "reset-match") {
    const { rex, matchMe } = await resetMatchMePreLike();
    console.log(
      `[maestro-seed] reset the ${rex.name}<->${matchMe.name} match and re-created the pre-like`,
    );
  } else if (command === "seed-delete-me") {
    await seedDeleteMeUser();
    console.log(`[maestro-seed] seeded ${DELETE_ME_EMAIL}`);
  } else if (command === "purge-delete-me") {
    await purgeDeleteMeUser();
    console.log(`[maestro-seed] purged ${DELETE_ME_EMAIL}`);
  } else if (command === "check-delete-me") {
    const exists = await deleteMeExists();
    console.log(`[maestro-seed] ${DELETE_ME_EMAIL} exists=${exists}`);
    if (exists) process.exit(1);
  } else {
    console.error(
      `[maestro-seed] unknown command "${command}" — use seed|reset-match|seed-delete-me|purge-delete-me|check-delete-me`,
    );
    process.exit(1);
  }
};

run()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
