#!/usr/bin/env python3
"""Validate the deployed latest.json against the repository copy."""

from __future__ import annotations

import argparse
import json
import time
from collections.abc import Callable
from typing import Any
from urllib.request import Request, urlopen

from validate_data import load_json, validate_history, validate_latest

MAX_ATTEMPTS = 3


def fetch_json(url: str) -> Any:
    request = Request(url, headers={"User-Agent": "trump-taco-index-smoke"})
    with urlopen(request, timeout=20) as response:
        if response.status != 200:
            raise RuntimeError(f"deployment returned HTTP {response.status}")
        return json.load(response)


def run_smoke(
    base_url: str,
    *,
    require_live: bool,
    fetcher: Callable[[str], Any] = fetch_json,
    sleeper: Callable[[float], None] = time.sleep,
) -> None:
    expected_latest = load_json("latest.json")
    expected_history = load_json("history.json")
    validate_latest(expected_latest, require_live=require_live)
    validate_history(expected_history)
    latest_endpoint = f"{base_url.rstrip('/')}/data/latest.json"
    history_endpoint = f"{base_url.rstrip('/')}/data/history.json"
    last_error: Exception | None = None

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            cache_buster = int(time.time())
            remote_latest = fetcher(f"{latest_endpoint}?smoke={cache_buster}")
            remote_history = fetcher(f"{history_endpoint}?smoke={cache_buster}")
            validate_latest(remote_latest, require_live=require_live)
            validate_history(remote_history)
            if remote_latest != expected_latest:
                raise ValueError(
                    "deployed latest.json does not match the repository copy"
                )
            if remote_history != expected_history:
                raise ValueError(
                    "deployed history.json does not match the repository copy"
                )
            print(
                f"Deployment smoke passed on attempt {attempt}: "
                f"{latest_endpoint} and {history_endpoint}"
            )
            return
        except Exception as error:  # noqa: BLE001 - bounded retry logs any failure
            last_error = error
            print(f"Deployment smoke attempt {attempt}/{MAX_ATTEMPTS} failed: {error}")
            if attempt < MAX_ATTEMPTS:
                sleeper(attempt * 10)

    raise RuntimeError("deployment smoke failed after 3 attempts") from last_error


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--require-live", action="store_true")
    args = parser.parse_args()
    run_smoke(args.base_url, require_live=args.require_live)


if __name__ == "__main__":
    main()
