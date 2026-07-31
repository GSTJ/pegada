#!/usr/bin/env bash
set -uo pipefail
S=/private/tmp/claude-501/-Users-jarvis-jarvis-lab/2a1052d2-0b02-4d95-a15f-65a1715c0c4b/scratchpad/shots
D=/private/tmp/claude-501/-Users-jarvis-jarvis-lab/2a1052d2-0b02-4d95-a15f-65a1715c0c4b/scratchpad/diffs
rm -rf "$D"; mkdir -p "$D"

echo "| hero region | px compared | RMSE | PSNR dB | DSSIM | differing px @2% | @5% | @10% |"
echo "| --- | --- | --- | --- | --- | --- | --- | --- |"
for t in desktop-1440x900@1x desktop-1440x900@2x mobile-390x844@1x mobile-390x844@2x mobile-390x844@3x; do
  B="$S/before--${t}-hero.png"; A="$S/after--${t}-hero.png"
  cp "$B" "$D/hero-before--${t}.png"; cp "$A" "$D/hero-after--${t}.png"
  db=$(magick identify -format "%wx%h" "$B"); da=$(magick identify -format "%wx%h" "$A")
  if [ "$db" != "$da" ]; then echo "| ${t} | DIMENSION MISMATCH ${db} vs ${da} | | | | | | |"; continue; fi
  total=$(magick identify -format "%[fx:w*h]" "$B")
  rmse=$(magick compare -metric RMSE "$B" "$A" null: 2>&1 | sed 's/.*(\(.*\))/\1/')
  psnr=$(magick compare -metric PSNR "$B" "$A" null: 2>&1 | cut -d' ' -f1)
  dssim=$(magick compare -metric DSSIM "$B" "$A" null: 2>&1 | sed 's/.*(\(.*\))/\1/')
  row=""
  for f in 2 5 10; do
    ae=$(magick compare -fuzz ${f}% -metric AE "$B" "$A" null: 2>&1 | cut -d' ' -f1)
    pct=$(python3 -c "print(f'{100*${ae}/${total}:.3f}%')")
    row="${row} ${ae%%.*} (${pct}) |"
  done
  magick compare -fuzz 5% -highlight-color red -lowlight-color white \
    "$B" "$A" "$D/hero-compare-fuzz5--${t}.png" 2>/dev/null
  magick "$B" "$A" -compose difference -composite -colorspace Gray \
    -evaluate multiply 8 -negate "$D/hero-diffmap-8x--${t}.png"
  printf "| %s | %s (%s) | %s | %s | %s |%s\n" "$t" "$total" "$db" "$rmse" "$psnr" "$dssim" "$row"
done
