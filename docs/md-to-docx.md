# Markdown → Word (.docx)

How we export product docs (e.g. information architecture) to Word with usable formatting.

## Quick start

```bash
# IA export (recommended options + table fix)
./scripts/md-to-docx.sh \
  docs/information-architecture.md \
  docs/information-architecture.docx \
  docs/ia-docx-options.json

# PRD export
./scripts/md-to-docx.sh \
  docs/prd.md \
  docs/prd.docx \
  docs/prd-docx-options.json

# Any markdown file → sibling .docx
./scripts/md-to-docx.sh docs/tenancy-implementation-plan.md
```

Make the script executable once: `chmod +x scripts/md-to-docx.sh`.

## What the pipeline does

1. **Install once** `@mohtasham/md-to-docx` into `~/.cache/apas-md-to-docx` (not a project dependency).
2. **Inject `[TOC]`** after the first `---` in the markdown if missing, so Word gets a contents list.
3. **Convert** Markdown → DOCX with the cached CLI.
4. **Fix tables** with `scripts/fix-docx-tables.py` — see below.

### Why the table fix is required

The converter sets the table width to roughly full page (`tblW ≈ 9000+` twips) but every column to **`gridCol w:w="100"`** (~1.8mm). Word then wraps **one character per line**. The Python script redistributes column widths evenly across the table width and sets `tblLayout` to `autofit`.

Always run the fix after convert. The shell script does both.

## Options JSON

Optional third argument. Example used for the IA doc: `docs/ia-docx-options.json`.

Useful keys:

| Key | Purpose |
|---|---|
| `documentType` | `"report"` or `"document"` |
| `metadata` | Title, creator, language, etc. |
| `toc` | `{ "title", "minDepth", "maxDepth" }` |
| `style.fontFamily` / heading sizes / colours | Body and heading look |
| `style.tableLayout` | Prefer `"autofit"` |
| `template.headers` / `footers` | Running header/footer text |
| `template.pageNumbering` | Page numbers |

`tableWidthTwips` alone does **not** fix column collapse; the post-process script does.

## Manual two-step (if you skip the shell script)

```bash
npx --yes @mohtasham/md-to-docx input.md output.docx --options docs/ia-docx-options.json
python3 scripts/fix-docx-tables.py output.docx
```

## Files

| Path | Role |
|---|---|
| `scripts/md-to-docx.sh` | One-command convert + table fix |
| `scripts/fix-docx-tables.py` | Redistribute Word table column widths |
| `docs/ia-docx-options.json` | Styling for the IA export |
| `docs/prd-docx-options.json` | Styling for the PRD export |

## Writing Markdown that converts cleanly

- Put a `---` soon after the title so the script can inject `[TOC]`.
- Prefer **two-column** tables; three columns are fine if cells stay short.
- Avoid HTML entities (`&lt;`) — write “under 30 minutes” instead.
- Prefer plain paths (`/account`) over dense markdown links inside tables.
- Leave a blank line before and after every table.
- Keep requirement tables as `ID | Requirement` — they read well in Word.
- Do not rely on nested HTML, merged cells, or emoji.

## Tips

- Reopen the `.docx` in Word/Pages after regenerating (or close and reopen) so you are not looking at a cached open file.
- Prefer updating the `.md` source, then re-running the script — do not treat the `.docx` as the source of truth.
- Complex tables (merged cells, nested tables) are not specially handled; markdown GFM tables only.
