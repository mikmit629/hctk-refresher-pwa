#!/usr/bin/env python3
"""Import HCTK activity content from the calendar-notification workbook.

The spreadsheet remains the editing surface. This script turns the two activity
tabs into the CONTENT_BANK arrays used by the intervention and control PWAs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

from openpyxl import load_workbook


SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent
CODING_DIR = APP_DIR.parent
DEFAULT_WORKBOOK = CODING_DIR / "HCTK Calendar Notification Content Map.xlsx"
DEFAULT_INTERVENTION_APP = APP_DIR / "app.js"
DEFAULT_CONTROL_APP = APP_DIR / "control" / "app.js"
ACTIVITY_COUNT = 26


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Transfer HCTK workbook activity rows into the PWA CONTENT_BANK arrays."
    )
    parser.add_argument("--workbook", type=Path, default=DEFAULT_WORKBOOK)
    parser.add_argument("--intervention-app", type=Path, default=DEFAULT_INTERVENTION_APP)
    parser.add_argument("--control-app", type=Path, default=DEFAULT_CONTROL_APP)
    parser.add_argument("--dry-run", action="store_true", help="Validate and report without writing app files.")
    args = parser.parse_args()

    workbook_path = args.workbook.expanduser().resolve()
    if not workbook_path.exists():
      raise SystemExit(f"Workbook not found: {workbook_path}")

    workbook = load_workbook(workbook_path, data_only=False)
    intervention = read_activity_sheet(workbook, "Intervention Activities", "content")
    control = read_activity_sheet(workbook, "Control Activities", "control-content")
    version = content_version(intervention, control)

    targets = [
        ("intervention", args.intervention_app.expanduser().resolve(), intervention),
        ("hosted control", args.control_app.expanduser().resolve(), control),
    ]

    for label, path, rows in targets:
        if not path.exists():
            print(f"Skipped {label}: {path} does not exist")
            continue
        next_text = replace_app_content(path.read_text(), rows, version)
        changed = next_text != path.read_text()
        if args.dry_run:
            print(f"Would update {label}: {path} ({len(rows)} activities, version {version}, changed={changed})")
        elif changed:
            path.write_text(next_text)
            print(f"Updated {label}: {path} ({len(rows)} activities, version {version})")
        else:
            print(f"No content changes for {label}: {path} ({len(rows)} activities, version {version})")


def read_activity_sheet(workbook: Any, sheet_name: str, default_id_prefix: str) -> list[dict[str, Any]]:
    if sheet_name not in workbook.sheetnames:
        raise SystemExit(f"Required sheet missing: {sheet_name}")

    sheet = workbook[sheet_name]
    headers = {
        normalize_header(cell.value): index + 1
        for index, cell in enumerate(sheet[1])
        if normalize_header(cell.value)
    }
    required = [
        "activity_number",
        "content_id",
        "format",
        "focus",
        "title",
        "prompt_or_question",
        "calendar_fact_or_fact_text",
        "correct_choice_index",
        "rationale",
    ]
    missing = [name for name in required if name not in headers]
    if missing:
        raise SystemExit(f"{sheet_name} missing required columns: {', '.join(missing)}")

    rows: list[dict[str, Any]] = []
    for row_number in range(2, ACTIVITY_COUNT + 2):
        activity_number = cell_text(sheet, headers, row_number, "activity_number")
        if not activity_number:
            continue
        try:
            sequence = int(float(activity_number))
        except ValueError as exc:
            raise SystemExit(f"{sheet_name} row {row_number}: activity_number must be numeric") from exc
        if sequence < 1 or sequence > ACTIVITY_COUNT:
            continue

        choices = [
            cell_text(sheet, headers, row_number, name)
            for name in ["choice_a", "choice_b", "choice_c", "choice_d"]
            if name in headers and cell_text(sheet, headers, row_number, name)
        ]
        correct_index = parse_correct_index(
            cell_text(sheet, headers, row_number, "correct_choice_index"),
            choices,
            sheet_name,
            row_number,
        )
        content_format = cell_text(sheet, headers, row_number, "format") or "Learning Card"
        calendar_fact = cell_text(sheet, headers, row_number, "calendar_fact_or_fact_text")
        prompt = cell_text(sheet, headers, row_number, "prompt_or_question")
        if not choices and not is_question_format(content_format) and not prompt:
            prompt = calendar_fact

        legacy_image = cell_text(sheet, headers, row_number, "image_path")
        media_path = cell_text(sheet, headers, row_number, "media_path") or legacy_image or "assets/blank-card.svg"
        media_type = normalize_media_type(
            cell_text(sheet, headers, row_number, "media_type") or infer_media_type(media_path)
        )
        media_alt = cell_text(sheet, headers, row_number, "media_alt")
        content_id = cell_text(sheet, headers, row_number, "content_id") or f"{default_id_prefix}-{sequence:03d}"
        rows.append({
            "id": content_id,
            "format": content_format,
            "focus": cell_text(sheet, headers, row_number, "focus") or "Generic",
            "title": cell_text(sheet, headers, row_number, "title") or f"Activity {sequence}",
            "prompt": prompt,
            "mediaType": media_type,
            "mediaPath": media_path,
            "mediaAlt": media_alt or f"{cell_text(sheet, headers, row_number, 'focus') or 'Activity'} media",
            "image": media_path if media_type != "link" else "assets/blank-card.svg",
            "choices": choices,
            "correctIndex": correct_index,
            "rationale": cell_text(sheet, headers, row_number, "rationale"),
            "calendarFact": calendar_fact,
        })

    rows.sort(key=lambda item: content_sort_key(item["id"]))
    if len(rows) != ACTIVITY_COUNT:
        raise SystemExit(f"{sheet_name} must contain exactly {ACTIVITY_COUNT} activities; found {len(rows)}")
    if len({row["id"] for row in rows}) != ACTIVITY_COUNT:
        raise SystemExit(f"{sheet_name} content_id values must be unique")
    return rows


def normalize_header(value: Any) -> str:
    return str(value or "").strip().lower()


def cell_text(sheet: Any, headers: dict[str, int], row_number: int, name: str) -> str:
    column = headers.get(name)
    if not column:
        return ""
    value = sheet.cell(row=row_number, column=column).value
    if value is None:
        return ""
    return str(value).replace("\r\n", "\n").replace("\r", "\n").strip()


def parse_correct_index(value: str, choices: list[str], sheet_name: str, row_number: int) -> int:
    if not choices:
        return 0
    if not value:
        return 0
    try:
        one_based = int(float(value))
    except ValueError as exc:
        raise SystemExit(f"{sheet_name} row {row_number}: correct_choice_index must be numeric") from exc
    if one_based < 1 or one_based > len(choices):
        raise SystemExit(
            f"{sheet_name} row {row_number}: correct_choice_index {one_based} is outside available choices"
        )
    return one_based - 1


def is_question_format(value: str) -> bool:
    return bool(re.search(r"question|quiz|check", value, re.IGNORECASE))


def normalize_media_type(value: str) -> str:
    media_type = str(value or "").strip().lower()
    return media_type if media_type in {"image", "gif", "video", "link"} else "image"


def infer_media_type(path: str) -> str:
    text = str(path or "").strip().lower()
    if text.startswith(("http://", "https://")):
        return "link"
    if re.search(r"\.(mp4|webm|mov|m4v)(\?|#|$)", text):
        return "video"
    if re.search(r"\.gif(\?|#|$)", text):
        return "gif"
    return "image"


def content_sort_key(content_id: str) -> tuple[int, str]:
    match = re.search(r"(\d+)$", content_id)
    return (int(match.group(1)) if match else 10_000, content_id)


def content_version(intervention: list[dict[str, Any]], control: list[dict[str, Any]]) -> str:
    payload = json.dumps(
        {"intervention": intervention, "control": control},
        ensure_ascii=True,
        sort_keys=True,
        separators=(",", ":"),
    )
    return f"spreadsheet-{hashlib.sha256(payload.encode()).hexdigest()[:12]}"


def replace_app_content(source: str, rows: list[dict[str, Any]], version: str) -> str:
    content_bank = format_content_bank(rows)
    next_source = re.sub(
        r"(?:const|window\.HCTK_CONTENT_BANK_VERSION =) [^;]*;",
        f"window.HCTK_CONTENT_BANK_VERSION = '{version}';",
        source,
        count=1,
    )
    pattern = re.compile(r"window\.HCTK_CONTENT_BANK = \[[\s\S]*?\n\];")
    replacement = content_bank.replace("const CONTENT_BANK =", "window.HCTK_CONTENT_BANK =")
    next_source, count = pattern.subn(replacement, next_source, count=1)
    if count != 1:
        raise SystemExit("Could not find HCTK_CONTENT_BANK block to replace")
    return next_source


def format_content_bank(rows: list[dict[str, Any]]) -> str:
    parts = ["const CONTENT_BANK = ["]
    for index, item in enumerate(rows):
        parts.extend([
            "  {",
            f"    id: {js_string(item['id'])},",
            f"    format: {js_string(item['format'])},",
            f"    focus: {js_string(item['focus'])},",
            f"    title: {js_string(item['title'])},",
            f"    prompt: {js_string(item['prompt'])},",
            f"    mediaType: {js_string(item['mediaType'])},",
            f"    mediaPath: {js_string(item['mediaPath'])},",
            f"    mediaAlt: {js_string(item['mediaAlt'])},",
            f"    image: {js_string(item['image'])},",
            "    choices: [",
        ])
        for choice_index, choice in enumerate(item["choices"]):
            comma = "," if choice_index < len(item["choices"]) - 1 else ""
            parts.append(f"      {js_string(choice)}{comma}")
        parts.extend([
            "    ],",
            f"    correctIndex: {int(item['correctIndex'])},",
            f"    rationale: {js_string(item['rationale'])},",
            f"    calendarFact: {js_string(item['calendarFact'])}",
            "  }" + ("," if index < len(rows) - 1 else ""),
        ])
    parts.append("];")
    return "\n".join(parts)


def js_string(value: Any) -> str:
    text = str(value or "")
    escaped = (
        text
        .replace("\\", "\\\\")
        .replace("\n", "\\n")
        .replace("'", "\\'")
    )
    return f"'{escaped}'"


if __name__ == "__main__":
    main()
