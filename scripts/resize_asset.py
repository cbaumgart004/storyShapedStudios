"""
Resize a source image down to the web sizes this site actually serves.

Art arrives from the designer at print dimensions (the neon logo was 2359x851 /
890KB). Dropping that straight into public/assets/ ships a huge file to every
visitor, so every asset goes through this script first.

Sizes live in PRESETS below -- that table is the thing you edit. A preset is a
list of output widths:

  * one width  -> writes <name>.<ext>
  * many widths -> writes <name>-<width>.<ext> for each (srcset-friendly)

Aspect ratio is always preserved; only width is specified.

Usage:
    python scripts/resize_asset.py SOURCE --preset logo
    python scripts/resize_asset.py SOURCE --preset hero --name hero-spring
    python scripts/resize_asset.py SOURCE --width 640          # one-off size
    python scripts/resize_asset.py --list

Pillow is used when installed (handles JPEG/WebP and nicer resampling). Without
it there is a built-in pure-stdlib fallback that reads and writes 8-bit PNG
only -- which is what this repo's assets are.
"""
import os
import struct
import sys
import zlib

# ---------------------------------------------------------------- presets --
# Edit these. Widths are CSS pixels at 1x; they already include headroom for
# high-DPI screens, so a logo displayed at ~300px wide is stored at 900.
PRESETS = {
    'logo':    [900],          # header / footer brand lockups
    'hero':    [1600, 900],    # hero art, plus a mobile-sized copy
    'card':    [800],          # piece cards in the collection grid
    'social':  [96],           # social icon strip
    'library': [1200],         # inline Library article images
}

# Where resized files land, relative to the repo root.
OUT_DIR = os.path.join('frontend', 'public', 'assets')

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

try:
    from PIL import Image
except ImportError:
    Image = None


# ------------------------------------------------------------ PNG codec ----
# Only reached when Pillow is absent. 8-bit gray/RGB/gray+A/RGBA, no interlace.
CHANNELS = {0: 1, 2: 3, 4: 2, 6: 4}


def _png_read(path):
    """Return (width, height, channels, pixel_bytes) for an 8-bit PNG."""
    data = open(path, 'rb').read()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('not a PNG (install Pillow to handle other formats)')

    pos, idat = 8, []
    width = height = color = depth = interlace = 0
    while pos < len(data):
        length = struct.unpack('>I', data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + length]
        if kind == b'IHDR':
            width, height, depth, color, _, _, interlace = struct.unpack('>IIBBBBB', body)
        elif kind == b'IDAT':
            idat.append(body)
        pos += 12 + length

    if depth != 8 or color not in CHANNELS or interlace:
        raise ValueError(
            'unsupported PNG (bit depth %d, color type %d, interlace %d) -- '
            'install Pillow for full format support' % (depth, color, interlace)
        )

    n = CHANNELS[color]
    stride = width * n
    raw = zlib.decompress(b''.join(idat))
    out, prev, i = bytearray(), bytearray(stride), 0
    for _ in range(height):
        filt, i = raw[i], i + 1
        line = bytearray(raw[i:i + stride])
        i += stride
        if filt:
            for x in range(stride):
                a = line[x - n] if x >= n else 0
                b = prev[x]
                c = prev[x - n] if x >= n else 0
                if filt == 1:
                    line[x] = (line[x] + a) & 255
                elif filt == 2:
                    line[x] = (line[x] + b) & 255
                elif filt == 3:
                    line[x] = (line[x] + (a + b) // 2) & 255
                elif filt == 4:
                    pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                    pred = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                    line[x] = (line[x] + pred) & 255
                else:
                    raise ValueError('bad PNG filter type %d' % filt)
        out += line
        prev = line
    return width, height, n, bytes(out)


def _png_write(path, width, height, channels, pixels):
    color = {1: 0, 2: 4, 3: 2, 4: 6}[channels]
    stride = width * channels
    raw = b''.join(b'\x00' + pixels[y * stride:(y + 1) * stride] for y in range(height))

    def chunk(kind, body):
        payload = kind + body
        return struct.pack('>I', len(body)) + payload + struct.pack('>I', zlib.crc32(payload) & 0xffffffff)

    open(path, 'wb').write(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, color, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(raw, 9))
        + chunk(b'IEND', b'')
    )


