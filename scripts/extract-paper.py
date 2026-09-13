"""Extract the original paper figures. Requires pymupdf and pillow."""
from pathlib import Path
import shutil
import fitz
from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[1]
document = fitz.open(root / 'paper.pdf')
assets = root / 'public' / 'assets'
assets.mkdir(parents=True, exist_ok=True)
for name, page, bounds in [
    ('architecture', 2, (55, 30, 560, 295)),
    ('comparison', 6, (56, 60, 555, 304)),
]:
    pixmap = document[page].get_pixmap(matrix=fitz.Matrix(3, 3), clip=fitz.Rect(*bounds))
    image = Image.frombytes('RGB', [pixmap.width, pixmap.height], pixmap.samples)
    difference = ImageChops.difference(image, Image.new('RGB', image.size, 'white')).convert('L')
    box = difference.point(lambda v: 255 if v > 25 else 0).getbbox()
    if box:
        pad = 15
        image = image.crop((max(0, box[0]-pad), max(0, box[1]-pad), min(image.width, box[2]+pad), min(image.height, box[3]+pad)))
    image.save(assets / f'{name}.webp', quality=92)
    print(f'{name}: {image.width} × {image.height}')
shutil.copyfile(root / 'paper.pdf', root / 'public' / 'paper.pdf')
