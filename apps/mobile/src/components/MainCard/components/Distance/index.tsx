import * as React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import Location from "@/assets/images/Location.svg";
import { SwipeDog } from "@/store/reducers/dogs/swipe";
import { Container, Content, DistanceText } from "./styles";

interface DistanceProps {
  dog: SwipeDog;
}

// TODO: Use i18n properly
const formatDistance = (distance: number, locale: string) => {
  // Countries that use miles instead of kilometers
  const countriesUsingMiles = ["US", "GB", "LR", "MM"]; // United States, United Kingdom, Liberia, Myanmar
  const usesMiles = countriesUsingMiles.some((countryCode) =>
    locale.includes(countryCode)
  );

  const unit = usesMiles ? " miles" : "km";
  const conversionFactor = 0.621371; // conversion factor from km to miles

  // Convert distance to miles if necessary
  const convertedDistance = usesMiles ? distance * conversionFactor : distance;

  return (
    Intl.NumberFormat(locale, {
      style: "decimal",
      maximumFractionDigits: 1
    }).format(convertedDistance) + unit
  );
};

const Distance: React.FC<DistanceProps> = ({ dog }) => {
  const [_t, i18n] = useTranslation();

  if (dog.distance === null || dog.distance === undefined) {
    return (
      <Container>
        <View />
      </Container>
    );
  }

  return (
    <Container>
      <Content>
        <Location width={14} height={14} fill="#fff" />
        <DistanceText>
          {formatDistance(dog.distance ?? 0, i18n.language)}
        </DistanceText>
      </Content>
    </Container>
  );
};

export default Distance;
