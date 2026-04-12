#!/usr/bin/env python3
"""
Extract 54x7 character tiles from a sprite sheet and colorize them by rank color.

Usage:
  python scripts/extract_rank_chars.py \
    --image "D:/grow-up-main/public/ranks/sprite.png" \
    --out "D:/grow-up-main/public/ranks/out" \
    --cols 54 --rows 7 \
    --char_w 12 --char_h 16 \
    --color 255 215 0 \
    [--stars]

Notes:
- If --char_w/--char_h are omitted, the script will auto-compute them by
  dividing image width/height by cols/rows.
- The color is specified as R G B for the rank color (3-color palette supported by you).
- The resulting tiles preserve the alpha channel of the source so glyphs keep smooth edges.
- If you specify --stars, a small star badge will be drawn in the bottom-right of each tile.
"""

import os
import sys
import argparse
from PIL import Image, ImageDraw
import math


def colorize_by_alpha(tile: Image.Image, color: tuple) -> Image.Image:
    """Colorize a tile using its alpha mask so glyph remains colored while bg stays transparent."""
    if tile.mode != 'RGBA':
        tile = tile.convert('RGBA')
    alpha = tile.getchannel('A')
    # Create a solid color image and apply the alpha of the glyph
    colored = Image.new('RGBA', tile.size, color + (255,))
    colored.putalpha(alpha)
    return colored


def draw_star(img: Image.Image, size: int, color=(255, 223, 0)) -> None:
    """Draw a small 5-point star in the bottom-right corner of the image."""
    w, h = img.size
    cx = w - size - 2
    cy = h - size - 2
    R = float(size)
    r = R * 0.5
    points = []
    for i in range(5):
        angle = math.radians(-90 + i * 72)
        x = cx + math.cos(angle) * R
        y = cy + math.sin(angle) * R
        points.append((x, y))
        angle2 = math.radians(-90 + i * 72 + 36)
        x2 = cx + math.cos(angle2) * r
        y2 = cy + math.sin(angle2) * r
        points.append((x2, y2))
    draw = ImageDraw.Draw(img)
    draw.polygon(points, fill=color + (255,))


def process(image_path: str, out_dir: str, cols: int, rows: int,
            char_w: int, char_h: int, color: tuple, draw_stars: bool) -> None:
    im = Image.open(image_path)
    w, h = im.size
    if char_w is None:
        char_w = max(1, w // cols)
    if char_h is None:
        char_h = max(1, h // rows)
    os.makedirs(out_dir, exist_ok=True)

    total = cols * rows
    count = 0
    for r in range(rows):
        for c in range(cols):
            left = c * char_w
            upper = r * char_h
            right = left + char_w
            lower = upper + char_h
            tile = im.crop((left, upper, right, lower)).convert('RGBA')
            colored = colorize_by_alpha(tile, color)
            if draw_stars:
                # draw a small star badge in bottom-right
                draw_star(colored, size=int(min(char_w, char_h) * 0.25))
            out_path = os.path.join(out_dir, f"char_{r:02d}_{c:02d}.png")
            colored.save(out_path, format='PNG')
            count += 1
    print(f"Exported {count} characters to {out_dir}")


def parse_args():
    p = argparse.ArgumentParser(add_help=True)
    p.add_argument('--image', required=True, help='Path to the sprite sheet image')
    p.add_argument('--out', required=True, help='Output directory for character tiles')
    p.add_argument('--cols', type=int, default=54, help='Number of columns to extract (default 54)')
    p.add_argument('--rows', type=int, default=7, help='Number of rows to extract (default 7)')
    p.add_argument('--char_w', type=int, default=None, help='Width of each character tile (px). If omitted, auto-calculated')
    p.add_argument('--char_h', type=int, default=None, help='Height of each character tile (px). If omitted, auto-calculated')
    p.add_argument('--color', nargs=3, type=int, default=[255, 215, 0], metavar=('R','G','B'),
                   help='Rank color as three integers (R G B), e.g., 255 215 0')
    p.add_argument('--stars', action='store_true', help='Overlay a small star badge on each tile')
    return p.parse_args()


def main():
    args = parse_args()
    image_path = args.image
    out_dir = args.out
    cols = args.cols
    rows = args.rows
    char_w = args.char_w
    char_h = args.char_h
    color = tuple(args.color)
    draw_stars = args.stars

    process(image_path, out_dir, cols, rows, char_w, char_h, color, draw_stars)


if __name__ == '__main__':
    main()
