import type { DogServerSchema } from "@pegada/shared/schemas/dog-schema";

import prisma from "@pegada/database";
import { DogUnavailableError } from "@pegada/shared/errors/errors";
import { IMAGE_STATUS } from "@pegada/shared/schemas/dog-schema";

import {
  dogSelect,
  selfDogSelect,
  serverOnlyFullDogSelect,
} from "../dtos/dog-dto";
import { enqueue } from "../queue/enqueue";
import { TOPICS } from "../queue/topics";
import { transformDistanceBetweenUserAndDog } from "../shared/dog-distance";
import { deleteImageFromS3 } from "../shared/file-upload";
import { isAllowedImageUrl } from "../shared/image-url";
import { ImageService } from "./image-service";

type DogImagesWithId = (DogServerSchema["images"][number] & { id: string })[];

export class DogService {
  static #imagesToDelete = (
    existingImages: DogServerSchema["images"] = [],
    newImages: DogServerSchema["images"] = [],
  ) =>
    existingImages.filter(
      (existingImage) =>
        !newImages.some((newImage) => newImage.url === existingImage.url),
    ) as DogImagesWithId;

  static #imagesToCreate = (
    existingImages: DogServerSchema["images"] = [],
    newImages: DogServerSchema["images"] = [],
  ) =>
    newImages.filter(
      (newImage) =>
        newImage.url && // Remove empty images
        !existingImages.some(
          (existingImage) => existingImage.url === newImage.url,
        ),
    );

  static #imagesToUpdate = (
    existingImages: DogServerSchema["images"] = [],
    newImages: DogServerSchema["images"] = [],
  ) =>
    newImages.flatMap((newImage) => {
      const existingImage = existingImages.find(
        (candidate) => candidate.url === newImage.url,
      );

      if (!existingImage?.id || newImage.position === existingImage.position) {
        return [];
      }

      return [{ ...newImage, id: existingImage.id }];
    });

  static #classifyImages = (
    existingImages: DogServerSchema["images"],
    newImages: DogServerSchema["images"],
  ) => {
    const imagesToCreate = this.#imagesToCreate(existingImages, newImages);
    const imagesToUpdate = this.#imagesToUpdate(existingImages, newImages);
    const imagesToDelete = this.#imagesToDelete(existingImages, newImages);

    return { imagesToCreate, imagesToUpdate, imagesToDelete };
  };

  static async createDog(dogInput: DogServerSchema & { userId: string }) {
    // Currently, we only allow one dog per user
    const dogAlreadyExists = await prisma.dog.findFirst({
      where: { userId: dogInput.userId, deletedAt: null },
    });

    if (dogAlreadyExists) {
      throw new Error("Dog already exists");
    }

    const nonEmptyImages = dogInput.images.filter((image) => image.url);
    const images = await ImageService.makeTemporaryImagesPermanent(
      nonEmptyImages,
      dogInput.userId,
    );

    const dog = await prisma.dog.create({
      data: {
        ...dogInput,
        images: {
          create: images.map((image) => ({
            url: image.url,
            position: image.position,
          })),
        },
      },
      select: selfDogSelect,
    });

    // Classify images, create blurhashes and update image status
    await Promise.all(
      dog.images.map((image) => enqueue(TOPICS.PROCESS_IMAGE, image)),
    );

    return dog;
  }

  static async updateDog(id: string, dogInput: Partial<DogServerSchema>) {
    const dog = await prisma.dog.findUniqueOrThrow({
      where: { id },
      select: { userId: true },
    });
    const existingImages = dogInput.images
      ? await prisma.image.findMany({ where: { dogId: id } })
      : [];

    const { imagesToDelete, imagesToCreate, imagesToUpdate } =
      this.#classifyImages(existingImages, dogInput.images ?? []);

    const imagesToCreatePermanent =
      await ImageService.makeTemporaryImagesPermanent(
        imagesToCreate,
        dog.userId,
      );

    const dogTransaction = await prisma.$transaction([
      ...imagesToUpdate.map((image) =>
        prisma.image.update({
          where: { id: image.id },
          data: { position: image.position },
        }),
      ),
      // Update the dog last, so that the images are already in the database
      prisma.dog.update({
        where: { id },
        select: selfDogSelect,
        data: {
          ...dogInput,
          images: {
            createMany: {
              data: imagesToCreatePermanent.map((image) => ({
                url: image.url,
                position: image.position,
              })),
            },
            deleteMany: {
              id: { in: imagesToDelete.map((image) => image.id) },
            },
          },
        },
      }),
    ]);

    const updatedDog = dogTransaction.at(-1) as unknown as Awaited<
      ReturnType<typeof this.getYourOwnDogByUserId>
    >;

    await Promise.all([
      // If database operations are successful, delete from S3. Images stored
      // before the current storage origins were configured (a retired S3
      // bucket, a dev fixture) have nothing of ours behind them, and asking
      // the storage layer to route them throws — which would reject this
      // Promise.all *after* the transaction had already committed.
      ...imagesToDelete
        .filter((image) => isAllowedImageUrl(image.url))
        .map((image) => deleteImageFromS3(image.url)),

      // Classify images, create blurhashes and update image status
      ...(updatedDog?.images ?? []).flatMap((image) =>
        imagesToCreatePermanent.some((newImage) => newImage.url === image.url)
          ? [enqueue(TOPICS.PROCESS_IMAGE, image)]
          : [],
      ),
    ]);

    return updatedDog;
  }

  static async getDogById(id: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        latitude: true,
        longitude: true,
        plan: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const dog = await prisma.dog.findFirst({
      where: {
        id,
        banned: false,
        deletedAt: null,
        user: { deletedAt: null },
        // Users must have at least one approved image.
        // Shadowban users with rejected images.
        images: {
          some: { status: IMAGE_STATUS.APPROVED },
          none: { status: IMAGE_STATUS.REJECTED },
        },
      },
      select: dogSelect,
    });

    if (!dog) {
      throw new DogUnavailableError();
    }

    return transformDistanceBetweenUserAndDog(dog, user);
  }

  static async getYourOwnDogByUserId(userId: string) {
    const dog = await prisma.dog.findFirst({
      where: { userId, deletedAt: null },
      select: selfDogSelect,
    });

    return dog;
  }

  static async getFullDogByUserId(userId: string) {
    const dog = await prisma.dog.findFirst({
      where: { userId, banned: false, deletedAt: null },
      select: serverOnlyFullDogSelect,
    });

    return dog;
  }

  /**
   * The image URLs currently stored for a dog. Used by `myDog.update` to tell
   * a URL the caller invented from one the dog already has.
   */
  static async getImageUrls(dogId: string) {
    const images = await prisma.image.findMany({
      where: { dogId },
      select: { url: true },
    });

    return new Set(images.map((image) => image.url));
  }

  static async getDogByUserId(userId: string) {
    const dog = await prisma.dog.findFirstOrThrow({
      where: { userId, banned: false, deletedAt: null },
    });

    return dog;
  }

  static async deleteDog(id: string) {
    const imageUrls = await prisma.image.findMany({
      where: { dogId: id },
      select: { url: true },
    });

    await Promise.all(
      imageUrls
        .filter(({ url }) => isAllowedImageUrl(url))
        .map(({ url }) => deleteImageFromS3(url)),
    );

    // Cascade soft-delete
    await prisma.$transaction([
      prisma.dog.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
      prisma.image.deleteMany({ where: { dogId: id } }),
      prisma.match.updateMany({
        where: { OR: [{ requesterId: id }, { responderId: id }] },
        data: { deletedAt: new Date() },
      }),
      prisma.interest.updateMany({
        where: { OR: [{ requesterId: id }, { responderId: id }] },
        data: { deletedAt: new Date() },
      }),
    ]);
  }

  static async deleteDogsByUserId(userId: string) {
    const userDog = await prisma.dog.findFirstOrThrow({
      where: { userId, deletedAt: null },
    });

    await DogService.deleteDog(userDog.id);
  }
}
