#!/usr/bin/env python3
"""Generate InboxSentinel icons. Run: python3 gen_icons.py"""
from PIL import Image, ImageDraw
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def draw_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size
    pad = max(1, s // 10)

    # Background: dark indigo, rounded corners
    r = s // 4
    d.rounded_rectangle([pad, pad, s - pad, s - pad], radius=r, fill=(20, 20, 60, 255))

    # Shield body
    mx = int(s * 0.18)
    sy = int(s * 0.12)
    sw = s - 2 * mx
    sh = int(s * 0.60)

    shield_pts = [
        (mx,          sy),
        (mx + sw,     sy),
        (mx + sw,     sy + int(sh * 0.58)),
        (mx + sw // 2, sy + sh),
        (mx,          sy + int(sh * 0.58)),
    ]
    d.polygon(shield_pts, fill=(124, 58, 237, 255))   # purple

    # Inner shield (slightly inset, darker)
    inset = max(1, s // 14)
    inner_pts = [
        (mx + inset,          sy + inset),
        (mx + sw - inset,     sy + inset),
        (mx + sw - inset,     sy + int(sh * 0.58) - inset // 2),
        (mx + sw // 2,        sy + sh - inset),
        (mx + inset,          sy + int(sh * 0.58) - inset // 2),
    ]
    d.polygon(inner_pts, fill=(67, 56, 202, 255))     # indigo

    # Envelope: white rectangle
    em = max(1, s // 6)
    ex1 = mx + em
    ex2 = mx + sw - em
    ey1 = sy + int(sh * 0.14)
    ey2 = sy + int(sh * 0.54)
    mid = (ex1 + ex2) // 2

    d.rectangle([ex1, ey1, ex2, ey2], fill=(255, 255, 255, 255))

    # Envelope flap V
    d.polygon([(ex1, ey1), (mid, ey1 + (ey2 - ey1) // 2), (ex2, ey1)],
              fill=(180, 160, 240, 255))

    # Dividing line between flap and body
    lw = max(1, s // 32)
    d.rectangle([ex1, ey1 + (ey2 - ey1) // 2 - lw, ex2, ey1 + (ey2 - ey1) // 2 + lw],
                fill=(200, 200, 220, 160))

    return img


def main():
    for size in (16, 48, 128):
        path = os.path.join(SCRIPT_DIR, f'icon{size}.png')
        draw_icon(size).save(path, 'PNG')
        print(f'  ✓  icon{size}.png')


if __name__ == '__main__':
    main()
