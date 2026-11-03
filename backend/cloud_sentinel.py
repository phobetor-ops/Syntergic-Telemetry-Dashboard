#!/usr/bin/env python3
"""Syntergic Autonomous Cloud Sentinel (Headless GitHub Actions & CLI Runner).

Synchronizes all 15 official global OSINT feeds across the 7 Strategic Fronts,
computes the global thermal entropy (Omega Index), deduplicates critical spikes
using a state cache, and dispatches real-time Emergency Alerts and Daily
7-Front Panorama Digests via the Telegram Bot API.

Usage:
  python backend/cloud_sentinel.py --mode sentinel
  python backend/cloud_sentinel.py --mode digest
  python backend/cloud_sentinel.py --mode both
  python backend/cloud_sentinel.py --mode both --dry-run
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import sys
from typing import Any, Dict, List, Set, Tuple

# Ensure backend directory is on sys.path whether invoked from root or backend/
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from live_osint import get_live_osint_catalog
from telegram_notifier import (
    format_emergency_spike_alert,
    format_global_panorama_digest,
    load_dotenv_files,
    send_telegram_message,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
    stream=sys.stdout,
)
logger = logging.getLogger("syntergic.cloud_sentinel")

CACHE_FILE = BACKEND_DIR / ".cache" / "sentinel_seen_hashes.json"


def load_seen_hashes() -> Set[str]:
    """Loads previously notified event SHA-256 fingerprints from disk cache."""
    if not CACHE_FILE.is_file():
        return set()
    try:
        data = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        hashes = data.get("seen_hashes", [])
        return set(str(h) for h in hashes)
    except Exception as exc:
        logger.warning("Failed to read sentinel cache (%s): %s", CACHE_FILE, exc)
        return set()


def save_seen_hashes(hashes: Set[str]) -> None:
    """Persists seen SHA-256 fingerprints (bounded to latest 1000) for GitHub Actions caching."""
    try:
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        bounded = sorted(list(hashes))[-1000:]
        payload = {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "count": len(bounded),
            "seen_hashes": bounded,
        }
        CACHE_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    except Exception as exc:
        logger.warning("Failed to write sentinel cache (%s): %s", CACHE_FILE, exc)


def evaluate_global_state(events: List[Dict[str, Any]]) -> Tuple[float, str, List[Dict[str, Any]]]:
    """Computes global moving average Omega, Threat Level, and filters CRITICAL (RED) events."""
    if not events:
        return 0.25, "GREEN", []

    omegas: List[float] = []
    critical_events: List[Dict[str, Any]] = []

    for ev in events:
        sf = float(ev.get("base_friction", 0.3))
        si = float(ev.get("base_inertia", 0.3))
        omega = round(0.5 * sf + 0.5 * si, 3)
        omegas.append(omega)
        if omega > 0.70 or ev.get("severity") == "CRITICAL":
            critical_events.append(ev)

    # Sort critical events by highest entropy first
    critical_events.sort(
        key=lambda x: 0.5 * float(x.get("base_friction", 0)) + 0.5 * float(x.get("base_inertia", 0)),
        reverse=True,
    )

    # Top-10 moving average window (matching Stage 3 Dispatcher)
    top_window = omegas[:10] if len(omegas) >= 10 else omegas
    global_omega = round(sum(top_window) / len(top_window), 3)

    if global_omega > 0.70:
        threat_level = "RED"
    elif global_omega >= 0.40:
        threat_level = "YELLOW"
    else:
        threat_level = "GREEN"

    return global_omega, threat_level, critical_events


def run_sentinel_pipeline(mode: str = "sentinel", dry_run: bool = False, force_notify: bool = False) -> int:
    """Executes the cloud reconnaissance and Telegram alerting pipeline."""
    load_dotenv_files()
    logger.info("Initializing Syntergic Cloud Sentinel [mode=%s, dry_run=%s]...", mode, dry_run)

    events = get_live_osint_catalog(force_refresh=True)
    if not events:
        logger.error("No live OSINT events retrieved. Exiting.")
        return 1

    global_omega, threat_level, critical_events = evaluate_global_state(events)
    logger.info(
        "Scan complete: %d total events | %d CRITICAL (RED) | Global Omega=%.3f (%s)",
        len(events),
        len(critical_events),
        global_omega,
        threat_level,
    )

    seen_hashes = load_seen_hashes()
    new_critical: List[Dict[str, Any]] = []

    for ev in critical_events:
        fp = ev.get("evidence", {}).get("sha256_fingerprint") or ev.get("headline", "")
        if force_notify or fp not in seen_hashes:
            new_critical.append(ev)
            if fp:
                seen_hashes.add(fp)

    # Job 1: Sentinel (Emergency Alerting on new critical spikes)
    if mode in ("sentinel", "both"):
        if new_critical:
            logger.info("Dispatching Emergency Alert for %d new critical spikes...", len(new_critical))
            alert_msg = format_emergency_spike_alert(
                critical_events=new_critical,
                global_omega=global_omega,
                threat_level=threat_level,
                total_scanned=len(events),
            )
            ok = send_telegram_message(alert_msg, dry_run=dry_run)
            if ok and not dry_run:
                save_seen_hashes(seen_hashes)
        else:
            logger.info("No unseen CRITICAL spikes since last Sentinel scan. Skipping emergency alert.")

    # Job 2: Digest (Consolidated 7-Front Panorama Report)
    if mode in ("digest", "both"):
        logger.info("Dispatching 7-Front Global Entropy Panorama Digest...")
        digest_msg = format_global_panorama_digest(
            all_events=events,
            global_omega=global_omega,
            threat_level=threat_level,
        )
        send_telegram_message(digest_msg, dry_run=dry_run)

    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Syntergic Autonomous Cloud Sentinel (7-Front OSINT & Telegram Dispatcher)"
    )
    parser.add_argument(
        "--mode",
        choices=["sentinel", "digest", "both"],
        default="sentinel",
        help="Pipeline mode: 'sentinel' (emergency RED spikes), 'digest' (7-front summary), or 'both'.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run full OSINT scan and print formatted Telegram messages without sending to Telegram API.",
    )
    parser.add_argument(
        "--force-notify",
        action="store_true",
        help="Ignore deduplication cache and send alerts for all current critical spikes.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    sys.exit(run_sentinel_pipeline(mode=args.mode, dry_run=args.dry_run, force_notify=args.force_notify))
