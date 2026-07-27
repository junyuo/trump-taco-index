#!/usr/bin/env python3
"""Validate the repository's static dashboard JSON without external packages."""

from __future__ import annotations

import argparse
import json
import math
from datetime import date, datetime, time, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public" / "data"
INDICATOR_KEYS = ("brent", "us10y", "hormuz", "sp500")
LIVE_STALE_HOURS = {"brent": 192, "us10y": 96, "hormuz": 240, "sp500": 96}
FORBIDDEN_LIVE_MARKERS = ("demo", "simulated", "manual")


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


def validate_iso_datetime(value: object, field: str) -> datetime:
    require(isinstance(value, str), f"{field} must be a string")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    require(parsed.tzinfo is not None, f"{field} must include a timezone")
    return parsed


def validate_iso_date(value: object, field: str) -> date:
    require(isinstance(value, str), f"{field} must be a string")
    return date.fromisoformat(value)


def validate_latest(
    payload: object,
    *,
    require_live: bool = False,
    now: datetime | None = None,
) -> None:
    require(isinstance(payload, dict), "latest.json must contain an object")
    as_of = validate_iso_datetime(payload.get("asOf"), "latest.asOf")
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
    observation_dates: list[date] = []
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
        observation_date = validate_iso_date(
            item.get("asOfDate"), f"{key}.asOfDate"
        )
        observation_dates.append(observation_date)

        if require_live:
            require(
                item.get("dataStatus") == "delayed",
                f"{key}.dataStatus must be delayed in live mode",
            )
            require(
                isinstance(item.get("source"), str) and item["source"],
                f"{key}.source is required in live mode",
            )
            require(
                isinstance(item.get("sourceUrl"), str)
                and item["sourceUrl"].startswith(("https://", "http://")),
                f"{key}.sourceUrl is required in live mode",
            )
            validation_time = now or datetime.now(timezone.utc)
            if validation_time.tzinfo is None:
                validation_time = validation_time.replace(tzinfo=timezone.utc)
            observation_time = datetime.combine(
                observation_date, time.max, tzinfo=timezone.utc
            )
            age_hours = (
                validation_time.astimezone(timezone.utc) - observation_time
            ).total_seconds() / 3600
            require(age_hours >= 0, f"{key}.asOfDate cannot be in the future")
            require(
                age_hours <= LIVE_STALE_HOURS[key],
                f"{key} exceeds {LIVE_STALE_HOURS[key]} hour freshness limit",
            )

    if require_live:
        require(
            payload.get("dataMode") == "delayed",
            "latest.dataMode must be delayed in live mode",
        )
        require(
            as_of.astimezone(timezone.utc).date() == min(observation_dates),
            "latest.asOf must equal the oldest indicator observation date",
        )
        require(
            indicators["hormuz"].get("unit") == "vessels/day",
            "hormuz.unit must be vessels/day in live mode",
        )
        serialized = json.dumps(payload, ensure_ascii=False).lower()
        require(
            not any(marker in serialized for marker in FORBIDDEN_LIVE_MARKERS),
            "live latest.json contains demo, simulated, or manual markers",
        )


def validate_history(payload: object, *, require_backfill: bool = False) -> None:
    require(isinstance(payload, list), "history.json must contain an array")
    if require_backfill:
        require(len(payload) == 252, "history.json must contain exactly 252 points")
    previous_date = ""
    for position, item in enumerate(payload):
        require(isinstance(item, dict), f"history[{position}] must be an object")
        item_date = item.get("date")
        validate_iso_date(item_date, f"history[{position}].date")
        require(item_date > previous_date, "history dates must be strictly increasing")
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--require-live",
        action="store_true",
        help="Require delayed, traceable, fresh live market data.",
    )
    parser.add_argument(
        "--require-backfill",
        action="store_true",
        help="Require exactly 252 strictly ordered history points.",
    )
    parser.add_argument(
        "--history-file",
        type=Path,
        help="Validate a candidate history file instead of public/data/history.json.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    validate_latest(load_json("latest.json"), require_live=args.require_live)
    history = (
        json.loads(args.history_file.read_text(encoding="utf-8"))
        if args.history_file
        else load_json("history.json")
    )
    validate_history(history, require_backfill=args.require_backfill)
    validate_events(load_json("events.json"))
    modes = [
        label
        for enabled, label in (
            (args.require_live, "live readiness"),
            (args.require_backfill, "252-point backfill"),
        )
        if enabled
    ]
    mode = " + ".join(modes) or "schema"
    print(f"Validated latest.json, history.json, and events.json ({mode})")


if __name__ == "__main__":
    main()
