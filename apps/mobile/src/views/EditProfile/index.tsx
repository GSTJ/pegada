import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { magicToast } from "react-native-magic-toast";
import { useRouter } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useHeaderHeight } from "@react-navigation/elements";
import { format } from "date-fns";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useTheme } from "styled-components/native";

import { dogClientSchema } from "@pegada/shared/schemas/dogSchema";

import { BottomAction, useBottomActionStyle } from "@/components/BottomAction";
import BreedPicker from "@/components/BreedPicker";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { InputPicker } from "@/components/Picker";
import {
  ProfileImagesUploader,
  ProfileImagesUploaderProps
} from "@/components/ProfileImageUploader";
import { Picture, pictures } from "@/components/ProfileImageUploader/utils";
import { RadioButtons } from "@/components/RadioButtons";
import { getTrcpContext } from "@/contexts/trcpContext";
import { api, RouterInputs } from "@/contexts/TRPCProvider";
import { analytics } from "@/services/analytics";
import { colors, sizes } from "@/services/consts";
import { sendError } from "@/services/errorTracking";
import { maskDate } from "@/services/maskDate";
import { Actions } from "@/store/reducers";
import { Container } from "./styles";

type MyDogUpdateMutation = RouterInputs["myDog"]["update"];
type EditProfileForm = Partial<MyDogUpdateMutation>;

