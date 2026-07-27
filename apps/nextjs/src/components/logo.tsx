export const Logo = () => (
  // oxlint-disable-next-line nextjs/no-img-element -- A static SVG needs no next/image pipeline.
  <img
    src="/logo.svg"
    draggable="false"
    alt=""
    className="select-none w-12 h-12"
  />
);
