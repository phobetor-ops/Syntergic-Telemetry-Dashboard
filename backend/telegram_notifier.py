#!/usr/bin/env python3
"""Telegram Bot API Notifier for Syntergic Telemetry EWS.

Handles credential loading from environment or local .env files, message chunking
under Telegram's 4096-character limit, Markdown/plain-text fallback, and
structured formatting for Emergency RED Spikes and 7-Front Global Digests.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
import logging
import os
from pathlib import Path
import time
from typing import Any, Dict, List, Optional, Tuple

import requests

logger = logging.getLogger("syntergic.telegram")

TELEGRAM_MAX_LEN = 3900

FRONT_LABELS_ES: Dict[str, str] = {
    "CYBER_WARFARE": "🛡️ Ciberdefensa, Ransomware & C2",
    "INFRASTRUCTURE_CLOUD": "☁️ Infraestructura Cloud & BGP",
    "GEOPOLITICAL_CONFLICT": "🌐 Geopolítica & Conflictos",
    "GEOPHYSICAL_CLIMATE": "🌋 Geofísica, Sismos & Clima ONU",
    "SPACE_WEATHER_GRID": "☀️ Clima Espacial & Red Eléctrica",
    "FINANCIAL_MACRO": "📉 Mercados Financieros & Energía",
    "BIO_HUMANITARIAN": "🧬 Bioseguridad & Alertas OMS",
}


def load_dotenv_files() -> None:
    """Loads key=value pairs from root .env or backend/.env into os.environ if not already set."""
    backend_dir = Path(__file__).resolve().parent
    root_dir = backend_dir.parent
    for candidate in (root_dir / ".env", backend_dir / ".env"):
        if candidate.is_file():
            try:
                for raw_line in candidate.read_text(encoding="utf-8").splitlines():
                    line = raw_line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'").strip('"')
                    if key and key not in os.environ:
                        os.environ[key] = val
            except Exception as exc:
                logger.debug("Could not read %s: %s", candidate, exc)


def get_telegram_credentials() -> Tuple[str, str]:
    """Returns (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID) from environment."""
    load_dotenv_files()
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    return token, chat_id


def chunk_message(text: str, max_len: int = TELEGRAM_MAX_LEN) -> List[str]:
    """Splits a long message on line boundaries so each chunk fits Telegram's limit."""
    if len(text) <= max_len:
        return [text]

    chunks: List[str] = []
    current_lines: List[str] = []
    current_len = 0

    for line in text.splitlines(keepends=True):
        if current_len + len(line) > max_len and current_lines:
            chunks.append("".join(current_lines).strip())
            current_lines = [line]
            current_len = len(line)
        else:
            current_lines.append(line)
            current_len += len(line)

    if current_lines:
        chunks.append("".join(current_lines).strip())

    return [c for c in chunks if c]


def send_telegram_message(
    text: str,
    bot_token: Optional[str] = None,
    chat_id: Optional[str] = None,
    dry_run: bool = False,
) -> bool:
    """Delivers a formatted alert to Telegram with automatic plain-text fallback on HTTP 400."""
    env_token, env_chat = get_telegram_credentials()
    token = bot_token or env_token
    target_chat = chat_id or env_chat

    if dry_run:
        logger.info("[DRY-RUN] Telegram message preview (%d chars):\n%s", len(text), text)
        return True

    if not token or not target_chat:
        logger.warning(
            "[TELEGRAM] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID. Alert skipped."
        )
        return False

    api_url = f"https://api.telegram.org/bot{token}/sendMessage"
    chunks = chunk_message(text)

    for idx, chunk in enumerate(chunks, start=1):
        delivered = False
        for attempt in range(1, 4):
            try:
                payload: Dict[str, Any] = {
                    "chat_id": target_chat,
                    "text": chunk,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                }
                resp = requests.post(api_url, json=payload, timeout=12)
                if resp.status_code == 400:
                    # Fallback to plain text if HTML tags are unbalanced
                    payload.pop("parse_mode", None)
                    resp = requests.post(api_url, json=payload, timeout=12)

                if resp.status_code < 300:
                    delivered = True
                    break

                logger.warning(
                    "[TELEGRAM] HTTP %d on chunk %d/%d (attempt %d): %s",
                    resp.status_code,
                    idx,
                    len(chunks),
                    attempt,
                    resp.text[:200],
                )
            except Exception as exc:
                logger.warning(
                    "[TELEGRAM] Network error on chunk %d/%d (attempt %d): %s",
                    idx,
                    len(chunks),
                    attempt,
                    exc,
                )
            time.sleep(1.5 * attempt)

        if not delivered:
            return False

    logger.info("[TELEGRAM] Delivered %d chunk(s) to chat %s.", len(chunks), target_chat)
    return True