const EditProfile = () => {
  const router = useRouter();
  const { t } = useTranslation();

  const { control, handleSubmit, setValue, getValues } =
    useForm<EditProfileForm>({
      defaultValues: {
        name: "",
        bio: "",
        gender: "MALE",
        weight: undefined,
        birthDate: "",
        breedId: "",
        color: undefined,
        size: undefined,
        images: pictures
      },
      resolver: zodResolver(dogClientSchema)
    });

  const [dog] = api.myDog.get.useSuspenseQuery(undefined, {
    refetchOnMount: false
  });

  if (!dog) {
    throw new Error("Dog not found");
  }

  useEffect(() => {
    setValue("name", dog.name);
    if (dog.bio) {
      setValue("bio", dog.bio);
    }

    if (dog.birthDate) {
      setValue("birthDate", format(dog.birthDate, "dd/MM/yyyy"));
    }

    if (dog.weight) {
      setValue("weight", dog.weight);
    }

    setValue("breedId", dog.breed?.id);
    setValue("color", dog.color);
    setValue("size", dog.size);
    setValue("gender", dog.gender);
    setValue(
      "images",
      pictures.map((picture, index) => {
        const matchingImage = dog?.images?.[index];

        if (!matchingImage) return picture;

        return {
          ...picture,
          id: matchingImage?.id,
          key: matchingImage?.id,
          url: matchingImage?.url,
          status: matchingImage?.status,
          blurhash: matchingImage?.blurhash,
          position: matchingImage?.position,
          disabledDrag: false,
          disabledReSorted: false
        };
      })
    );
  }, [dog, setValue]);

  const dispatch = useDispatch();

  const [gesturesEnabled, setGesturesEnabled] = useState(true);

  const nonDelayedHeaderHeight = useHeaderHeight();

  const theme = useTheme();

  const { scrollViewProps } = useBottomActionStyle();
  const scrollViewRef = useRef<ScrollView>(null);

  const myDogUpdateMutation = api.myDog.update.useMutation({
    onMutate: () => {
      analytics.track({ event_type: "Save Profile Pressed" });
    },
    onSuccess: (data) => {
      dispatch(Actions.dogs.list.refetch());
      getTrcpContext().myDog.get.setData(undefined, data);
      magicToast.success(t("editProfile.profileUpdated"), 1000);
      router.back();
    },
    onError: (error) => {
      magicToast.alert(t("editProfile.profileError"));
      sendError(error);
    }
  });

  const saveUser = handleSubmit(async (data) => {
    const updateData = {
      bio: data.bio,
      name: data.name,
      gender: data.gender,
      // Null so those fields are removed correctly in the database
      weight: data.weight ? data.weight : null,
      birthDate: data.birthDate ? data.birthDate : null,
      breedId: data.breedId ? data.breedId : null,
      color: data.color ? data.color : null,
      size: data.size ? data.size : null,
      images: data.images?.map((image, index) => ({
        id: image.id,
        url: image.url,
        position: index
      }))
    };

    await myDogUpdateMutation.mutateAsync(updateData);
  });

  return (
    <KeyboardAvoidingView
      style={{ flexGrow: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ flex: 1 }}>
        <Container
          ref={scrollViewRef}
          style={{ flex: 1 }}
          {...scrollViewProps}
          contentContainerStyle={{
            padding: theme.spacing[4],
            paddingBottom:
              theme.spacing[4] +
              scrollViewProps.contentContainerStyle.paddingBottom,
            paddingTop: nonDelayedHeaderHeight + theme.spacing[4]
          }}
          scrollEnabled={gesturesEnabled}
          keyboardShouldPersistTaps="handled"
        >
          <Controller
            name="images"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, value }, fieldState }) => {
              return (
                <ProfileImagesUploader
                  value={value as Picture[]}
                  onChange={(
                    cb: Parameters<ProfileImagesUploaderProps["onChange"]>[0]
                  ) => {
                    // This getValues is needed to ensure the update happens
                    // correctly even when adding images fast.
                    onChange(cb(getValues("images") as Picture[]));
                  }}
                  error={fieldState.error?.message}
                  setGesturesEnabled={setGesturesEnabled}
                />
              );
            }}
          />
          <Controller
            name="name"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, onBlur, value }, fieldState }) => {
              return (
                <Input
                  title={t("editProfile.dogName")}
                  placeholder={t("editProfile.dogNamePlaceholder")}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  maxLength={50}
                  error={fieldState.error?.message}
                  autoCorrect={false}
                />
              );
            }}
          />
          <Controller
            name="bio"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <Input
                title={t("editProfile.bio")}
                placeholder={t("editProfile.bioPlaceholder")}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                maxLength={500}
                multiline
                error={fieldState.error?.message}
                style={{ minHeight: 75 }}
              />
            )}
          />
          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1 }}>
              <Controller
                name="weight"
                control={control}
                rules={{ required: true }}
                render={({
                  field: { onChange, onBlur, value },
                  fieldState
                }) => (
                  <Input
                    title={t("editProfile.weight")}
                    placeholder="1"
                    value={String(value ?? "")}
                    onBlur={onBlur}
                    onChangeText={(value: string) =>
                      // Only allow numbers
                      onChange(value.replace(/[^0-9]/g, ""))
                    }
                    maxLength={3}
                    numberOfLines={1}
                    keyboardType="numeric"
                    error={fieldState.error?.message}
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
                    title={t("editProfile.birthDate")}
                    placeholder="DD/MM/YYYY"
                    value={String(value)}
                    onBlur={onBlur}
                    onChangeText={(value: string) => {
                      const oldValue = getValues()[name];
                      const isErasing =
                        value.length < (oldValue ? oldValue.length : 0);

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

          <Controller
            name="breedId"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, value }, fieldState }) => (
              <BreedPicker
                breed={value}
                setBreed={(breed) => onChange(breed.id)}
                error={fieldState.error?.message}
              />
            )}
          />

          <View style={{ flexDirection: "row" }}>
            <Controller
              name="size"
              control={control}
              rules={{ required: true }}
              render={({ field: { onChange, value }, fieldState }) => (
                <InputPicker
                  title={t("editProfile.size")}
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
                  title={t("editProfile.color")}
                  placeholder={colors[0]?.name}
                  data={colors}
                  value={colors.find((color) => color.id === value)}
                  onChange={(color) => onChange(color.id)}
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
          <Controller
            name="gender"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <RadioButtons
                title={t("editProfile.gender")}
                data={[t("editProfile.male"), t("editProfile.female")]}
                value={
                  value === "MALE"
                    ? t("editProfile.male")
                    : t("editProfile.female")
                }
                onChange={(value) => {
                  onChange(value === t("editProfile.male") ? "MALE" : "FEMALE");
                }}
              />
            )}
          />
        </Container>
        <BottomAction.Container>
          <Button
            loading={myDogUpdateMutation.isPending}
            onPress={() => saveUser()}
          >
            {t("editProfile.saveProfile")}
          </Button>
        </BottomAction.Container>
      </View>
    </KeyboardAvoidingView>
  );
};

export default () => (
  <NetworkBoundary>
    <EditProfile />
  </NetworkBoundary>
);
