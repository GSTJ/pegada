#!/usr/bin/env python3
"""Draw the home page link preview cards, one per locale.

The card is a phone shot on the left and a headline on the right. Only the
headline changes between locales, so both files are drawn here from the same
plate and the same measurements. That is the point of this script: the cards
were drawn by hand once, drifted apart, and ended up in two different
typefaces, neither of which was the one the app is set in.

The plate is `og-image.png` itself. Everything outside the text band is left
untouched, and the band is repainted from the background either side of it
before the words go down, so running this again on its own output gives the
same picture back.

Type is Gilroy, the same files the app and the dog share card use, at the
sizes and positions the original card used.

    python3 scripts/generate-og-cards.py
    oxipng -o 4 --strip safe apps/nextjs/public/og-image.png \
        apps/nextjs/public/og-image-pt-br.png

Adding a locale means adding a row to CARDS below and a row to the lookup in
`apps/nextjs/src/app/layout.tsx`.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "packages" / "shared" / "themes" / "fonts"
PUBLIC = ROOT / "apps" / "nextjs" / "public"
PLATE = PUBLIC / "og-image.png"

# The band the words sit in, and two columns of clean background either side of
# it to repaint that band from.
BAND = (500, 235, 1200, 466)
SAMPLE_LEFT = 490
SAMPLE_RIGHT = 1195

CENTRE_X = 820
HEADLINE_CAP_TOPS = (247, 321)
SUBTITLE_CAP_TOP = 411
HEADLINE_CAP_HEIGHT = 59
SUBTITLE_CAP_HEIGHT = 36
HEADLINE_COLOUR = (0, 0, 0)
SUBTITLE_COLOUR = (126, 122, 125)

CARDS = [
    ("og-image.png", ("Friends For", "Your Doggie"), "Pawfect Matches"),
    ("og-image-pt-br.png", ("Amigos pro", "seu dog"), "Cachorro aqui do lado"),
]


def font_at_cap_height(name, cap_height):
    """Gilroy's point size for a given cap height, found by bisection.

    Sizing on cap height rather than points is what keeps the two cards
    matching the original hand drawn one.
    """
    path = str(FONTS / name)
    low, high = 20.0, 200.0
    for _ in range(50):
        middle = (low + high) / 2
        box = ImageFont.truetype(path, max(1, round(middle))).getbbox("H")
        if box[3] - box[1] < cap_height:
            low = middle
        else:
            high = middle
    return ImageFont.truetype(path, round((low + high) / 2))


def repaint_band(image):
    """Wipe the words, keeping the soft gradient they sat on."""
    pixels = image.load()
    left_x, top, right_x, bottom = BAND
    span = (PLATE_WIDTH - 1) - SAMPLE_LEFT
    for y in range(top, bottom):
        left = pixels[SAMPLE_LEFT, y]
        right = pixels[SAMPLE_RIGHT, y]
        for x in range(left_x, right_x):
            ratio = (x - SAMPLE_LEFT) / span
            pixels[x, y] = tuple(
                round(left[i] + (right[i] - left[i]) * ratio) for i in range(3)
            )


def centre(draw, text, font, cap_top, colour):
    top_bearing = font.getbbox("H")[1]
    width = draw.textlength(text, font=font)
    draw.text((CENTRE_X - width / 2, cap_top - top_bearing), text, font=font, fill=colour)


plate = Image.open(PLATE).convert("RGB")
PLATE_WIDTH = plate.width
headline_font = font_at_cap_height("Gilroy-ExtraBold.ttf", HEADLINE_CAP_HEIGHT)
subtitle_font = font_at_cap_height("Gilroy-Bold.ttf", SUBTITLE_CAP_HEIGHT)

for filename, headline_lines, subtitle in CARDS:
    card = plate.copy()
    repaint_band(card)
    draw = ImageDraw.Draw(card)
    for text, cap_top in zip(headline_lines, HEADLINE_CAP_TOPS):
        centre(draw, text, headline_font, cap_top, HEADLINE_COLOUR)
    centre(draw, subtitle, subtitle_font, SUBTITLE_CAP_TOP, SUBTITLE_COLOUR)
    card.save(PUBLIC / filename, optimize=True)
    print(f"wrote {filename} {card.width}x{card.height}")
