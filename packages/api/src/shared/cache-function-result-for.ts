export const cacheFunctionResultFor = <
  // oxlint-disable-next-line typescript/no-explicit-any -- A generic cache wrapper has to accept any function signature.
  T extends (...props: any[]) => any,
>(
  fn: T,
  ms: number,
) => {
  const cache = new Map();

  return (async (...args: unknown[]) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      const [value, timestamp] = cache.get(key);

      if (Date.now() - timestamp < ms) {
        return value;
      }
    }

    const value = await fn(...args);
    cache.set(key, [value, Date.now()]);

    return value;
  }) as unknown as T;
};
