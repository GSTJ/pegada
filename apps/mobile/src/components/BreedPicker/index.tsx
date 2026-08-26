import type { BreedSlug } from "@pegada/shared/i18n/i18n";

import { Namespace } from "@pegada/shared/i18n/types/types";
import { useTranslation } from "react-i18next";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { Input } from "@/components/Input";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { api } from "@/contexts/trpc-provider";

import { InputPicker } from "../Picker";

type BreedPickerProps = {
  breed?: string | null;
  setBreed: (value: { id: string | null }) => void;
  error?: string;
  hasAnyOption?: boolean;
  title?: string;
  optional?: boolean;
  testID?: string;
};

const BreedPicker = ({
  breed,
  setBreed,
  hasAnyOption = false,
  ...props
}: BreedPickerProps) => {
  const { t } = useTranslation();
  const [breedsData] = api.breed.all.useSuspenseQuery(undefined, {
    refetchOnMount: false,
  });

  const breeds = [
    ...(hasAnyOption ? [{ id: null, name: t("breedPicker.anyBreed") }] : []),
    ...breedsData.map((breed) => ({
      id: breed.id,
      name: t(breed.slug as BreedSlug, { ns: Namespace.Breed }),
    })),
  ];

  const selectedBreed = breeds.find((item) => item.id === breed);

  return (
    <InputPicker
      title={t("breedPicker.breed")}
      placeholder={breeds[0]?.name}
      data={breeds}
      value={selectedBreed}
      onChange={setBreed}
      searchable
      {...props}
    />
  );
};
const BreedPickerLoading = () => {
  const { t } = useTranslation();

  return (
    <DisabledInput
      title={t("breedPicker.breed")}
      loading
      pointerEvents="none"
      style={styles.disabledInput}
    />
  );
};

const BreedPickerError = () => {
  const { t } = useTranslation();

  return (
    <DisabledInput
      title={t("breedPicker.breed")}
      value={t("breedPicker.error")}
      canCancel={false}
      pointerEvents="none"
      style={styles.disabledInput}
    />
  );
};

const BreedPickerBoundary = (props: BreedPickerProps) => (
  <NetworkBoundary
    suspenseFallback={<BreedPickerLoading />}
    errorFallback={BreedPickerError}
  >
    <BreedPicker {...props} />
  </NetworkBoundary>
);

export default BreedPickerBoundary;

const styles = StyleSheet.create({
  disabledInput: {
    opacity: 0.5,
  },
});

const DisabledInput = withUnistyles(Input);
