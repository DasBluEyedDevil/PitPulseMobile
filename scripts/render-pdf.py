import os
import sys

import fitz

pdf_path = sys.argv[1]
out_dir = sys.argv[2]
os.makedirs(out_dir, exist_ok=True)

doc = fitz.open(pdf_path)
for i in range(len(doc)):
    doc[i].get_pixmap(matrix=fitz.Matrix(2, 2)).save(os.path.join(out_dir, f"page{i + 1}.png"))
print(f"rendered {len(doc)} pages to {out_dir}")
