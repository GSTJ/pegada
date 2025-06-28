import { notFound } from "next/navigation";

import prisma from "@pegada/database";
import { BreedSlug } from "@pegada/shared/i18n/i18n";
import { Namespace } from "@pegada/shared/i18n/types/types";
import { getFormattedYears } from "@pegada/shared/utils/getFormattedYears";

import { getSafeLocale } from "@/lib/get-safe-locale";
import { t } from "@/lib/translate";

interface DogProfileProps {
  params: {
    id: string;
  };
}

const DogProfile = async ({ params: { id } }: DogProfileProps) => {
  const dog = await prisma.dog.findFirst({
    where: { id, deletedAt: null },
    include: { images: true, breed: true }
  });

  const lng = getSafeLocale();

  if (!dog) {
    return notFound();
  }

  const dogImage = dog.images[0]?.url;

  return (
    <div className="pt-8 space-y-8 flex flex-1 flex-col px-4 items-center pb-4 h-[100vh]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.svg"
        draggable="false"
        alt=""
        className="h-12 select-none"
      />

      <div className="relative rounded-lg border border-border flex flex-col overflow-hidden flex-1 w-full max-w-xl">
        <div
          style={{ backgroundImage: `url(${dogImage})` }}
          className="flex flex-1 bg-cover bg-center"
        >
          {Boolean(dog.breed?.name) && (
            <div className="border border-border/70 rounded-md p-2 py-1 m-4 bg-background/50 backdrop-blur ml-auto mb-auto font-semibold">
              {t(`${dog.breed?.slug as BreedSlug}`, { ns: Namespace.Breed })}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 right-0 left-0 bg-background/50 backdrop-blur flex flex-col items-center justify-center p-8 border-t border-t-border/70 text-center">
          <p className="text-xl text-text">
            <b>{dog.name}</b>
            {dog?.birthDate
              ? `, ${getFormattedYears({ birthDate: dog?.birthDate, lng })}`
              : null}
          </p>
          <p>{dog.bio}</p>
        </div>
      </div>
    </div>
  );
};
export default DogProfile;
