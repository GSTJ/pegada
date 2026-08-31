import prisma from "@pegada/database";
import {
  InvalidUploadGrantError,
  UploadLimitReachedError,
} from "@pegada/shared/errors/errors";

import { deleteImageFromS3, moveImageToFolder } from "../shared/file-upload";
import {
  createTemporaryUploadKey,
  ImageService,
  UPLOAD_GRANT_LIMIT,
  UPLOAD_URL_TTL_SECONDS,
} from "./image-service";

jest.mock("../queue/enqueue", () => ({
  enqueue: jest.fn(async () => undefined),
}));

jest.mock("../shared/file-upload", () => {
  const actual = jest.requireActual<typeof import("../shared/file-upload")>(
    "../shared/file-upload",
  );

  return {
    ...actual,
    deleteImageFromS3: jest.fn(async () => undefined),
    moveImageToFolder: jest.fn(async (url: string, folder: string) =>
      actual.getMovedImageUrl(url, folder),
    ),
  };
});

const deleteStoredImage = jest.mocked(deleteImageFromS3);
const moveStoredImage = jest.mocked(moveImageToFolder);

beforeEach(async () => {
  await prisma.uploadGrant.deleteMany();
});

afterEach(async () => {
  const grants = await prisma.uploadGrant.findMany({ select: { id: true } });
  await Promise.all(
    grants.map(async ({ id }) => {
      await ImageService.cleanupUploadGrant(id);
      await ImageService.pruneUploadGrant(id);
    }),
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("createTemporaryUploadKey", () => {
  it("creates distinct UUID-backed keys", () => {
    const keys = Array.from({ length: 100 }, createTemporaryUploadKey);

    expect(new Set(keys)).toHaveProperty("size", keys.length);
    for (const key of keys) {
      expect(key).toMatch(
        /^dogs-temporary\/[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
      );
    }
  });
});

describe("upload grants", () => {
  it("signs the exact WEBP size and expires the URL after ten minutes", async () => {
    const upload = await ImageService.getSignedUpload("user-one", {
      contentLength: 4,
      contentType: "image/webp",
    });
    const signedUrl = new URL(upload.url);

    expect(upload.headers).toEqual({
      "Content-Length": "4",
      "Content-Type": "image/webp",
    });
    expect(signedUrl.searchParams.get("X-Amz-Expires")).toBe(
      String(UPLOAD_URL_TTL_SECONDS),
    );
    expect(signedUrl.searchParams.get("X-Amz-SignedHeaders")).toContain(
      "content-length",
    );
    await expect(
      prisma.uploadGrant.findUnique({
        where: { temporaryUrl: upload.publicUrl },
      }),
    ).resolves.toMatchObject({ userId: "user-one", consumedAt: null });
  });

  it("serializes concurrent grant requests at the hourly limit", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: UPLOAD_GRANT_LIMIT + 2 }, () =>
        ImageService.getSignedUpload("limited-user"),
      ),
    );

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      UPLOAD_GRANT_LIMIT,
    );
    expect(results.filter(({ status }) => status === "rejected")).toEqual([
      expect.objectContaining({
        reason: expect.any(UploadLimitReachedError),
      }),
      expect.objectContaining({
        reason: expect.any(UploadLimitReachedError),
      }),
    ]);
  });

  it("lets only the grant owner promote an uploaded object", async () => {
    const upload = await ImageService.getSignedUpload("owner", {
      contentLength: 4,
      contentType: "image/webp",
    });
    await expect(
      ImageService.makeTemporaryImagesPermanent(
        [{ url: upload.publicUrl, position: 0 }],
        "other-user",
      ),
    ).rejects.toBeInstanceOf(InvalidUploadGrantError);

    const [image] = await ImageService.makeTemporaryImagesPermanent(
      [{ url: upload.publicUrl, position: 0 }],
      "owner",
    );
    expect(image?.url).toContain("/dogs/");
    expect(moveStoredImage).toHaveBeenCalledWith(upload.publicUrl, "dogs");
  });

  it("deletes unused uploads and their grant record", async () => {
    const upload = await ImageService.getSignedUpload("cleanup-user", {
      contentLength: 4,
      contentType: "image/webp",
    });
    const grant = await prisma.uploadGrant.findUniqueOrThrow({
      where: { temporaryUrl: upload.publicUrl },
    });

    await ImageService.cleanupUploadGrant(grant.id);
    expect(deleteStoredImage).toHaveBeenCalledWith(upload.publicUrl);
    await expect(
      prisma.uploadGrant.findUniqueOrThrow({ where: { id: grant.id } }),
    ).resolves.toMatchObject({ cleanedAt: expect.any(Date) });

    await ImageService.pruneUploadGrant(grant.id);
    await expect(
      prisma.uploadGrant.findUnique({ where: { id: grant.id } }),
    ).resolves.toBeNull();
  });

  it("leaves active and consumed grants for the later orphan cleanup", async () => {
    const activeUpload = await ImageService.getSignedUpload("active-cleanup", {
      contentLength: 4,
      contentType: "image/webp",
    });
    const consumedUpload = await ImageService.getSignedUpload(
      "consumed-cleanup",
      {
        contentLength: 4,
        contentType: "image/webp",
      },
    );
    const [activeGrant, consumedGrant] = await Promise.all([
      prisma.uploadGrant.findUniqueOrThrow({
        where: { temporaryUrl: activeUpload.publicUrl },
      }),
      prisma.uploadGrant.update({
        where: { temporaryUrl: consumedUpload.publicUrl },
        data: { consumedAt: new Date(), expiresAt: new Date(0) },
      }),
    ]);

    await ImageService.cleanupExpiredTemporaryUpload(activeGrant.id);
    await ImageService.cleanupExpiredTemporaryUpload(consumedGrant.id);

    expect(deleteStoredImage).not.toHaveBeenCalledWith(activeUpload.publicUrl);
    expect(deleteStoredImage).not.toHaveBeenCalledWith(
      consumedUpload.publicUrl,
    );

    await prisma.uploadGrant.update({
      where: { id: activeGrant.id },
      data: { expiresAt: new Date(0) },
    });
    await ImageService.cleanupExpiredTemporaryUpload(activeGrant.id);
    expect(deleteStoredImage).toHaveBeenCalledWith(activeUpload.publicUrl);
  });
});
