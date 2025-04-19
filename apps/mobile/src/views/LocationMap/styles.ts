import RNMap from "react-native-maps";
import styled from "styled-components/native";

export const Container = styled.View`
  flex: 1;
`;

export const MapView = styled(RNMap).attrs({
  showsUserLocation: true,
  rotateEnabled: false,
  showsCompass: false,
  pitchEnabled: false
})`
  flex: 1;
`;
