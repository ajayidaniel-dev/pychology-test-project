#!/usr/bin/env python3
"""Fix collapsed table columns in a .docx produced by md-to-docx.

The converter sets tblW to ~full page width but every gridCol to 100 twips
(~1.8mm), so Word wraps one character per line. Redistribute columns evenly.
"""

from __future__ import annotations

import re
import sys
import zipfile
from pathlib import Path


def fix_table(table: str) -> str:
    width_match = re.search(r'<w:tblW[^>]*w:w="(\d+)"', table)
    table_width = int(width_match.group(1)) if width_match else 9360
    col_count = len(re.findall(r"<w:gridCol\b", table))
    if col_count == 0:
        return table

    base = table_width // col_count
    remainder = table_width - base * col_count
    widths: list[int] = []
    for i in range(col_count):
        widths.append(base + (remainder if i == 0 else 0))

    index = 0

    def replace_grid(_m: re.Match[str]) -> str:
        nonlocal index
        w = widths[index]
        index += 1
        return f'<w:gridCol w:w="{w}"/>'

    next_xml = re.sub(r"<w:gridCol[^>]*/>", replace_grid, table)

    if "w:tblLayout" not in next_xml:
        next_xml = next_xml.replace(
            "<w:tblPr>",
            '<w:tblPr><w:tblLayout w:type="autofit"/>',
            1,
        )
    else:
        next_xml = re.sub(
            r"<w:tblLayout[^>]*/>",
            '<w:tblLayout w:type="autofit"/>',
            next_xml,
        )

    # Approximate cell width = equal share (good enough for markdown tables).
    cell_w = base

    def fix_tc_pr(m: re.Match[str]) -> str:
        inner = m.group(1)
        tcw = f'<w:tcW w:type="dxa" w:w="{cell_w}"/>'
        if re.search(r"<w:tcW\b", inner):
            inner = re.sub(r"<w:tcW[^>]*/>", tcw, inner)
            return f"<w:tcPr>{inner}</w:tcPr>"
        return f"<w:tcPr>{tcw}{inner}</w:tcPr>"

    next_xml = re.sub(r"<w:tcPr>([\s\S]*?)</w:tcPr>", fix_tc_pr, next_xml)
    return next_xml


def main() -> None:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/information-architecture.docx")
    with zipfile.ZipFile(path, "r") as zin:
        files = {name: zin.read(name) for name in zin.namelist()}
        info = {name: zin.getinfo(name) for name in zin.namelist()}

    xml = files["word/document.xml"].decode("utf-8")
    fixed = re.sub(r"<w:tbl>[\s\S]*?</w:tbl>", lambda m: fix_table(m.group(0)), xml)
    files["word/document.xml"] = fixed.encode("utf-8")

    # Verify
    sample = re.findall(r'<w:gridCol w:w="(\d+)"/>', fixed)[:8]
    print("sample gridCol widths:", sample)

    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for name, data in files.items():
            zout.writestr(info[name], data)

    print(f"fixed tables in {path}")


if __name__ == "__main__":
    main()
