import type {
  DeletedPicture,
  Picture,
} from "@/components/ProfileImageUploader/utils";

import * as React from "react";
import { View } from "react-native";

import { DraggableGrid } from "@/components/DraggableGrid";
import { deleteItem, sortByUrl } from "@/components/ProfileImageUploader/utils";
import { Text } from "@/components/text";

import { AddUserPhoto } from "./components/AddUserPhoto";
import {
  dogPictureHeight,
  numOfColumns,
} from "./components/AddUserPhoto/styles";

type GenericPictures = (Picture | DeletedPicture)[];

export type ProfileImagesUploaderProps = {
  onChange: (value: (current: Picture[]) => GenericPictures) => void;
  value: Picture[];
  error?: string;
  setGesturesEnabled: (value: boolean) => void;
};

const AddUserPhotoWrapper = ({
  picture,
  onChange,
  index,
}: {
  picture: Picture;
  onChange: ProfileImagesUploaderProps["onChange"];
  index: number;
}) => {
  const onDelete = () => {
    onChange((images) => {
      return images.map(deleteItem(picture)).sort(sortByUrl);
    });
  };

  const onAdd = ({ url, localUri }: { url: string; localUri?: string }) => {
    onChange((images) =>
      images
        .map((currentPicture) => {
          if (currentPicture.id !== picture.id) {
            return currentPicture;
          }

          return {
            ...currentPicture,
            url,
            localUri,
            disabledDrag: false,
            disabledReSorted: false,
          };
        })
        .sort(sortByUrl),
    );
  };
  return (
    <AddUserPhoto
      picture={picture}
      onDelete={onDelete}
      onAdd={onAdd}
      index={index}
    />
  );
};

export const ProfileImagesUploader: React.FC<ProfileImagesUploaderProps> = ({
  onChange,
  value,
  error,
  setGesturesEnabled,
}) => {
  const style = {
    // Prevent blinking on first render
    minHeight: (value.length / numOfColumns) * dogPictureHeight,
  };

  const draggableGridStyle = { zIndex: 20 };

  const onDragStart = () => {
    setGesturesEnabled(false);
  };

  const onDragEnd = () => {
    setGesturesEnabled(true);
  };

  const onDragRelease = (newImages: GenericPictures) => {
    onChange(() => newImages);
  };

  const renderItem = (item: Picture) => {
    const index = value.findIndex((p) => p.id === item.id);
    return (
      <View>
        <AddUserPhotoWrapper
          picture={item}
          onChange={onChange}
          index={Math.max(index, 0)}
        />
      </View>
    );
  };

  return (
    <View style={style}>
      <DraggableGrid
        numColumns={numOfColumns}
        data={value}
        itemHeight={dogPictureHeight}
        style={draggableGridStyle}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
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
