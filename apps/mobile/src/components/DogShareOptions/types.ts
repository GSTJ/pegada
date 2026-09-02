/**
 * The subset of a dog record the share sheet and story card need.
 *
 * Both `dog.get` (any dog) and `myDog.get` (the caller's own dog) return this
 * shape structurally — `selfDogSelect` spreads `dogSelect` — so either
 * `RouterOutputs` type is assignable here without a cast at the call site.
 */
export type ShareableDog = {
  id: string;
  name: string;
  bio: string | null;
  birthDate: Date | null;
  breed: { slug: string } | null;
  gender: string;
  images: {
    url: string;
    blurhash?: string | null;
  }[];
};
