import { KeyboardAvoidingView, Platform, View } from "react-native";
import { magicToast } from "react-native-magic-toast";
import { useLocalSearchParams, useRouter } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import {
  DogCompleteClientSchema,
  dogCompleteClientSchema
} from "@pegada/shared/schemas/dogSchema";

import { BottomAction, useBottomActionStyle } from "@/components/BottomAction";
import BreedPicker from "@/components/BreedPicker";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { InputPicker } from "@/components/Picker";
import { Text } from "@/components/Text";
import { getTrcpContext } from "@/contexts/trcpContext";
import { api } from "@/contexts/TRPCProvider";
import { useDelayedHeaderHeight } from "@/hooks/useDelayedHeaderHeight";
import { analytics } from "@/services/analytics";
import { colors, sizes } from "@/services/consts";
import { sendError } from "@/services/errorTracking";
import { maskDate } from "@/services/maskDate";
import { SceneName } from "@/types/SceneName";
import { Container, ImageContainer, ProfileImage } from "./styles";

const CompleteProfile = () => {
  const router = useRouter();
  const { t } = useTranslation();

  const { profileImageUrl } = useLocalSearchParams();

  const { control, handleSubmit, getValues, watch } =
    useForm<DogCompleteClientSchema>({
      defaultValues: {
        birthDate: "",
        breedId: ""
      },
      resolver: zodResolver(dogCompleteClientSchema)
    });

  const form = watch();

  const headerHeight = useDelayedHeaderHeight();

  const hasChanged = Object.values(form).some((value) => Boolean(value));

  const myDogUpdateMutation = api.myDog.update.useMutation({
    onSuccess: (data) => {
      analytics.track({
        event_type: "Complete Dog Profile",
        event_properties: data ?? {}
      });
      getTrcpContext().myDog.get.setData(undefined, data);
      router.replace(SceneName.AskForLocation);
    },
    onError: (error) => {
      magicToast.alert(t("editProfile.profileError"));
      sendError(error);
    }
  });

  const saveUser = handleSubmit(async (data) => {
    if (hasChanged) {
      const dogData = {
        ...(data.birthDate && { birthDate: data.birthDate }),
        ...(data.breedId && { breedId: data.breedId }),
        ...(data.color && { color: data.color }),
        ...(data.size && { size: data.size })
      };

      await myDogUpdateMutation.mutateAsync(dogData);
    }

    if (!hasChanged) {
      analytics.track({ event_type: "Skip Complete Dog Profile" });
      router.replace(SceneName.AskForLocation);
    }
  });

  const theme = useTheme();

  const { scrollViewProps } = useBottomActionStyle();
  const continueText = hasChanged
    ? t("completeProfile.save")
    : t("common.skip");

  return (
    <KeyboardAvoidingView
      style={{ flexGrow: 1 }}
      keyboardVerticalOffset={headerHeight}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ flex: 1 }}>
        <Container
          style={{ flex: 1 }}
          {...scrollViewProps}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing[4],
            paddingBottom:
              theme.spacing[8] +
              scrollViewProps.contentContainerStyle.paddingBottom
          }}
          keyboardDismissMode="interactive"
        >
          <ImageContainer>
            <ProfileImage source={{ uri: profileImageUrl as string }} />
          </ImageContainer>

          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1 }}>
              <Controller
                name="breedId"
                control={control}
                rules={{ required: true }}
                render={({ field: { onChange, value }, fieldState }) => (
                  <BreedPicker
                    title={t("completeProfile.breed")}
                    breed={value}
                    setBreed={(breed) => onChange(breed.id)}
                    error={fieldState.error?.message}
                    optional
                  />
                )}
              />
            </View>

            <View style={{ width: theme.spacing[3] }} />

            <View style={{ flex: 1.5 }}>
              <Controller
                name="birthDate"
                control={control}
                rules={{ required: true }}
                render={({
                  field: { onChange, onBlur, value, name },
                  fieldState
                }) => (
                  <Input
                    title={t("completeProfile.birthDate")}
                    placeholder="DD/MM/YYYY"
                    value={value ?? ""}
                    onBlur={onBlur}
                    optional
                    onChangeText={(value: string) => {
                      const currentLength = getValues()[name]?.length ?? 0;
                      const isErasing = value.length < currentLength;

                      if (isErasing) return onChange(value);

                      // Mask to MM/DD/YYYY
                      onChange(maskDate(value));
                    }}
                    numberOfLines={1}
                    keyboardType="numeric"
                    error={fieldState.error?.message}
                  />
                )}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row" }}>
            <Controller
              name="size"
              control={control}
              rules={{ required: true }}
              render={({ field: { onChange, value }, fieldState }) => (
                <InputPicker
                  optional
                  title={t("completeProfile.size")}
                  placeholder={t("sizes.small")}
                  data={sizes}
                  value={sizes.find((sizeValue) => sizeValue.id === value)}
                  onChange={(size) => onChange(size.id)}
                  error={fieldState.error?.message}
                />
              )}
            />

            <View style={{ width: theme.spacing[3] }} />
            <Controller
              name="color"
              control={control}
              rules={{ required: true }}
              render={({ field: { onChange, value }, fieldState }) => (
                <InputPicker
                  optional
                  title={t("completeProfile.color")}
                  placeholder={colors[0]?.name}
                  data={colors}
                  value={colors.find((color) => color.id === value)}
                  onChange={(color) => onChange(color.id)}
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>

          <Text fontSize="xs" style={{ marginTop: theme.spacing[6] }}>
            {t("completeProfile.additionalInfo")}
          </Text>
        </Container>
        <BottomAction.Container>
          <Button
            loading={myDogUpdateMutation.isPending}
            onPress={() => saveUser()}
          >
            {continueText}
          </Button>
        </BottomAction.Container>
      </View>
    </KeyboardAvoidingView>
  );
};

export default CompleteProfile;
