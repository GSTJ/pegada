import * as React from "react";
import { View } from "react-native";
import { DraggableGrid } from "react-native-draggable-grid";

import {
  DeletedPicture,
  deleteItem,
  Picture,
  sortByUrl
} from "@/components/ProfileImageUploader/utils";
import { Text } from "@/components/Text";
import { AddUserPhoto } from "./components/AddUserPhoto";
import {
  dogPictureHeight,
  numOfColumns
} from "./components/AddUserPhoto/styles";

type GenericPictures = (Picture | DeletedPicture)[];

export interface ProfileImagesUploaderProps {
  onChange: (value: (current: Picture[]) => GenericPictures) => void;
  value: Picture[];
  error?: string;
  setGesturesEnabled: (value: boolean) => void;
}

const AddUserPhotoWrapper = ({
  picture,
  onChange
}: {
  picture: Picture;
  onChange: ProfileImagesUploaderProps["onChange"];
}) => {
  const onDelete = () => {
    onChange((images) => {
      return images.map(deleteItem(picture)).sort(sortByUrl);
    });
  };

  const onAdd = ({ url }: { url: string }) => {
    onChange((images) =>
      images
        .map((currentPicture) => {
          if (currentPicture.id !== picture.id) {
            return currentPicture;
          }

          return {
            ...currentPicture,
            url,
            disabledDrag: false,
            disabledReSorted: false
          };
        })
        .sort(sortByUrl)
    );
  };
  return <AddUserPhoto picture={picture} onDelete={onDelete} onAdd={onAdd} />;
};

export const ProfileImagesUploader: React.FC<ProfileImagesUploaderProps> = ({
  onChange,
  value,
  error,
  setGesturesEnabled
}) => {
  const style = {
    // Prevent blinking on first render
    minHeight: (value.length / numOfColumns) * dogPictureHeight
  };

  const draggableGridStyle = { zIndex: 20 };

  const onDragStart = () => setGesturesEnabled(false);

  const onDragRelease = (newImages: GenericPictures) => {
    setGesturesEnabled(true);
    onChange(() => newImages);
  };

  const renderItem = (item: Picture) => (
    <View>
      <AddUserPhotoWrapper picture={item} onChange={onChange} />
    </View>
  );

  return (
    <View style={style}>
      <DraggableGrid
        numColumns={numOfColumns}
        data={value}
        itemHeight={dogPictureHeight}
        style={draggableGridStyle}
        onDragStart={onDragStart}
        onDragRelease={onDragRelease}
        renderItem={renderItem}
      />
      {Boolean(error) && (
        <Text color="destructive" fontSize="xs">
          *{error}
        </Text>
      )}
    </View>
  );
};
