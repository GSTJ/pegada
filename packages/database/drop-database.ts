import prisma from ".";

export const dropDatabase = async () => {
  await prisma.image.deleteMany();
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.dog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.breed.deleteMany();
};
