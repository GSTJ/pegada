import { useEffect } from "react";
import * as React from "react";
import { Dimensions } from "react-native";
import { magicToast } from "react-native-magic-toast";
import { useRouter } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useHeaderHeight } from "@react-navigation/elements";
import { t } from "i18next";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useTheme } from "styled-components/native";
import { z } from "zod";

import { BottomAction, useBottomActionStyle } from "@/components/BottomAction";
import BreedPicker from "@/components/BreedPicker";
import { Button } from "@/components/Button";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { InputPicker } from "@/components/Picker";
import { Slider } from "@/components/Slider";
import { getTrcpContext } from "@/contexts/trcpContext";
import { api, RouterInputs } from "@/contexts/TRPCProvider";
import { analytics } from "@/services/analytics";
import { colors, sizes } from "@/services/consts";
import { sendError } from "@/services/errorTracking";
import { Actions } from "@/store/reducers";
import { SceneName } from "@/types/SceneName";
import {
  Container,
  DistanceContainer,
  InputRow,
  InputSpace,
  SliderContainer
} from "./styles";

const { width } = Dimensions.get("window");

type MyDogUpdateMutation = RouterInputs["myDog"]["update"];
export const MAX_FILTER_DISTANCE = 300;
export const MAX_FILTER_AGE = 10;
interface Preference
  extends Pick<
    MyDogUpdateMutation,
    "preferredBreedId" | "preferredColor" | "preferredSize"
  > {
  preferredMaxDistance: number[];
  preferredAgeRange: number[];
}

const schema = z
  .object({
    preferredColor: z.string().nullable().optional(),
    preferredSize: z.string().nullable().optional(),
    preferredMaxDistance: z.array(z.number().nullable()).nullable().optional(),
    preferredBreedId: z.string().nullable().optional(),
    preferredAgeRange: z
      .array(z.number().nullable().optional())
      .nullable()
      .optional()
  })
  .optional();

