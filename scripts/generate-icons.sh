#!/usr/bin/env bash
set -euo pipefail

# Regenerates the site's icon set from apps/nextjs/public/logo.svg.
#
# Needs: librsvg, imagemagick, pngquant, oxipng (`brew install librsvg
# imagemagick pngquant oxipng`). ImageMagick's own SVG renderer silently
# drops the logo's linear gradients and hands back a blank canvas, which is
# why the rasterising step is rsvg-convert and not `magick logo.svg`.
#
# The .ico frames stay 32-bit BGRA. A palette .ico is half the size and gets
# a 1-bit transparency mask with it, which puts a white fringe around every
# curve at 16px — the whole logo is curves.

cd "$(dirname "$0")/.."

PUBLIC="apps/nextjs/public"
SRC="${PUBLIC}/logo.svg"
WORK="$(mktemp -d)"
trap 'rm -rf "${WORK}"' EXIT

# Rasterise once at 1024, then fit it centred on a square transparent canvas.
# logo.svg is 341x357, so squaring it is padding, never a stretch.
rsvg-convert -w 1024 "${SRC}" -o "${WORK}/logo.png"
magick "${WORK}/logo.png" -trim +repage \
  -resize 1024x1024 -gravity center -background none -extent 1024x1024 \
  PNG32:"${WORK}/master.png"

for size in 16 32 48 192 512; do
  magick "${WORK}/master.png" \
    -colorspace RGB -filter Lanczos -resize "${size}x${size}" -colorspace sRGB \
    PNG32:"${WORK}/icon-${size}.png"
done

magick "${WORK}/icon-16.png" "${WORK}/icon-32.png" "${WORK}/icon-48.png" \
  "${PUBLIC}/favicon.ico"

cp "${WORK}/icon-16.png" "${PUBLIC}/favicon-16x16.png"
cp "${WORK}/icon-32.png" "${PUBLIC}/favicon-32x32.png"
cp "${WORK}/icon-192.png" "${PUBLIC}/icon-192.png"
cp "${WORK}/icon-512.png" "${PUBLIC}/icon-512.png"

# iOS composites the touch icon onto black and rounds the corners itself, so
# this one gets the site background baked in plus a margin for the rounding.
magick "${WORK}/master.png" \
  -colorspace RGB -filter Lanczos -resize 140x140 -colorspace sRGB \
  -gravity center -background white -extent 180x180 -alpha remove -alpha off \
  PNG24:"${PUBLIC}/apple-touch-icon.png"

for png in favicon-16x16 favicon-32x32 icon-192 icon-512 apple-touch-icon; do
  pngquant --quality=80-98 --speed 1 --strip --force \
    --output "${PUBLIC}/${png}.png" -- "${PUBLIC}/${png}.png"
  oxipng -o max --strip safe -q "${PUBLIC}/${png}.png"
done

ls -l "${PUBLIC}/favicon.ico" "${PUBLIC}"/favicon-*.png "${PUBLIC}"/icon-*.png \
  "${PUBLIC}/apple-touch-icon.png"
