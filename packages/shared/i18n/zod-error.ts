import type { z } from "zod";

import { t } from "i18next";

import { Namespace } from "./types/types";

const joinValues = (values: readonly unknown[]) =>
  values
    .map((value) => (typeof value === "string" ? `'${value}'` : String(value)))
    .join(" | ");

const receivedType = (input: unknown) => {
  if (typeof input === "number" && Number.isNaN(input)) return "nan";
  if (input === null) return "null";
  if (Array.isArray(input)) return "array";
  return typeof input;
};

const customTranslation = (param: unknown) => {
  if (typeof param === "string") return { key: param, values: {} };
  if (param && typeof param === "object") {
    const data = param as { key?: string; values?: Record<string, unknown> };
    return { key: data.key ?? "errors.custom", values: data.values ?? {} };
  }
  return { key: "errors.custom", values: {} };
};

const pathOptions = (
  issuePath: PropertyKey[] | undefined,
): Record<string, unknown> => {
  const ns = [Namespace.Zod, Namespace.Translation];
  const path = issuePath?.map(String).join(".");
  const options: Record<string, unknown> = path
    ? {
        ns,
        context: "with_path",
        path: t(`paths.${path}`, { ns, defaultValue: path }),
      }
    : { ns };
  return options;
};

const formatTranslation = (
  issue: z.core.$ZodRawIssue<z.core.$ZodIssueInvalidStringFormat>,
) => {
  if ("prefix" in issue)
    return {
      key: "errors.invalid_string.startsWith",
      values: { startsWith: issue.prefix },
    };
  if ("suffix" in issue)
    return {
      key: "errors.invalid_string.endsWith",
      values: { endsWith: issue.suffix },
    };
  const ns = [Namespace.Zod, Namespace.Translation];
  return {
    key: `errors.invalid_string.${issue.format}`,
    values: {
      validation: t(`validations.${issue.format}`, {
        ns,
        defaultValue: issue.format,
      }),
    },
  };
};

/** Keep the existing translation catalog while consuming Zod 4 issue shapes. */
export const localizedZodError: z.core.$ZodErrorMap = (issue) => {
  const ns = [Namespace.Zod, Namespace.Translation];
  const options = pathOptions(issue.path);
  let key: string;
  switch (issue.code) {
    case "invalid_type": {
      const received = receivedType(issue.input);
      key =
        received === "undefined" || received === "null"
          ? `errors.invalid_type_received_${received}`
          : "errors.invalid_type";
      options.expected = t(`types.${issue.expected}`, {
        ns,
        defaultValue: issue.expected,
      });
      options.received = t(`types.${received}`, { ns, defaultValue: received });
      break;
    }
    case "invalid_value":
      key =
        issue.values.length === 1
          ? "errors.invalid_literal"
          : "errors.invalid_enum_value";
      options.expected = JSON.stringify(issue.values[0]);
      options.options = joinValues(issue.values);
      options.received = issue.input;
      break;
    case "too_small":
    case "too_big": {
      const bound = issue.code === "too_small" ? issue.minimum : issue.maximum;
      key = `errors.${issue.code}.${issue.origin}.${issue.inclusive ? "inclusive" : "not_inclusive"}`;
      options[issue.code === "too_small" ? "minimum" : "maximum"] = bound;
      if (typeof bound === "number") options.count = bound;
      break;
    }
    case "invalid_format": {
      const format = formatTranslation(issue);
      ({ key } = format);
      Object.assign(options, format.values);
      break;
    }
    case "custom": {
      const custom = customTranslation(issue.params?.i18n);
      ({ key } = custom);
      Object.assign(options, custom.values);
      break;
    }
    case "invalid_union":
      key = "errors.invalid_union";
      break;
    case "unrecognized_keys":
      key = "errors.unrecognized_keys";
      options.keys = issue.keys.map((value) => `'${value}'`).join(", ");
      options.count = issue.keys.length;
      break;
    case "not_multiple_of":
      key = "errors.not_multiple_of";
      options.multipleOf = issue.divisor;
      break;
    default:
      return undefined;
  }
  // Unknown formats should use Zod's fallback rather than exposing a catalog key.
  const message = t(key, { ...options, defaultValue: "" });
  return typeof message === "string" && message ? message : undefined;
};
