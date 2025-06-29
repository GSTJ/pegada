/* eslint-disable @typescript-eslint/no-explicit-any */
import { get } from "lodash";

type GenericClass = new (...args: any[]) => any;
export const getError = <
  T extends GenericClass & {
    error_code: string;
  }
>(
  error: unknown,
  instance: T
): InstanceType<T> | undefined => {
  if (error instanceof instance) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return error as InstanceType<T>;
  }

  const errorCode = get(error, "data.error.error_code") as string | undefined;

  if (errorCode === instance.error_code) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return get(error, "data.error") as InstanceType<T>;
  }
};
