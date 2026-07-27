export const HeroImage = () => (
  <div className="flex flex-1 justify-center">
    <div className="mt-auto mb-12 h-[85dvh] max-h-[1200px] min-h-[600px]">
      {/* oxlint-disable-next-line nextjs/no-img-element -- A decorative full-bleed asset served from /public; next/image would add a loader for no gain. */}
      <img
        src="/phone-mockup.png"
        draggable="false"
        alt=""
        className="select-none size-full object-cover"
      />
    </div>
  </div>
);
