import { useTranslation } from "react-i18next";

import { api } from "@/contexts/TRPCProvider";

export const useCurrentCityText = () => {
  const { t } = useTranslation();

  const [myDog] = api.myDog.get.useSuspenseQuery(undefined, {
    refetchOnMount: false
  });

  const hasLatLng = myDog?.user?.latitude && myDog.user?.longitude;

  const currentCityFallback = hasLatLng
    ? t("common.nearYou")
    : t("common.unknown");

  const currentCityText = myDog?.user?.city ?? currentCityFallback;

  // Use this once we have more specific location data
  // const currentNeighborhoodText = t('changeLocation.nearCurrentLocation', {
  //   location: currentNeighborhood,
  // })

  return currentCityText;
};
