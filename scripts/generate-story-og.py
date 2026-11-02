"""Regenerate the two localized share images with Pillow and the shipped fonts."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import json
import io
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'apps/nextjs/public'
FONTS = ROOT / 'packages/shared/themes/fonts'

def font(size, weight='ExtraBold'):
    return ImageFont.truetype(str(FONTS / f'Gilroy-{weight}.ttf'), size)

for locale, filename in [('en', 'og-en.jpg'), ('pt-BR', 'og.jpg')]:
    copy = json.loads((ROOT / f'packages/shared/i18n/locales/{locale}/web.json').read_text())['story']
    canvas = Image.new('RGB', (1200, 630), '#F3F0E6')
    draw = ImageDraw.Draw(canvas)
    # The static paw is rasterized from the app's existing mark.
    mark = Image.open(io.BytesIO(subprocess.check_output(['node', '-e', "require('sharp')(process.argv[1]).png().toBuffer().then(b=>process.stdout.write(b))", str(PUBLIC / 'logo.svg')]))).convert('RGBA')
    mark.thumbnail((48, 48))
    canvas.paste(mark, (64, 76), mark)
    draw.text((124, 72), 'Pegada', font=font(38), fill='#C2306F')
    words = copy['headline'].split()
    lines = ['']
    for word in words:
        candidate = (lines[-1] + ' ' + word).strip()
        if draw.textlength(candidate, font=font(64)) > 430:
            lines.append(word)
        else:
            lines[-1] = candidate
    draw.multiline_text((64, 190), '\n'.join(lines), font=font(64), fill='#0F172A', spacing=10)
    draw.text((64, 470), 'pegada.app', font=font(28, 'Medium'), fill='#5A5F6D')
    # Equal frames, shared top/bottom edges, no overlapping text.
    for index, dog in enumerate(['nina', 'tofu']):
        x, y, width, height = 606 + index * 260, 100, 234, 416
        photo = ImageOps.fit(Image.open(PUBLIC / f'landing/{dog}.webp').convert('RGB'), (width, height))
        mask = Image.new('L', (width, height)); ImageDraw.Draw(mask).rounded_rectangle((0, 0, width-1, height-1), radius=24, fill=255)
        canvas.paste(photo, (x, y), mask)
        draw.rounded_rectangle((x+12, y+height-62, x+width-12, y+height-12), radius=12, fill='#F3F0E6')
        draw.text((x+24, y+height-54), dog.capitalize(), font=font(28), fill='#0F172A')
    canvas.save(PUBLIC / f'story/{filename}', quality=95, subsampling=0)
