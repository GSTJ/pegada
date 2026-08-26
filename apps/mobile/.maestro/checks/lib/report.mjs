/** Pass/fail reporting shared by the post-checks that measure geometry. */

export const fail = (tag, message) => {
  console.error(`[${tag}] FAIL - ${message}`);
  process.exit(1);
};

export const pass = (tag, message) => {
  console.log(`[${tag}] PASS - ${message}`);
};
