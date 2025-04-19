import * as React from "react";
import { ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useGetFormattedYears } from "@/services/useGetFormattedYears";
import { SwipeDog } from "@/store/reducers/dogs/swipe";
import { Age, Container, Description, Name } from "./styles";

export const BIO_NUMBER_OF_LINES = 3;

const PersonalInfo: React.FC<{ dog: SwipeDog } & ViewProps> = ({
  dog,
  ...rest
}) => {
  const getFormattedYears = useGetFormattedYears();

  return (
    <LinearGradient
      colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, .7)", "rgba(0, 0, 0, .8)"]}
    >
      <Container {...rest}>
        <Name>
          {dog.name}
          {dog.birthDate ? (
            <Age>, {getFormattedYears(dog.birthDate)}</Age>
          ) : null}
        </Name>
        {dog.bio ? (
          <Description numberOfLines={BIO_NUMBER_OF_LINES}>
            {dog.bio}
          </Description>
        ) : null}
      </Container>
    </LinearGradient>
  );
};

export default PersonalInfo;
