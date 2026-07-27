import { get } from "lodash";

type GenericClass = new (...args: never[]) => unknown;

/**
 * Recover a typed error from something the tRPC client threw.
 *
 * `instanceof` only works locally: over the wire the class is gone and all
 * that survives is the `error_code` the server put in the payload, so both
 * paths have to be checked.
 */
export const getError = <
  T extends GenericClass & {
    error_code: string;
  },
>(
  error: unknown,
  instance: T,
): InstanceType<T> | undefined => {
  if (error instanceof instance) {
    return error as InstanceType<T>;
  }

  const errorCode = get(error, "data.error.error_code");

  if (errorCode === instance.error_code) {
    return get(error, "data.error") as InstanceType<T>;
  }

  return undefined;
};
