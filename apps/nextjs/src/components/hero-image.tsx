export const HeroImage = () => (
  <div className="flex flex-1 justify-center">
    <div className="mt-auto mb-12 h-[85dvh] max-h-[1200px] min-h-[600px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/phone-mockup.png"
        draggable="false"
        alt=""
        className="select-none size-full object-cover"
      />
    </div>
  </div>
);