const Preferences: React.FC = () => {
  const router = useRouter();

  const [dog] = api.myDog.get.useSuspenseQuery(undefined, {
    refetchOnMount: false
  });

  if (!dog) {
    throw new Error("Dog not found");
  }

  const { control, handleSubmit, setValue } = useForm<Preference>({
    defaultValues: {
      preferredColor: undefined,
      preferredSize: undefined,
      preferredMaxDistance: [MAX_FILTER_DISTANCE],
      preferredBreedId: undefined,
      preferredAgeRange: [0, MAX_FILTER_AGE]
    },
    // Zod is breaking here, seems to be an issue with the library
    resolver: zodResolver(schema as any)
  });

  const dispatch = useDispatch();

  const myDogUpdateMutation = api.myDog.update.useMutation({
    onMutate: () => {
      analytics.track({ event_type: "Save Preferences Pressed" });
    },
    onSuccess: (data) => {
      dispatch(Actions.dogs.list.refetch());
      getTrcpContext().myDog.get.setData(undefined, data);
      magicToast.success(t("preferences.preferencesUpdated"), 1000);
      router.back();
    },
    onError: (error) => {
      magicToast.alert(t("preferences.updateError"));
      sendError(error);
    }
  });

  const saveUser = handleSubmit(async (data) => {
    const body: MyDogUpdateMutation = {
      preferredBreedId: data.preferredBreedId,
      preferredColor: data.preferredColor,
      preferredSize: data.preferredSize,
      preferredMaxDistance: data.preferredMaxDistance[0],
      preferredMinAge: data.preferredAgeRange[0],
      preferredMaxAge: data.preferredAgeRange[1]
    };

    // Unlimited
    if (
      body.preferredMaxDistance &&
      body.preferredMaxDistance >= MAX_FILTER_DISTANCE
    ) {
      body.preferredMaxDistance = undefined;
    }

    // Unlimited
    if (body.preferredMaxAge && body.preferredMaxAge >= MAX_FILTER_AGE) {
      body.preferredMaxAge = undefined;
    }

    // if the values are the same as dog, don't update
    if (
      dog.preferredBreedId !== body.preferredBreedId ||
      dog.preferredColor !== body.preferredColor ||
      dog.preferredSize !== body.preferredSize ||
      dog.preferredMaxDistance !== body.preferredMaxDistance ||
      dog.preferredMinAge !== body.preferredMinAge ||
      dog.preferredMaxAge !== body.preferredMaxAge
    ) {
      await myDogUpdateMutation.mutateAsync(body);
    } else {
      // Optimistic update
      magicToast.success(t("preferences.preferencesUpdated"), 1000);
      router.push(SceneName.Swipe);
    }
  });

  useEffect(() => {
    setValue("preferredBreedId", dog.preferredBreedId);
    setValue("preferredColor", dog.preferredColor);
    setValue("preferredSize", dog.preferredSize);
    setValue("preferredMaxDistance", [
      dog.preferredMaxDistance ?? MAX_FILTER_DISTANCE
    ]);
    setValue("preferredAgeRange", [
      dog.preferredMinAge ?? 0,
      dog.preferredMaxAge ?? MAX_FILTER_AGE + 1
    ]);
  }, [dog, setValue]);

  const headerHeight = useHeaderHeight();
  const { scrollViewProps } = useBottomActionStyle();
  const theme = useTheme();

  return (
    <>
      <Container
        {...scrollViewProps}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.spacing[4],
          paddingTop: headerHeight,
          paddingBottom:
            scrollViewProps.contentContainerStyle.paddingBottom +
            theme.spacing[4]
        }}
      >
        <Controller
          name="preferredBreedId"
          control={control}
          rules={{ required: true }}
          render={({ field: { onChange, value }, fieldState }) => (
            <BreedPicker
              hasAnyOption
              breed={value}
              setBreed={(breed) => onChange(breed.id)}
              error={fieldState.error?.message}
            />
          )}
        />
        <InputRow>
          <Controller
            name="preferredSize"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, value }, fieldState }) => (
              <InputPicker
                title={t("preferences.size")}
                placeholder={t("preferences.anySize")}
                data={[
                  {
                    id: null,
                    name: t("preferences.anySize")
                  },
                  ...sizes
                ]}
                value={
                  sizes.find((s) => s.id === value) ?? {
                    id: null,
                    name: t("preferences.anySize")
                  }
                }
                onChange={(size) => onChange(size.id)}
                error={fieldState.error?.message}
              />
            )}
          />
          <InputSpace />
          <Controller
            name="preferredColor"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, value }, fieldState }) => (
              <InputPicker
                title={t("preferences.color")}
                placeholder={t("preferences.anyColor")}
                data={[
                  { id: null, name: t("preferences.anyColor") },
                  ...colors
                ]}
                value={
                  colors.find((color) => color.id === value) ?? {
                    id: null,
                    name: t("preferences.anyColor")
                  }
                }
                onChange={(color) => onChange(color.id)}
                error={fieldState.error?.message}
              />
            )}
          />
        </InputRow>
        <Controller
          control={control}
          name="preferredAgeRange"
          render={({ field: { onChange, onBlur, value } }) => (
            <SliderContainer>
              <Slider.Title
                title={t("preferences.ageRange")}
                subtitle={t("preferences.years", { maxYears: MAX_FILTER_AGE })}
              />
              <Slider.Root
                values={[value[0] ?? 0, value[1] ?? MAX_FILTER_AGE + 1]}
                sliderLength={width - theme.spacing[4] * 2}
                onValuesChange={onChange}
                onValuesChangeFinish={onBlur}
                min={0}
                max={MAX_FILTER_AGE}
              />
            </SliderContainer>
          )}
        />
        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <DistanceContainer>
              <Slider.Title
                title={t("preferences.maxDistance")}
                subtitle={`1-${MAX_FILTER_DISTANCE}+ km`}
              />
              <Slider.Root
                values={value}
                sliderLength={width - theme.spacing[4] * 2}
                min={0}
                max={MAX_FILTER_DISTANCE}
                step={5}
                onValuesChange={onChange}
                onValuesChangeFinish={onBlur}
              />
            </DistanceContainer>
          )}
          name="preferredMaxDistance"
        />
      </Container>
      <BottomAction.Container>
        <Button loading={myDogUpdateMutation.isPending} onPress={saveUser}>
          {t("preferences.savePreferences")}
        </Button>
      </BottomAction.Container>
    </>
  );
};

export default () => (
  <NetworkBoundary>
    <Preferences />
  </NetworkBoundary>
);
