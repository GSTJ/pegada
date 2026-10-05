import * as React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useGetFormattedYears } from "@/services/useGetFormattedYears";
import { SwipeDog } from "@/store/reducers/dogs/swipe";
import { Age, Container, Description, Name, TitleAnchor } from "./styles";

export const BIO_NUMBER_OF_LINES = 3;

interface PersonalInfoProps extends ViewProps {
  bioAnchorRef?: React.Ref<View>;
  dog: SwipeDog;
  hideBio?: boolean;
  hideSurface?: boolean;
  hideTitle?: boolean;
  titleAnchorRef?: React.Ref<View>;
}

const PersonalInfo: React.FC<PersonalInfoProps> = ({
  bioAnchorRef,
  dog,
  hideBio = false,
  hideSurface = false,
  hideTitle = false,
  titleAnchorRef,
  ...rest
}) => {
  const getFormattedYears = useGetFormattedYears();

  return (
    <View>
      <LinearGradient
        pointerEvents="none"
        accessible={false}
        colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, .7)", "rgba(0, 0, 0, .8)"]}
        style={[StyleSheet.absoluteFill, hideSurface ? { opacity: 0 } : undefined]}
      />
      <Container {...rest}>
        <TitleAnchor
          ref={titleAnchorRef}
          collapsable={false}
          style={hideTitle ? { opacity: 0 } : undefined}
        >
          <Name style={{ marginBottom: 0 }}>
            {dog.name}
            {dog.birthDate ? <Age>, {getFormattedYears(dog.birthDate)}</Age> : null}
          </Name>
        </TitleAnchor>
        {dog.bio ? (
          <View ref={bioAnchorRef} collapsable={false} style={hideBio ? { opacity: 0 } : undefined}>
            <Description numberOfLines={BIO_NUMBER_OF_LINES}>{dog.bio}</Description>
          </View>
        ) : null}
      </Container>
    </View>
  );
};

export default PersonalInfo;
