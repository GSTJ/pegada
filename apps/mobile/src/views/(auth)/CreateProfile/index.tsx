import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { magicToast } from "react-native-magic-toast";
import { useRouter } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import {
  DogQuickClientSchema,
  dogQuickClientSchema
} from "@pegada/shared/schemas/dogSchema";

import { BottomAction, useBottomActionStyle } from "@/components/BottomAction";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
  ProfileImagesUploader,
  ProfileImagesUploaderProps
} from "@/components/ProfileImageUploader";
import { Picture, pictures } from "@/components/ProfileImageUploader/utils";
import { RadioButtons } from "@/components/RadioButtons";
import { Text } from "@/components/Text";
import { getTrcpContext } from "@/contexts/trcpContext";
import { api } from "@/contexts/TRPCProvider";
import { useDelayedHeaderHeight } from "@/hooks/useDelayedHeaderHeight";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/errorTracking";
import { SceneName } from "@/types/SceneName";
import { Container } from "./styles";

const DEFAULT_VALUES: DogQuickClientSchema = {
  name: "",
  bio: "",
  images: pictures,
  gender: "MALE"
};

const CreateProfile = () => {
  const { t } = useTranslation();

  const { control, handleSubmit, getValues } = useForm({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(dogQuickClientSchema)
  });

  const headerHeight = useDelayedHeaderHeight();

  const router = useRouter();

  const dogCreateMutation = api.dog.create.useMutation({
    onMutate: () => {
      analytics.track({ event_type: "Save Profile Pressed" });
    },
    onSuccess: (data) => {
      getTrcpContext().myDog.get.setData(undefined, data);

      analytics.track({
        event_type: "Create Dog Profile",
        event_properties: {
          name: data.name,
          gender: data.gender
        }
      });

      router.replace({
        pathname: SceneName.CompleteProfile,
        params: {
          dogId: data.id,
          // Todo: don't - use caches
          profileImageUrl: data.images[0]?.url ?? ""
        }
      });
    },
    onError: (error) => {
      magicToast.alert(t("editProfile.profileError"));
      sendError(error);
    }
  });

  const saveUser = handleSubmit(async (data) => {
    const dogData = {
      name: data.name,
      bio: data.bio,
      gender: data.gender,
      images: data.images
        .filter((image) => Boolean(image.url))
        .map((image, index) => ({
          id: image.id,
          url: image.url as string,
          position: index
        }))
    };

    await dogCreateMutation.mutateAsync(dogData);
  });

  const [gesturesEnabled, setGesturesEnabled] = useState(true);

  const theme = useTheme();

  const { scrollViewProps } = useBottomActionStyle();

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
            padding: theme.spacing[4],
            paddingBottom:
              theme.spacing[4] +
              scrollViewProps.contentContainerStyle.paddingBottom
          }}
          scrollEnabled={gesturesEnabled}
          keyboardShouldPersistTaps="handled"
        >
          <Controller
            name="images"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, value }, fieldState }) => (
              <>
                <Text fontWeight="bold" fontSize="lg">
                  {t("createProfile.profilePictures")}
                </Text>
                <Text fontSize="xs" style={{ marginBottom: 10 }}>
                  {t("createProfile.minimumOnePhoto")}
                </Text>
                <ProfileImagesUploader
                  setGesturesEnabled={setGesturesEnabled}
                  value={value as Picture[]}
                  onChange={(
                    cb: Parameters<ProfileImagesUploaderProps["onChange"]>[0]
                  ) => {
                    // This getValues is needed to ensure the update happens
                    // correctly even when adding images fast.
                    onChange(cb(getValues("images") as Picture[]));
                  }}
                  error={fieldState.error?.message}
                />
                <Text
                  fontSize="xs"
                  fontWeight="medium"
                  style={{ marginTop: 5 }}
                >
                  {t("createProfile.clickAndHold")}
                </Text>
              </>
            )}
          />
          <Controller
            name="name"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <Input
                title={t("createProfile.dogName")}
                placeholder={t("createProfile.howToCallDog")}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                maxLength={50}
                error={fieldState.error?.message}
                autoCorrect={false}
              />
            )}
          />
          <Controller
            name="bio"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <Input
                title={t("createProfile.bio")}
                placeholder={t("createProfile.tellSomethingCool")}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                maxLength={500}
                multiline
                optional
                error={fieldState.error?.message}
                style={{ minHeight: 75 }}
              />
            )}
          />
          <Controller
            name="gender"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <RadioButtons
                title={t("completeProfile.gender")}
                data={[t("completeProfile.male"), t("completeProfile.female")]}
                value={
                  value === "MALE"
                    ? t("completeProfile.male")
                    : t("completeProfile.female")
                }
                onChange={(value) => {
                  onChange(
                    value === t("completeProfile.male") ? "MALE" : "FEMALE"
                  );
                }}
              />
            )}
          />
        </Container>
        <BottomAction.Container>
          <Button
            loading={dogCreateMutation.isPending}
            onPress={() => saveUser()}
          >
            {t("createProfile.createProfile")}
          </Button>
        </BottomAction.Container>
      </View>
    </KeyboardAvoidingView>
  );
};

export default CreateProfile;
