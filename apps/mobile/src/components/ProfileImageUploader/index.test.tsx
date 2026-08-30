import * as React from "react";

type GridProps = {
  onDragStart?: () => void;
  onDragEnd?: () => void;
};

let gridProps: GridProps = {};

jest.mock<Record<string, unknown>>("react-native", () => ({
  View: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock<Record<string, unknown>>("@/components/DraggableGrid", () => ({
  DraggableGrid: (props: GridProps) => {
    gridProps = props;
    return null;
  },
}));

jest.mock<Record<string, unknown>>(
  "@/components/ProfileImageUploader/utils",
  () => ({
    deleteItem: () => () => null,
    sortByUrl: () => 0,
  }),
);

jest.mock<Record<string, unknown>>("@/components/text", () => ({
  Text: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock<Record<string, unknown>>("./components/AddUserPhoto", () => ({
  AddUserPhoto: () => null,
}));

jest.mock<Record<string, unknown>>("./components/AddUserPhoto/styles", () => ({
  dogPictureHeight: 100,
  numOfColumns: 3,
}));

import { renderToStaticMarkup } from "react-dom/server";

import { ProfileImagesUploader } from ".";

test("re-enables parent gestures when a photo drag ends without a reorder", () => {
  const setGesturesEnabled = jest.fn();

  renderToStaticMarkup(
    <ProfileImagesUploader
      value={[]}
      onChange={jest.fn()}
      setGesturesEnabled={setGesturesEnabled}
    />,
  );

  gridProps.onDragStart?.();
  gridProps.onDragEnd?.();

  expect(setGesturesEnabled).toHaveBeenNthCalledWith(1, false);
  expect(setGesturesEnabled).toHaveBeenNthCalledWith(2, true);
});
