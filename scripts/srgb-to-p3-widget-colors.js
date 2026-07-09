#!/usr/bin/env node
/**
 * Computes the sRGB -> Display P3 gamut-mapped rgb() strings used in
 * apps/mobile/targets/pegada-widgets/expo-target.config.js.
 *
 * Why this exists: @bacons/apple-targets always tags emitted iOS colorsets
 * as "color-space": "display-p3", but it gets there by parsing the config's
 * CSS color string as plain sRGB and writing those components verbatim
 * (see node_modules/@bacons/apple-targets/build/colorset/with-ios-colorset.js).
 * It never actually converts anything to P3. Rendered on a wide-gamut
 * display, that P3-tagged sRGB numeral looks MORE saturated than intended.
 *
 * The fix: feed the plugin the sRGB->P3 gamut-mapped equivalent of each
 * theme color (as an rgb() string) so the P3-tagged colorset it writes
 * renders back to the original sRGB appearance on a wide-gamut display.
 *
 * Run with: node scripts/srgb-to-p3-widget-colors.js
 * Re-run and paste the output into expo-target.config.js whenever the
 * underlying theme colors in packages/shared/themes/themes.ts change.
 */

// sRGB (D65) -> CIE XYZ (IEC 61966-2-1)
const M_SRGB_TO_XYZ = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.072175],
  [0.0193339, 0.119192, 0.9503041],
];

// Display P3 (D65) -> CIE XYZ (SMPTE RP 431-2 / EG 432-1 primaries)
const M_P3_TO_XYZ = [
  [0.48657095, 0.26566769, 0.19821729],
  [0.22897456, 0.69173852, 0.07928691],
  [0.0, 0.04511338, 1.04394437],
];

const invert3x3 = (m) => {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  const inv = [
    [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
    [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det],
  ];
  return inv;
};

const M_XYZ_TO_P3 = invert3x3(M_P3_TO_XYZ);

const matMul = (m, v) => m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c) => {
  const clamped = Math.max(c, 0);
  return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
};

/** @param {[number, number, number]} rgb 0-1 sRGB components */
const srgbToDisplayP3 = (rgb) => {
  const linear = rgb.map(srgbToLinear);
  const xyz = matMul(M_SRGB_TO_XYZ, linear);
  const p3Linear = matMul(M_XYZ_TO_P3, xyz);
  return p3Linear.map((c) => Math.min(1, Math.max(0, linearToSrgb(c))));
};

const hslToSrgb = (h, s, l) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = h / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  const m = l - c / 2;
  let [r1, g1, b1] = [0, 0, 0];
  if (hPrime < 1) [r1, g1, b1] = [c, x, 0];
  else if (hPrime < 2) [r1, g1, b1] = [x, c, 0];
  else if (hPrime < 3) [r1, g1, b1] = [0, c, x];
  else if (hPrime < 4) [r1, g1, b1] = [0, x, c];
  else if (hPrime < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  return [r1 + m, g1 + m, b1 + m];
};

/** Theme colors mirrored from packages/shared/themes/themes.ts. */
const THEME_COLORS = {
  $accent: { light: [333, 0.81, 0.66] },
  $widgetBackground: { light: [0, 0, 1.0], dark: [0, 0, 0.0] },
  BrandPink: { light: [333, 0.81, 0.66], dark: [333, 0.58, 0.59] },
  PrimaryText: { light: [222.2, 0.84, 0.049], dark: [0, 0, 0.95] },
  SubtitleText: { light: [222.2, 0.1, 0.39], dark: [0, 0, 0.6] },
  CardSurface: { light: [0, 0, 0.975], dark: [0, 0, 0.15] },
  BorderSubtle: { light: [214.3, 0.318, 0.914], dark: [0, 0, 0.12] },
};

for (const [name, variants] of Object.entries(THEME_COLORS)) {
  for (const [mode, [h, s, l]] of Object.entries(variants)) {
    const srgb = hslToSrgb(h, s, l);
    const p3 = srgbToDisplayP3(srgb);
    const rgb255 = p3.map((c) => Math.round(c * 255));
    console.log(
      `${name} ${mode}: hsl(${h}, ${s * 100}%, ${l * 100}%) -> rgb(${rgb255.join(", ")})`,
    );
  }
}
