import type { ProfileImagesUploaderProps } from "@/components/ProfileImageUploader";
import type { Picture } from "@/components/ProfileImageUploader/utils";
import type { DogQuickClientSchema } from "@pegada/shared/schemas/dog-schema";

import { useState } from "react";
import { View, ScrollView } from "react-native";

import { useRouter } from "expo-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { dogQuickClientSchema } from "@pegada/shared/schemas/dog-schema";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { magicToast } from "react-native-magic-toast";
import { useUnistyles } from "react-native-unistyles";

import { BottomAction, useBottomActionStyle } from "@/components/BottomAction";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { styles as componentsStyles } from "@/components/layout";
import { ProfileImagesUploader } from "@/components/ProfileImageUploader";
import { pictures } from "@/components/ProfileImageUploader/utils";
import { RadioButtons } from "@/components/RadioButtons";
import { Text } from "@/components/text";
import { getTrcpContext } from "@/contexts/trcp-context";
import { api } from "@/contexts/trpc-provider";
import {
  ScrollIntoViewProvider,
  useKeyboardAwareScroll,
  useKeyboardOverlap,
} from "@/hooks/use-keyboard-aware-scroll";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";
import { SceneName } from "@/types/scene-name";

import { DragHint, MultilineInput, PhotoHint, styles } from "./styles";

const DEFAULT_VALUES: DogQuickClientSchema = {
  name: "",
  bio: "",
  images: pictures,
  gender: "MALE",
};

const CreateProfile = () => {
  const { t } = useTranslation();

  const { control, handleSubmit, getValues } = useForm({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(dogQuickClientSchema),
  });

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
          gender: data.gender,
        },
      });

      router.replace({
        pathname: SceneName.CompleteProfile,
        params: {
          dogId: data.id,
          // Todo: don't - use caches
          profileImageUrl: data.images[0]?.url ?? "",
        },
      });
    },
    onError: (error) => {
      magicToast.alert(t("editProfile.profileError"));
      sendError(error);
    },
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
          position: index,
        })),
    };

    await dogCreateMutation.mutateAsync(dogData);
  });

  const [gesturesEnabled, setGesturesEnabled] = useState(true);

  const { theme } = useUnistyles();

  const { scrollViewProps, height: bottomActionHeight } =
    useBottomActionStyle();

  // The pinned Create Profile bar is painted over the scroll area, so a
  // focused field has to clear the bar, not just the keyboard.
  const { containerProps, scrollProps, requestScrollIntoView } =
    useKeyboardAwareScroll({ bottomInset: bottomActionHeight });

  // Shrinks this screen to the part the keyboard leaves visible, which is
  // what makes the measurement above meaningful: `useKeyboardAwareScroll`
  // measures the container's on-screen rect, and without this the container
  // still reaches the bottom of the display on Android.
  const keyboardOverlap = useKeyboardOverlap();

  return (
    /*
      Not a KeyboardAvoidingView: `behavior` has to be left undefined on
      Android, where the component then does nothing at all, so every field
      below the IME's top edge stayed there. `useKeyboardOverlap` computes the
      padding the component would have computed on iOS, on both platforms —
      and it needs no `keyboardVerticalOffset`, because it measures the
      keyboard against the window rather than against this view's own frame.
    */
    <View
      style={[
        componentsStyles.keyboardScreen,
        { paddingBottom: keyboardOverlap },
      ]}
    >
      <ScrollIntoViewProvider value={requestScrollIntoView}>
        <View {...containerProps} style={componentsStyles.fill}>
          <ScrollView
            {...scrollViewProps}
            {...scrollProps}
            contentContainerStyle={{
              padding: theme.spacing[4],
              paddingBottom:
                theme.spacing[4] +
                scrollViewProps.contentContainerStyle.paddingBottom,
            }}
            scrollEnabled={gesturesEnabled}
            keyboardShouldPersistTaps="handled"
            style={styles.container}
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
                  <PhotoHint fontSize="xs" style={styles.photoHint}>
                    {t("createProfile.minimumOnePhoto")}
                  </PhotoHint>
                  <ProfileImagesUploader
                    setGesturesEnabled={setGesturesEnabled}
                    value={value as Picture[]}
                    onChange={(
                      cb: Parameters<ProfileImagesUploaderProps["onChange"]>[0],
                    ) => {
                      // This getValues is needed to ensure the update happens
                      // correctly even when adding images fast.
                      onChange(cb(getValues("images") as Picture[]));
                    }}
                    error={fieldState.error?.message}
                  />
                  <DragHint
                    fontSize="xs"
                    fontWeight="medium"
                    style={styles.dragHint}
                  >
                    {t("createProfile.clickAndHold")}
                  </DragHint>
                </>
              )}
            />
            <Controller
              name="name"
              control={control}
              rules={{ required: true }}
              render={({ field: { onChange, onBlur, value }, fieldState }) => (
                <Input
                  testID="profile-name"
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
                <MultilineInput
                  testID="profile-bio"
                  title={t("createProfile.bio")}
                  placeholder={t("createProfile.tellSomethingCool")}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  maxLength={500}
                  multiline
                  optional
                  error={fieldState.error?.message}
                  style={styles.multilineInput}
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
                  itemTestIDPrefix="gender-item-"
                  data={[
                    { id: "MALE", name: t("completeProfile.male") },
                    { id: "FEMALE", name: t("completeProfile.female") },
                  ]}
                  value={value}
                  onChange={onChange}
                />
              )}
            />
          </ScrollView>
          <BottomAction.Container>
            <Button
              loading={dogCreateMutation.isPending}
              onPress={() => saveUser()}
              testID="profile-submit"
            >
              {t("createProfile.createProfile")}
            </Button>
          </BottomAction.Container>
        </View>
      </ScrollIntoViewProvider>
    </View>
  );
};

export default CreateProfile;
