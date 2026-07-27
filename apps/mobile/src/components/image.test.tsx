import { renderToStaticMarkup } from "react-dom/server";
import { Image as ExpoImage } from "expo-image";

import { Image } from "./image";

jest.mock("expo-image", () => ({ Image: jest.fn(() => null) }));

const expoImage = ExpoImage as unknown as jest.Mock;

const blurhash = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";
const uri = "https://images.pegada.app/luna.webp";

beforeEach(() => {
  expoImage.mockClear();
});

test("hands every image prop to Expo Image, on a single node", () => {
  const onDisplay = () => undefined;
  const onLoad = () => undefined;

  renderToStaticMarkup(
    <Image
      source={{ uri, blurhash }}
      contentFit="contain"
      contentPosition="top"
      transition={180}
      recyclingKey="luna-photo-1"
      priority="high"
      onDisplay={onDisplay}
      onLoad={onLoad}
    />,
  );

  expect(expoImage).toHaveBeenCalledTimes(1);
  expect(expoImage.mock.calls[0]?.[0]).toMatchObject({
    source: { uri },
    placeholder: { blurhash },
    contentFit: "contain",
    placeholderContentFit: "contain",
    contentPosition: "top",
    transition: 180,
    recyclingKey: "luna-photo-1",
    priority: "high",
    cachePolicy: "memory-disk",
    onDisplay,
    onLoad,
  });
});

test("keeps the style on the image itself instead of a wrapper", () => {
  const style = { width: 80, height: 100, borderRadius: 12 };

  renderToStaticMarkup(<Image source={{ uri }} style={style} />);

  expect(expoImage.mock.calls[0]?.[0]).toMatchObject({ style });
});
