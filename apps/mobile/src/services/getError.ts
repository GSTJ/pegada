import { get } from "lodash";

type GenericClass = new (...args: any[]) => any;
export const getError = <
  T extends GenericClass & {
    error_code: string;
  }
>(
  error: any,
  instance: T
): InstanceType<T> | undefined => {
  if (error instanceof instance) {
    return error;
  }

  const errorCode = get(error, "data.error.error_code");

  if (errorCode === instance.error_code) {
    return error.data.error;
  }
};
