import { createId } from "@paralleldrive/cuid2";

import { breedData } from "./breed-data";

const shihtzuId = breedData.find((breed) => breed.name === "Shih-tzu")
  ?.id as string;

export const userId = createId();
export const userTwoId = createId();

export const PITOCA_USER = {
  id: userId,
  email: "pitoca@test.com",
  city: "Ribeirão Preto",
  state: "SP",
  country: "BR"
};

export const PITOCA_DOG = {
  id: "clh2xa8v40017mlkj8zumrrbz",
  name: "Pitoca",
  birthDate: new Date("2019-01-01"),
  gender: "FEMALE",
  color: "TRICOLOR",
  size: "SMALL",
  weight: 5,
  breed: {
    connect: { id: shihtzuId }
  },
  bio: "Não resisto a um carinho na barriga."
} as const;

export const PITOCO_USER = {
  id: userTwoId,
  email: "pitoco@test.com",
  latitude: null,
  longitude: null
} as const;

export const PITOCO_DOG = {
  id: "clh2xa8v40017mlkj8zumrrbv",
  name: "Pitoco",
  birthDate: new Date("2019-01-01"),
  gender: "MALE",
  color: "TRICOLOR",
  size: "SMALL",
  weight: 6,
  breed: {
    connect: { id: shihtzuId }
  },
  bio: "Adoro brincar de bolinha e de morder meia."
} as const;
