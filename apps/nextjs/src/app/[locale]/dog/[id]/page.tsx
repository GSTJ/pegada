import type { BreedSlug } from "@pegada/shared/i18n/i18n";

import { preload } from "react-dom";

import { notFound } from "next/navigation";

import prisma from "@pegada/database";
import { Namespace } from "@pegada/shared/i18n/types/types";
import { IMAGE_STATUS } from "@pegada/shared/schemas/dog-schema";
import { getFormattedYears } from "@pegada/shared/utils/get-formatted-years";

import { getSafeLocale } from "@/lib/get-safe-locale";
import { t } from "@/lib/translate";

type DogProfileProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata = {
  robots: { index: false, follow: false },
};

const DogProfile = async ({ params }: DogProfileProps) => {
  const { id } = await params;
  const dog = await prisma.dog.findFirst({
    where: {
      id,
      banned: false,
      deletedAt: null,
      images: {
        some: { status: IMAGE_STATUS.APPROVED },
        none: { status: IMAGE_STATUS.REJECTED },
      },
    },
    select: {
      name: true,
      bio: true,
      birthDate: true,
      breed: { select: { name: true, slug: true } },
      images: {
        where: { status: IMAGE_STATUS.APPROVED },
        orderBy: { position: "asc" },
        take: 1,
        select: { url: true },
      },
    },
  });

  const lng = getSafeLocale();

  if (!dog) {
    return notFound();
  }

  const [firstImage] = dog.images;
  const dogImage = firstImage?.url;

  // This photo is the page: it is the LCP element on every /dog/[id] view, and
  // it is a CSS `background-image`, which the browser's preload scanner cannot
  // see. It is only discovered after the stylesheet has been fetched and the
  // rule has matched, so the request starts late no matter how fast the HTML
  // is. `preload` emits a hoisted `<link rel="preload" as="image">` in <head>,
  // which puts the fetch in the very first round of requests.
  //
  // Deliberately not `next/image`: this URL is on the media CDN and
  // `images.remotePatterns` is not configured, so switching would mean routing
  // user photos through the optimiser — a bigger change than an LCP fix needs.
  if (dogImage) {
    preload(dogImage, { as: "image", fetchPriority: "high" });
  }

  // oxlint-disable-next-line react-perf/jsx-no-new-object-as-prop -- server component: this renders once per request, there is no re-render to memoise against
  const dogImageStyle = { backgroundImage: `url(${dogImage})` };

  return (
    <div className="pt-8 space-y-8 flex flex-1 flex-col px-4 items-center pb-4 h-[100vh]">
      {/* oxlint-disable-next-line nextjs/no-img-element -- A static SVG needs no next/image pipeline. */}
      <img
        src="/logo.svg"
        draggable="false"
        alt=""
        className="h-12 select-none"
      />

      <div className="relative rounded-lg border border-border flex flex-col overflow-hidden flex-1 w-full max-w-xl">
        <div style={dogImageStyle} className="flex flex-1 bg-cover bg-center">
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
