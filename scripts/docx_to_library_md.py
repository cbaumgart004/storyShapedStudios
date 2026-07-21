"""
Convert the Uranium Glass FAQ .docx into a Markdown Library file.

Heading detection: any paragraph whose visible text is fully underlined is
treated as a section header (the FAQ questions). Everything else is body text.
Inline images are extracted in document order to an output media folder and
referenced with Markdown image tags where they appear.

Usage:
    python scripts/docx_to_library_md.py \
        "C:\\path\\to\\input.docx" \
        docs/library.md \
        frontend/public/library-media \
        /library-media
"""
import os
import sys
from docx import Document
from docx.oxml.ns import qn

BLIP = qn("a:blip")
EMBED = qn("r:embed")


def para_is_header(p):
    runs = [r for r in p.runs if r.text.strip()]
    if not runs:
        return False
    return all(r.underline for r in runs)


def extract_images(p, doc, media_dir, url_prefix, counter):
    """Return list of markdown image refs for images inline in this paragraph."""
    refs = []
    for blip in p._element.findall(".//" + BLIP):
        rId = blip.get(EMBED)
        if not rId:
            continue
        part = doc.part.related_parts.get(rId)
        if part is None:
            continue
        counter[0] += 1
        ext = os.path.splitext(part.partname)[1] or ".png"
        fname = f"image{counter[0]:03d}{ext}"
        with open(os.path.join(media_dir, fname), "wb") as f:
            f.write(part.blob)
        refs.append(f"![]({url_prefix}/{fname})")
    return refs


def main():
    src = sys.argv[1]
    out_md = sys.argv[2]
    media_dir = sys.argv[3]
    url_prefix = sys.argv[4].rstrip("/")

    os.makedirs(media_dir, exist_ok=True)
    os.makedirs(os.path.dirname(out_md), exist_ok=True)

    doc = Document(src)
    counter = [0]
    lines = ["# Uranium Glass Jewelry FAQs", ""]
    headers = 0

    for p in doc.paragraphs:
        text = p.text.strip()
        imgs = extract_images(p, doc, media_dir, url_prefix, counter)

        if text and para_is_header(p):
            lines += ["", f"## {text}", ""]
            headers += 1
        elif text:
            lines.append(text)
            lines.append("")

        for ref in imgs:
            lines.append(ref)
            lines.append("")

    # collapse 3+ blank lines to at most one
    md = []
    blank = 0
    for ln in lines:
        if ln.strip() == "":
            blank += 1
            if blank > 1:
                continue
        else:
            blank = 0
        md.append(ln)

    with open(out_md, "w", encoding="utf-8") as f:
        f.write("\n".join(md).strip() + "\n")

    print(f"Wrote {out_md}")
    print(f"Headers created: {headers}")
    print(f"Images extracted: {counter[0]} -> {media_dir}")


if __name__ == "__main__":
    main()
