import { View } from "react-native";
import { Image as ExpoImage, ImageProps } from "expo-image";
import styled from "styled-components/native";

interface LocalImageProps extends Omit<ImageProps, "source"> {
  source?: {
    blurhash?: string | null | undefined;
    uri?: string;
  };
}

const AbsoluteImage = styled(ExpoImage)`
  position: absolute;
  width: 100%;
  height: 100%;
`;

const ImageWrapper = styled.View`
  overflow: hidden;
`;

export const Image = ({
  ref,
  source,
  ...props
}: LocalImageProps & {
  ref: React.RefObject<View>;
}) => {
  const blurhash = source?.blurhash;

  return (
    <ImageWrapper {...props} ref={ref}>
      {blurhash ? <AbsoluteImage source={{ blurhash }} /> : null}
      <AbsoluteImage
        source={blurhash ? { ...source, blurhash: undefined } : source}
        cachePolicy="memory-disk"
      />
    </ImageWrapper>
  );
};
