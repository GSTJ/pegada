import { zodResolver } from "@hookform/resolvers/zod";
import { initI18n } from "@pegada/shared/i18n/i18n";
import {
  dogClientSchema,
  dogCompleteClientSchema,
  dogQuickClientSchema,
} from "@pegada/shared/schemas/dog-schema";
import i18next from "i18next";
import { z } from "zod";

const valid = {
  name: "Nina",
  bio: "Hello",
  gender: "FEMALE" as const,
  images: [{ url: "https://example.com/dog.webp" }],
};
const options = { fields: {}, shouldUseNativeValidation: false };

beforeAll(async () => {
  await initI18n(i18next);
});

it.each([
  [
    "en-US",
    "Name needs at least 2 characters",
    "Please insert at least one image",
    "DD/MM/YYYY",
  ],
  [
    "pt-BR",
    "O nome deve conter pelo menos 2 caracteres",
    "Insira pelo menos uma imagem",
    "DD/MM/AAAA",
  ],
])(
  "keeps %s profile errors in schema and resolver",
  async (language, nameMessage, imageMessage, dateMessage) => {
    await i18next.changeLanguage(language);
    const result = await zodResolver(dogQuickClientSchema)(
      { ...valid, name: "N", images: [] },
      {},
      options,
    );
    expect(result.errors).toMatchObject({ name: { message: nameMessage } });
    expect(result.errors).toMatchObject({ images: { message: imageMessage } });
    const date = await zodResolver(dogCompleteClientSchema)(
      { birthDate: "invalid" },
      {},
      options,
    );
    expect(date.errors).toMatchObject({ birthDate: { message: dateMessage } });
  },
);

it("preserves successful transforms, nulls and optional fields", async () => {
  const result = await zodResolver(dogClientSchema)(
    { ...valid, weight: "12", birthDate: "01/01/2020", size: null },
    {},
    options,
  );
  expect(result.errors).toEqual({});
  expect(result.values).toMatchObject({
    weight: 12,
    birthDate: new Date(2020, 0, 1).toISOString(),
    size: null,
  });
  expect(
    dogCompleteClientSchema.parse({ birthDate: "", breedId: null }),
  ).toEqual({ birthDate: "", breedId: null });
});

it.each([
  [
    "en-US",
    [
      "Expected string, received number",
      "Invalid enum value. Expected 'MALE' | 'FEMALE', received 'other'",
      "Invalid email",
      "String must contain at least 5 character(s)",
    ],
  ],
  [
    "pt-BR",
    [
      "O dado deve ser do tipo string, porém foi enviado number",
      "Enum no formato inválido. Foi esperado 'MALE' | 'FEMALE', porém foi recebido 'other'",
      "E-mail inválido",
      "Texto deve conter pelo menos 5 caracter(es)",
    ],
  ],
])(
  "translates generic errors in %s without v3 runtime APIs",
  async (language, messages) => {
    await i18next.changeLanguage(language);
    const cases = [
      [z.string(), 42],
      [z.enum(["MALE", "FEMALE"]), "other"],
      [z.string().email(), "bad"],
      [z.string().min(5), "a"],
    ] as const;
    for (const [index, [schema, input]] of cases.entries()) {
      const result = schema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(messages[index]);
    }
  },
);

it("rejects oversized collections before validating their elements", () => {
  const validateElement = jest.fn();
  const result = z
    .array(z.string().superRefine(validateElement))
    .max(1)
    .safeParse(Array.from({ length: 10_000 }, () => "dog"));
  expect(result.success).toBe(false);
  expect(validateElement).not.toHaveBeenCalled();
});

it.each(["en-US", "pt-BR"])(
  "identifies failed numeric coercion in %s",
  async (language) => {
    await i18next.changeLanguage(language);
    const result = await zodResolver(dogClientSchema)(
      { ...valid, weight: "invalid" },
      {},
      options,
    );
    expect(result.errors).toMatchObject({
      weight: { message: expect.stringContaining("nan") },
    });
  },
);
