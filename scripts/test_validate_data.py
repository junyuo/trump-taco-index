from __future__ import annotations

import copy
import json
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from smoke_deployment import run_smoke
from validate_data import load_json, validate_events, validate_history, validate_latest


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
        market["indicators"]["sp500"]["asOfDate"] = "2026-07-22"
        with self.assertRaisesRegex(ValueError, "96"):
            validate_latest(market, require_live=True, now=NOW)

        brent = copy.deepcopy(live_fixture())
        brent["indicators"]["brent"]["asOfDate"] = "2026-07-18"
        brent["asOf"] = "2026-07-18T00:00:00Z"
        with self.assertRaisesRegex(ValueError, "192"):
            validate_latest(brent, require_live=True, now=NOW)

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
        expected_latest = load_json("latest.json")
        expected_history = load_json("history.json")
        run_smoke(
            "https://example.com/project/",
            require_live=False,
            fetcher=lambda url: (
                expected_history if "history.json" in url else expected_latest
            ),
            sleeper=lambda _: None,
        )

    def test_smoke_rejects_remote_mismatch(self) -> None:
        remote = copy.deepcopy(load_json("latest.json"))
        remote["index"]["score"] = remote["index"]["score"] + 1
        expected_history = load_json("history.json")
        with self.assertRaisesRegex(RuntimeError, "3 attempts"):
            run_smoke(
                "https://example.com/project/",
                require_live=False,
                fetcher=lambda url: (
                    expected_history if "history.json" in url else remote
                ),
                sleeper=lambda _: None,
            )

    def test_smoke_rejects_remote_history_mismatch(self) -> None:
        expected_latest = load_json("latest.json")
        remote_history = copy.deepcopy(load_json("history.json"))
        remote_history[0]["score"] = remote_history[0]["score"] + 1
        with self.assertRaisesRegex(RuntimeError, "3 attempts"):
            run_smoke(
                "https://example.com/project/",
                require_live=False,
                fetcher=lambda url: (
                    remote_history if "history.json" in url else expected_latest
                ),
                sleeper=lambda _: None,
            )

    def test_backfill_requires_252_unique_ordered_points(self) -> None:
        point = {
            "date": "2026-01-01",
            "score": 1,
            "compositeZ": 0.1,
            "brentZ": 0.1,
            "us10yZ": 0.1,
            "hormuzZ": 0.1,
            "sp500Z": 0.1,
        }
        with self.assertRaisesRegex(ValueError, "252"):
            validate_history([point], require_backfill=True)
        with self.assertRaisesRegex(ValueError, "strictly increasing"):
            validate_history([point, copy.deepcopy(point)])

    def test_verified_event_requires_auditable_sources(self) -> None:
        event = {
            "id": "verified-event",
            "threatDate": "2025-04-02",
            "pivotDate": "2025-04-09",
            "daysToPivot": 7,
            "confidence": "medium",
            "marketEvidence": {
                "baselineScore": 20,
                "peakScore": 35,
                "scoreChange": 15,
            },
            "criteria": {
                "threatConfirmed": True,
                "pivotConfirmed": True,
                "marketStressObserved": True,
                "timingAligned": True,
                "contemporaneousLink": True,
            },
            "sources": [
                {
                    "type": source_type,
                    "date": "2025-04-09",
                    "url": f"https://example.com/{source_type}",
                }
                for source_type in ("primary-policy", "market-data", "reporting")
            ],
        }
        validate_events([event], require_verified=True)

        missing_market = copy.deepcopy(event)
        missing_market["sources"] = missing_market["sources"][:1]
        with self.assertRaisesRegex(ValueError, "policy, market, and reporting"):
            validate_events([missing_market], require_verified=True)


if __name__ == "__main__":
    unittest.main()
