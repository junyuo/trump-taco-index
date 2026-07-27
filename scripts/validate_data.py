#!/usr/bin/env python3
"""Validate the repository's static dashboard JSON without external packages."""

from __future__ import annotations

import json
import math
from datetime import date, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public" / "data"
INDICATOR_KEYS = ("brent", "us10y", "hormuz", "sp500")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def load_json(name: str) -> Any:
    with (DATA_DIR / name).open(encoding="utf-8") as source:
        return json.load(source)


def finite_number(value: object, field: str) -> float:
    require(
        isinstance(value, (int, float)) and not isinstance(value, bool),
        f"{field} must be numeric",
    )
    number = float(value)
    require(math.isfinite(number), f"{field} must be finite")
    return number


def validate_iso_datetime(value: object, field: str) -> None:
    require(isinstance(value, str), f"{field} must be a string")
    datetime.fromisoformat(value.replace("Z", "+00:00"))


def validate_iso_date(value: object, field: str) -> None:
    require(isinstance(value, str), f"{field} must be a string")
    date.fromisoformat(value)


def validate_latest(payload: object) -> None:
    require(isinstance(payload, dict), "latest.json must contain an object")
    validate_iso_datetime(payload.get("asOf"), "latest.asOf")
    validate_iso_datetime(
        payload.get("lastSuccessfulUpdate"), "latest.lastSuccessfulUpdate"
    )
    require(
        payload.get("dataMode") in {"live", "delayed", "manual", "demo"},
        "latest.dataMode is invalid",
    )
    index = payload.get("index")
    require(isinstance(index, dict), "latest.index must be an object")
    score = finite_number(index.get("score"), "latest.index.score")
    require(0 <= score <= 100, "latest.index.score must be 0..100")
    finite_number(index.get("compositeZ"), "latest.index.compositeZ")

    indicators = payload.get("indicators")
    require(isinstance(indicators, dict), "latest.indicators must be an object")
    require(set(indicators) == set(INDICATOR_KEYS), "indicator keys are incomplete")
    for key in INDICATOR_KEYS:
        item = indicators[key]
        require(isinstance(item, dict), f"{key} must be an object")
        for field in (
            "value",
            "dailyChangePercent",
            "zScore",
            "pressureZ",
            "weight",
            "contribution",
        ):
            finite_number(item.get(field), f"{key}.{field}")
        require(
            item.get("dataStatus")
            in {"realtime", "delayed", "manual", "simulated"},
            f"{key}.dataStatus is invalid",
        )
        validate_iso_date(item.get("asOfDate"), f"{key}.asOfDate")


def validate_history(payload: object) -> None:
    require(isinstance(payload, list), "history.json must contain an array")
    previous_date = ""
    for position, item in enumerate(payload):
        require(isinstance(item, dict), f"history[{position}] must be an object")
        item_date = item.get("date")
        validate_iso_date(item_date, f"history[{position}].date")
        require(item_date >= previous_date, "history must be sorted by date")
        previous_date = item_date
        score = finite_number(item.get("score"), f"history[{position}].score")
        require(0 <= score <= 100, f"history[{position}].score must be 0..100")
        for field in (
            "compositeZ",
            "brentZ",
            "us10yZ",
            "hormuzZ",
            "sp500Z",
        ):
            finite_number(item.get(field), f"history[{position}].{field}")


def validate_events(payload: object) -> None:
    require(isinstance(payload, list), "events.json must contain an array")
    seen_ids: set[str] = set()
    for position, item in enumerate(payload):
        require(isinstance(item, dict), f"events[{position}] must be an object")
        event_id = item.get("id")
        require(isinstance(event_id, str) and event_id, "event id is required")
        require(event_id not in seen_ids, f"duplicate event id: {event_id}")
        seen_ids.add(event_id)
        validate_iso_date(item.get("threatDate"), f"events[{position}].threatDate")
        pivot_date = item.get("pivotDate")
        if pivot_date is not None:
            validate_iso_date(pivot_date, f"events[{position}].pivotDate")
        require(isinstance(item.get("sources"), list), "event sources must be an array")


def main() -> None:
    validate_latest(load_json("latest.json"))
    validate_history(load_json("history.json"))
    validate_events(load_json("events.json"))
    print("Validated latest.json, history.json, and events.json")


if __name__ == "__main__":
    main()