def _escape_html(text: str) -> str:
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def format_emergency_spike_alert(
    critical_events: List[Dict[str, Any]],
    global_omega: float,
    threat_level: str,
    total_scanned: int,
) -> str:
    """Formats an immediate Emergency Alert for new RED spikes across the 7 Strategic Fronts."""
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    status_emoji = "🔴" if threat_level == "RED" else "🟡" if threat_level == "YELLOW" else "🟢"

    lines: List[str] = [
        f"🚨 <b>SYNTERGIC EWS // ALERTA DE PICOS CRÍTICOS ({status_emoji} {threat_level})</b>",
        f"🕒 <code>{now_utc}</code> | <b>Ω Global:</b> <code>{global_omega:.3f}</code> | <b>Nodos Escaneados:</b> <code>{total_scanned}</code>",
        "━━━━━━━━━━━━━━━━━━━━━━",
        f"⚡ <b>Se detectaron {len(critical_events)} nuevos incidentes críticos (Ω &gt; 0.70):</b>\n",
    ]

    for idx, ev in enumerate(critical_events[:10], start=1):
        sf = float(ev.get("base_friction", ev.get("metrics", {}).get("social_friction", 0.8)))
        si = float(ev.get("base_inertia", ev.get("metrics", {}).get("structural_inertia", 0.8)))
        omega = round(0.5 * sf + 0.5 * si, 3)
        geo = ev.get("geo", {})
        ev_data = ev.get("evidence", {})
        front_key = ev_data.get("strategic_front", "CYBER_WARFARE")
        front_label = FRONT_LABELS_ES.get(front_key, front_key)
        city = _escape_html(geo.get("city", "Global"))
        country = _escape_html(geo.get("country", "World"))
        lat = geo.get("lat", 0.0)
        lng = geo.get("lng", 0.0)
        headline = _escape_html(ev.get("headline", "Critical Anomaly"))
        source = _escape_html(ev.get("source", "OSINT"))
        protocol = _escape_html(ev_data.get("protocol", "TELEMETRY"))
        url = ev_data.get("source_url", "")

        lines.append(
            f"<b>{idx}. [{_escape_html(front_label)}]</b>\n"
            f"🔥 <b>Ω={omega:.3f}</b> (SF:{sf:.2f} | SI:{si:.2f}) — <code>{source}</code>\n"
            f"📌 <b>{headline}</b>\n"
            f"📍 {city}, {country} (<code>{lat:.2f}, {lng:.2f}</code>)\n"
            f"⚙️ Protocolo: <code>{protocol}</code>\n"
            + (f"🔗 <a href=\"{url}\">Verificar Fuente Oficial</a>\n" if str(url).startswith("http") else "")
        )

    lines.append("━━━━━━━━━━━━━━━━━━━━━━")
    lines.append("🛡️ <i>Directiva: WU-WEI SANDBOX ISOLATION // Monitoreo Automático Cloud</i>")
    return "\n".join(lines)


def format_global_panorama_digest(
    all_events: List[Dict[str, Any]],
    global_omega: float,
    threat_level: str,
) -> str:
    """Formats a comprehensive 7-Front Global Entropy Panorama Digest for Telegram."""
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    status_emoji = "🔴" if threat_level == "RED" else "🟡" if threat_level == "YELLOW" else "🟢"

    front_counts: Counter = Counter()
    front_max_omega: Dict[str, float] = {}
    red_events: List[Tuple[float, Dict[str, Any]]] = []
    yellow_count = 0
    green_count = 0

    for ev in all_events:
        sf = float(ev.get("base_friction", ev.get("metrics", {}).get("social_friction", 0.3)))
        si = float(ev.get("base_inertia", ev.get("metrics", {}).get("structural_inertia", 0.3)))
        omega = round(0.5 * sf + 0.5 * si, 3)
        front = ev.get("evidence", {}).get("strategic_front", "CYBER_WARFARE")
        front_counts[front] += 1
        front_max_omega[front] = max(front_max_omega.get(front, 0.0), omega)

        if omega > 0.70 or ev.get("severity") == "CRITICAL":
            red_events.append((omega, ev))
        elif omega >= 0.40 or ev.get("severity") == "ELEVATED":
            yellow_count += 1
        else:
            green_count += 1

    red_events.sort(key=lambda x: x[0], reverse=True)

    lines: List[str] = [
        f"🌐 <b>SYNTERGIC EWS // PANORAMA GLOBAL EN 7 FRENTES ({status_emoji} {threat_level})</b>",
        f"🕒 <code>{now_utc}</code> | <b>Promedio Móvil Ω:</b> <code>{global_omega:.3f}</code>",
        f"📊 <b>Total Nodos Activos:</b> <code>{len(all_events)}</code> (🔴 <b>{len(red_events)} Críticos</b> | 🟡 <b>{yellow_count} Elevados</b> | 🟢 <b>{green_count} Estables</b>)",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "🧭 <b>ESTADO POR FRENTE ESTRATÉGICO:</b>",
    ]

    for front_key, label in FRONT_LABELS_ES.items():
        cnt = front_counts.get(front_key, 0)
        peak = front_max_omega.get(front_key, 0.0)
        f_icon = "🔴" if peak > 0.70 else "🟡" if peak >= 0.40 else "🟢"
        lines.append(f"• {f_icon} <b>{label}:</b> <code>{cnt} nodos</code> (Pico Ω: <code>{peak:.3f}</code>)")

    lines.append("\n━━━━━━━━━━━━━━━━━━━━━━")
    lines.append("🔥 <b>TOP 6 FOCOS DE MAYOR ENTROPÍA ACTUAL:</b>\n")

    for idx, (omega, ev) in enumerate(red_events[:6], start=1):
        geo = ev.get("geo", {})
        ev_data = ev.get("evidence", {})
        headline = _escape_html(ev.get("headline", ""))
        city = _escape_html(geo.get("city", ""))
        country = _escape_html(geo.get("country", ""))
        url = ev_data.get("source_url", "")
        lines.append(
            f"<b>{idx}. Ω={omega:.3f}</b> | 📍 {city}, {country}\n"
            f"   {_escape_html(ev.get('source', 'OSINT'))}: <b>{headline}</b>\n"
            + (f"   🔗 <a href=\"{url}\">Fuente Oficial Verificable</a>\n" if str(url).startswith("http") else "")
        )

    lines.append("━━━━━━━━━━━━━━━━━━━━━━")
    lines.append("🤖 <i>Syntergic Autonomous Cloud Sentinel (GitHub Actions)</i>")
    return "\n".join(lines)
