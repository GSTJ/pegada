import prisma from "@pegada/database";
import {
  DogServerSchema,
  IMAGE_STATUS
} from "@pegada/shared/schemas/dogSchema";

import {
  dogSelect,
  selfDogSelect,
  serverOnlyFullDogSelect
} from "../dtos/dogDto";
import {
  PROCESS_IMAGE_QUEUE,
  ProcessImageQueue
} from "../queue/ProcessImageQueue";
import { deleteImageFromS3 } from "../shared/fileUpload";
import { ImageService } from "./ImageService";
import { SwipeService } from "./SwipeService";

type DogImagesWithId = (DogServerSchema["images"][number] & { id: string })[];

export class DogService {
  static #imagesToDelete = (
    existingImages: DogServerSchema["images"] = [],
    newImages: DogServerSchema["images"] = []
  ) =>
    existingImages.filter(
      (existingImage) =>
        !newImages.find((newImage) => newImage.url === existingImage.url)
    ) as DogImagesWithId;

  static #imagesToCreate = (
    existingImages: DogServerSchema["images"] = [],
    newImages: DogServerSchema["images"] = []
  ) =>
    newImages.filter(
      (newImage) =>
        newImage.url && // Remove empty images
        !existingImages.find(
          (existingImage) => existingImage.url === newImage.url
        )
    );

  static #imagesToUpdate = (
    existingImages: DogServerSchema["images"] = [],
    newImages: DogServerSchema["images"] = []
  ) =>
    newImages?.filter((newImage) =>
      existingImages?.find(
        (existingImage) =>
          newImage.url === existingImage.url &&
          newImage.position !== existingImage.position
      )
    ) ?? ([] as DogImagesWithId);

  static #classifyImages = (
    existingImages: DogServerSchema["images"],
    newImages: DogServerSchema["images"]
  ) => {
    const imagesToCreate = this.#imagesToCreate(existingImages, newImages);
    const imagesToUpdate = this.#imagesToUpdate(existingImages, newImages);
    const imagesToDelete = this.#imagesToDelete(existingImages, newImages);

    return { imagesToCreate, imagesToUpdate, imagesToDelete };
  };

  static async createDog(dogInput: DogServerSchema & { userId: string }) {
    // Currently, we only allow one dog per user
    const dogAlreadyExists = await prisma.dog.findFirst({
      where: { userId: dogInput.userId, deletedAt: null }
    });

    if (dogAlreadyExists) {
      throw new Error("Dog already exists");
    }

    const nonEmptyImages = dogInput.images.filter((image) => image.url);
    const images =
      await ImageService.makeTemporaryImagesPermanent(nonEmptyImages);

    const dog = await prisma.dog.create({
      data: {
        ...dogInput,
        images: {
          create: images.map((image) => ({
            url: image.url,
            position: image.position
          }))
        }
      },
      select: selfDogSelect
    });

    // Classify images, create blurhashes and update image status
    await Promise.all(
      dog.images.map((image) =>
        ProcessImageQueue.add(PROCESS_IMAGE_QUEUE, image)
      )
    );

    return dog;
  }

  static async updateDog(id: string, dogInput: Partial<DogServerSchema>) {
    const existingImages = dogInput.images
      ? await prisma.image.findMany({ where: { dogId: id } })
      : [];

    const { imagesToDelete, imagesToCreate, imagesToUpdate } =
      this.#classifyImages(existingImages, dogInput.images ?? []);

    const imagesToCreatePermanent =
      await ImageService.makeTemporaryImagesPermanent(imagesToCreate);

    const dogTransaction = await prisma.$transaction([
      ...imagesToUpdate.map((image) =>
        prisma.image.update({
          where: { id: image.id },
          data: { position: image.position }
        })
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
                position: image.position
              }))
            },
            deleteMany: {
              id: { in: imagesToDelete.map((image) => image.id) }
            }
          }
        }
      })
    ]);

    const updatedDog = dogTransaction.at(-1) as unknown as Awaited<
      ReturnType<typeof this.getYourOwnDogByUserId>
    >;

    await Promise.all([
      // If database operations are successful, delete from S3
      ...imagesToDelete.map((image) => deleteImageFromS3(image.url)),

      // Classify images, create blurhashes and update image status
      ...(updatedDog?.images ?? []).map(async (image) => {
        const isNew = imagesToCreatePermanent.find(
          (newImage) => newImage.url === image.url
        );
        if (!isNew) return;

        return ProcessImageQueue.add(PROCESS_IMAGE_QUEUE, image);
      })
    ]);

    return updatedDog;
  }

  static async getDogById(id: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        latitude: true,
        longitude: true,
        plan: true
      }
    });

    if (!user) {
      throw new Error("User not found");
    }

    const dog = await prisma.dog.findFirst({
      where: {
        id,
        deletedAt: null,
        // Users must have at least one approved image.
        // Shadowban users with rejected images.
        images: {
          some: { status: IMAGE_STATUS.APPROVED },
          none: { status: IMAGE_STATUS.REJECTED }
        }
      },
      select: dogSelect
    });

    if (!dog) {
      throw new Error("Dog not found");
    }

    return SwipeService.transformDistanceBetweenUserAndDog(dog, user);
  }

  static async getYourOwnDogByUserId(userId: string) {
    const dog = await prisma.dog.findFirst({
      where: { userId, deletedAt: null },
      select: selfDogSelect
    });

    return dog;
  }

  static async getFullDogByUserId(userId: string) {
    const dog = await prisma.dog.findFirst({
      where: { userId, deletedAt: null },
      select: serverOnlyFullDogSelect
    });

    return dog;
  }

  static async getDogByUserId(userId: string) {
    const dog = await prisma.dog.findFirstOrThrow({
      where: { userId, deletedAt: null }
    });

    return dog;
  }

  static async deleteDog(id: string) {
    // Cascade soft-delete
    await prisma.$transaction([
      prisma.dog.update({
        where: { id },
        data: { deletedAt: new Date() }
      }),
      prisma.image.deleteMany({ where: { dogId: id } }),
      prisma.match.updateMany({
        where: { OR: [{ requesterId: id }, { responderId: id }] },
        data: { deletedAt: new Date() }
      }),
      prisma.interest.updateMany({
        where: { OR: [{ requesterId: id }, { responderId: id }] },
        data: { deletedAt: new Date() }
      })
    ]);
  }

  static async deleteDogsByUserId(userId: string) {
    const userDog = await prisma.dog.findFirstOrThrow({
      where: { userId, deletedAt: null }
    });

    await DogService.deleteDog(userDog.id);
  }
}
