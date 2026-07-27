from __future__ import annotations

import copy
import json
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from smoke_deployment import run_smoke
from validate_data import load_json, validate_latest


NOW = datetime(2026, 7, 27, 12, tzinfo=timezone.utc)


def live_fixture() -> dict:
    indicator = {
        "label": "Market fixture",
        "value": 100,
        "unit": "points",
        "dailyChangePercent": 1,
        "zScore": 1,
        "pressureZ": 1,
        "weight": 0.25,
        "contribution": 0.25,
        "source": "Official source",
        "sourceUrl": "https://example.com/source",
        "asOfDate": "2026-07-25",
        "dataStatus": "delayed",
    }
    return {
        "asOf": "2026-07-20T00:00:00Z",
        "lastSuccessfulUpdate": NOW.isoformat(),
        "dataMode": "delayed",
        "index": {"score": 30, "compositeZ": 1, "status": "test"},
        "indicators": {
            "brent": {**indicator, "weight": 0.3},
            "us10y": indicator,
            "hormuz": {
                **indicator,
                "unit": "vessels/day",
                "asOfDate": "2026-07-20",
            },
            "sp500": {**indicator, "weight": 0.2},
        },
    }


class LiveValidationTests(unittest.TestCase):
    def test_accepts_traceable_fresh_live_data(self) -> None:
        validate_latest(live_fixture(), require_live=True, now=NOW)

    def test_rejects_missing_source_url_and_demo_marker(self) -> None:
        missing_url = copy.deepcopy(live_fixture())
        del missing_url["indicators"]["brent"]["sourceUrl"]
        with self.assertRaisesRegex(ValueError, "sourceUrl"):
            validate_latest(missing_url, require_live=True, now=NOW)

        demo = copy.deepcopy(live_fixture())
        demo["indicators"]["sp500"]["source"] = "Demo data"
        with self.assertRaisesRegex(ValueError, "demo"):
            validate_latest(demo, require_live=True, now=NOW)

    def test_rejects_stale_market_and_hormuz_data(self) -> None:
        market = copy.deepcopy(live_fixture())
        market["indicators"]["brent"]["asOfDate"] = "2026-07-22"
        with self.assertRaisesRegex(ValueError, "96"):
            validate_latest(market, require_live=True, now=NOW)

        hormuz = copy.deepcopy(live_fixture())
        hormuz["indicators"]["hormuz"]["asOfDate"] = "2026-07-16"
        hormuz["asOf"] = "2026-07-16T00:00:00Z"
        with self.assertRaisesRegex(ValueError, "240"):
            validate_latest(hormuz, require_live=True, now=NOW)

    def test_smoke_retries_three_times(self) -> None:
        attempts: list[str] = []

        def failing_fetcher(url: str) -> dict:
            attempts.append(url)
            raise OSError("temporary failure")

        with self.assertRaisesRegex(RuntimeError, "3 attempts"):
            run_smoke(
                "https://example.com/project/",
                require_live=False,
                fetcher=failing_fetcher,
                sleeper=lambda _: None,
            )
        self.assertEqual(len(attempts), 3)

    def test_smoke_accepts_matching_repository_data(self) -> None:
        expected = load_json("latest.json")
        run_smoke(
            "https://example.com/project/",
            require_live=False,
            fetcher=lambda _: expected,
            sleeper=lambda _: None,
        )

    def test_smoke_rejects_remote_mismatch(self) -> None:
        remote = copy.deepcopy(load_json("latest.json"))
        remote["index"]["score"] = remote["index"]["score"] + 1
        with self.assertRaisesRegex(RuntimeError, "3 attempts"):
            run_smoke(
                "https://example.com/project/",
                require_live=False,
                fetcher=lambda _: remote,
                sleeper=lambda _: None,
            )


if __name__ == "__main__":
    unittest.main()