def _drop_opaque_alpha(channels, pixels):
    """Strip a fully-opaque alpha channel -- it costs bytes and buys nothing."""
    if channels not in (2, 4) or any(pixels[i] != 255 for i in range(channels - 1, len(pixels), channels)):
        return channels, pixels
    keep = channels - 1
    out = bytearray(len(pixels) // channels * keep)
    for i in range(len(pixels) // channels):
        out[i * keep:(i + 1) * keep] = pixels[i * channels:i * channels + keep]
    return keep, bytes(out)


def _box_downscale(width, height, channels, pixels, new_width):
    """Average each source rectangle into one output pixel.

    Colour is premultiplied by alpha while averaging so that transparent
    padding does not bleed a dark fringe into the visible edges.
    """
    new_height = max(1, round(height * new_width / width))
    has_alpha = channels in (2, 4)
    colour = channels - 1 if has_alpha else channels
    out = bytearray(new_width * new_height * channels)

    x_spans = [(x * width // new_width, max(x * width // new_width + 1, (x + 1) * width // new_width))
               for x in range(new_width)]

    for y in range(new_height):
        y0 = y * height // new_height
        y1 = max(y0 + 1, (y + 1) * height // new_height)
        for x, (x0, x1) in enumerate(x_spans):
            sums = [0] * colour
            alpha_sum = 0
            count = 0
            for yy in range(y0, y1):
                row = yy * width * channels
                for xx in range(x0, x1):
                    o = row + xx * channels
                    if has_alpha:
                        a = pixels[o + colour]
                        alpha_sum += a
                        for c in range(colour):
                            sums[c] += pixels[o + c] * a
                    else:
                        for c in range(colour):
                            sums[c] += pixels[o + c]
                    count += 1
            o = (y * new_width + x) * channels
            if has_alpha:
                out[o + colour] = alpha_sum // count
                for c in range(colour):
                    out[o + c] = sums[c] // alpha_sum if alpha_sum else 0
            else:
                for c in range(colour):
                    out[o + c] = sums[c] // count
    return new_width, new_height, bytes(out)


# ------------------------------------------------------------- resizing ----
def _check_width(src, width, new_width):
    if new_width > width:
        raise ValueError('refusing to upscale %s (%dpx wide) to %dpx'
                         % (os.path.basename(src), width, new_width))


def resize(src, dst, new_width):
    """Write `src` to `dst` scaled to `new_width`. Returns (w, h, nw, nh)."""
    if Image is not None:
        with Image.open(src) as im:
            w, h = im.size
            _check_width(src, w, new_width)
            nh = max(1, round(h * new_width / w))
            if im.mode == 'RGBA' and im.getchannel('A').getextrema() == (255, 255):
                im = im.convert('RGB')  # opaque alpha costs bytes and buys nothing
            im.resize((new_width, nh), Image.LANCZOS).save(dst)
            return w, h, new_width, nh

    w, h, channels, pixels = _png_read(src)
    _check_width(src, w, new_width)
    channels, pixels = _drop_opaque_alpha(channels, pixels)
    nw, nh, scaled = _box_downscale(w, h, channels, pixels, new_width)
    _png_write(dst, nw, nh, channels, scaled)
    return w, h, nw, nh


def main(argv):
    if '--list' in argv:
        print('presets (widths in px):')
        for name, widths in PRESETS.items():
            print('  %-8s %s' % (name, ', '.join(str(x) for x in widths)))
        return 0

    src = next((a for a in argv if not a.startswith('--')), None)
    if not src:
        print(__doc__.strip())
        return 2

    def opt(flag):
        return argv[argv.index(flag) + 1] if flag in argv else None

    preset = opt('--preset')
    width = opt('--width')
    if preset and preset not in PRESETS:
        print('unknown preset %r -- run with --list' % preset)
        return 2
    if not preset and not width:
        print('give --preset NAME or --width PX (see --list)')
        return 2

    widths = [int(width)] if width else PRESETS[preset]
    out_dir = opt('--out') or os.path.join(REPO_ROOT, OUT_DIR)
    base = opt('--name') or os.path.splitext(os.path.basename(src))[0]
    ext = os.path.splitext(src)[1].lower() if Image else '.png'

    os.makedirs(out_dir, exist_ok=True)
    for target in widths:
        suffix = '' if len(widths) == 1 else '-%d' % target
        dst = os.path.join(out_dir, base + suffix + ext)
        w, h, nw, nh = resize(src, dst, target)
        print('%dx%d -> %dx%d   %dKB -> %dKB   %s'
              % (w, h, nw, nh, os.path.getsize(src) // 1024, os.path.getsize(dst) // 1024, dst))
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main(sys.argv[1:]))
    except (ValueError, OSError) as exc:
        print('error: %s' % exc)
        sys.exit(1)
