#!/usr/bin/env python3
"""Telegram Bot API Notifier for Syntergic Telemetry EWS.

Formats clean, high-signal executive intelligence reports in Spanish (Argentina UTC-3)
without mathematical jargon (no Omega/SF/SI clutter), prioritizing actionable context,
CVSS >= 9.0 / Zero-Day identification, official verifiable links, and direct access
to the live GitHub Pages Dashboard.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
import logging
import os
from pathlib import Path
import re
import time
from typing import Any, Dict, List, Optional, Tuple

import requests

logger = logging.getLogger("syntergic.telegram")

TELEGRAM_MAX_LEN = 3900
ARGENTINA_TZ = timezone(timedelta(hours=-3))
DASHBOARD_URL = os.getenv(
    "SYNTERGIC_DASHBOARD_URL",
    "https://phobetor-ops.github.io/Syntergic-Telemetry-Dashboard/",
)

FRONT_LABELS_ES: Dict[str, str] = {
    "CYBER_WARFARE": "🛡️ Ciberseguridad, Zero-Days & Ransomware",
    "INFRASTRUCTURE_CLOUD": "☁️ Infraestructura Cloud & Redes Globales",
    "GEOPOLITICAL_CONFLICT": "🌐 Geopolítica & Seguridad Internacional",
    "GEOPHYSICAL_CLIMATE": "🌋 Sismos, Volcanes & Clima Extremo",
    "SPACE_WEATHER_GRID": "☀️ Clima Espacial & Red Eléctrica",
    "FINANCIAL_MACRO": "📉 Mercados Financieros & Economía",
    "BIO_HUMANITARIAN": "🧬 Salud Global & Alertas OMS",
}

SOURCE_CLEAN_NAMES: Dict[str, str] = {
    "CISA_KEV_OFFICIAL_FEED": "Catálogo CISA KEV (EE. UU.)",
    "THE_HACKER_NEWS_OSINT": "The Hacker News",
    "SANS_ISC_STORM_CENTER": "SANS Internet Storm Center",
    "CLOUDFLARE_EDGE_STATUS": "Cloudflare Global Status",
    "GITHUB_CLOUD_STATUS": "GitHub Cloud Status",
    "BBC_WORLD_OSINT": "BBC World News",
    "BBC_MUNDO_LATAM_OSINT": "BBC Mundo (América Latina)",
    "AL_JAZEERA_GLOBAL_OSINT": "Al Jazeera Internacional",
    "UN_SECURITY_DISPATCH": "Naciones Unidas (ONU)",
    "CNBC_GLOBAL_MACRO": "CNBC Economía & Mercados",
    "WHO_EPIDEMIOLOGICAL_OSINT": "Organización Mundial de la Salud (OMS)",
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


def _clean_headline(headline: str) -> str:
    """Strips internal bracket prefixes like [RANSOMWARE BREACH // GROUP] for cleaner human reading."""
    cleaned = re.sub(r"^\[[^\]]+\]\s*", "", str(headline or "")).strip()
    return cleaned or str(headline or "Evento Crítico")


def _human_source_name(raw_source: str) -> str:
    raw = str(raw_source or "OSINT").strip()
    if raw in SOURCE_CLEAN_NAMES:
        return SOURCE_CLEAN_NAMES[raw]
    if raw.startswith("RANSOMWARE_LIVE"):
        return raw.replace("RANSOMWARE_LIVE", "Ransomware.live")
    if raw.startswith("ABUSE_CH_FEODO"):
        return raw.replace("ABUSE_CH_FEODO", "abuse.ch Botnet Radar")
    if raw.startswith("GDACS_UN_ALERT"):
        return "Alerta Satelital GDACS (ONU / UE)"
    if raw.startswith("USGS_NEIC_LIVE"):
        return "Servicio Geológico de EE. UU. (USGS)"
    if raw.startswith("NASA_EONET_SATELLITE"):
        return "NASA Earth Observatory (EONET)"
    if raw.startswith("NOAA_SWPC_SPACE"):
        return "Centro de Clima Espacial NOAA"
    return raw


def _classify_alert_reason(ev: Dict[str, Any]) -> str:
    """Returns a concise, human-readable reason why this event is critical."""
    ev_data = ev.get("evidence", {})
    event_type = str(ev_data.get("event_type", "")).upper()
    front = str(ev_data.get("strategic_front", "CYBER_WARFARE")).upper()
    cvss = ev_data.get("cvss_score")
    is_zero_day = bool(ev_data.get("is_zero_day"))
    headline_lower = str(ev.get("headline", "")).lower()
    content_lower = str(ev.get("content", "")).lower()

    if cvss is not None and float(cvss) >= 9.0:
        if is_zero_day or "cisa" in headline_lower or "zero-day" in headline_lower or "0-day" in headline_lower:
            return f"🚨 ZERO-DAY CRÍTICO (Severidad CVSS {float(cvss):.1f}/10)"
        return f"🛡️ VULNERABILIDAD CRÍTICA (Severidad CVSS {float(cvss):.1f}/10)"

    if event_type == "ACTIVELY_EXPLOITED_ZERO_DAY_CVE" or is_zero_day or "zero-day" in headline_lower or "0-day" in headline_lower:
        return "🚨 ZERO-DAY EN EXPLOTACIÓN ACTIVA"

    if event_type == "ACTIVE_RANSOMWARE_EXTORTION" or "ransomware" in headline_lower:
        return "💀 ATAQUE DE RANSOMWARE CONFIRMADO"

    if event_type == "ACTIVE_BOTNET_C2_INFRASTRUCTURE":
        return "🤖 SERVIDOR BOTNET C2 ACTIVO"

    if front == "INFRASTRUCTURE_CLOUD":
        return "☁️ INCIDENTE EN INFRAESTRUCTURA CLOUD GLOBAL"

    if front == "GEOPHYSICAL_CLIMATE":
        if "seismic" in headline_lower or "usgs" in str(ev.get("source", "")).lower():
            return "🌋 SISMO DE IMPORTANCIA DETECTADO"
        if "gdacs" in str(ev.get("source", "")).lower():
            return "🌪️ ALERTA ROJA DE DESASTRE NATURAL (ONU)"
        return "🌋 FENÓMENO GEOFÍSICO / CLIMÁTICO SEVERO"

    if front == "SPACE_WEATHER_GRID":
        return "☀️ ALERTA DE TORMENTA SOLAR / GEOMAGNÉTICA"

    if front == "BIO_HUMANITARIAN":
        return "🧬 ALERTA SANITARIA INTERNACIONAL (OMS)"

    if front == "FINANCIAL_MACRO":
        return "📉 ALERTA DE IMPACTO FINANCIERO / MERCADOS"

    if any(k in headline_lower or k in content_lower for k in ["missile", "airstrike", "nuclear", "invasion", "coup", "war", "guerra", "misil"]):
        return "🌐 ESCALADA BÉLICA / SEGURIDAD INTERNACIONAL"

    return "🌐 INCIDENTE GEOPOLÍTICO RELEVANTE"


def format_emergency_spike_alert(
    critical_events: List[Dict[str, Any]],
    global_omega: float = 0.0,
    threat_level: str = "RED",
    total_scanned: int = 0,
) -> str:
    """Formats a clean, high-value Immediate Alert for critical incidents (Zero-Days CVSS>=9, major disasters, etc.)."""
    now_arg = datetime.now(ARGENTINA_TZ).strftime("%d/%m/%Y %H:%M hs (Hora Argentina)")

    lines: List[str] = [
        "🚨 <b>ALERTA INMEDIATA DE INTELIGENCIA</b>",
        f"🕒 {now_arg}",
        "━━━━━━━━━━━━━━━━━━━━━━",
        f"Se detectaron <b>{len(critical_events)} incidente(s) prioritario(s)</b> en tiempo real:\n",
    ]

    for idx, ev in enumerate(critical_events[:8], start=1):
        geo = ev.get("geo", {})
        ev_data = ev.get("evidence", {})
        reason_badge = _classify_alert_reason(ev)
        title = _escape_html(_clean_headline(ev.get("headline", "Incidente Crítico")))
        content = _escape_html(str(ev.get("content", "")).strip())
        if len(content) > 220:
            content = content[:217].rsplit(" ", 1)[0] + "..."

        city = _escape_html(geo.get("city", ""))
        country = _escape_html(geo.get("country", "Global"))
        location_str = f"{city}, {country}" if city and city.lower() not in country.lower() else country
        source_name = _escape_html(_human_source_name(ev.get("source", "OSINT")))
        url = str(ev_data.get("source_url", "")).strip()

        block = [
            f"<b>{idx}. {_escape_html(reason_badge)}</b>",
            f"📌 <b>{title}</b>",
        ]
        if content and content.lower() != title.lower():
            block.append(f"📝 {content}")
        block.append(f"📍 {location_str}  |  📡 Fuente: <i>{source_name}</i>")
        if url.startswith("http"):
            block.append(f"🔗 <a href=\"{url}\">Ver reporte oficial</a>")
        lines.append("\n".join(block) + "\n")

    lines.append("━━━━━━━━━━━━━━━━━━━━━━")
    lines.append(f"🌐 <b><a href=\"{DASHBOARD_URL}\">Abrir Mapa Interactivo en Vivo (GitHub Pages)</a></b>")
    return "\n".join(lines)


def format_global_panorama_digest(
    all_events: List[Dict[str, Any]],
    global_omega: float = 0.0,
    threat_level: str = "YELLOW",
) -> str:
    """Formats the daily 08:00 AM (Argentina) Global Panorama Report without technical/math clutter."""
    now_arg = datetime.now(ARGENTINA_TZ).strftime("%d/%m/%Y %H:%M hs (Hora Argentina)")

    front_total: Counter = Counter()
    front_critical: Counter = Counter()
    critical_list: List[Dict[str, Any]] = []
    elevated_count = 0

    for ev in all_events:
        front = ev.get("evidence", {}).get("strategic_front", "CYBER_WARFARE")
        front_total[front] += 1
        sev = str(ev.get("severity", "NORMAL")).upper()
        cvss = ev.get("evidence", {}).get("cvss_score")
        is_crit = sev == "CRITICAL" or (cvss is not None and float(cvss) >= 9.0)

        if is_crit:
            front_critical[front] += 1
            critical_list.append(ev)
        elif sev == "ELEVATED":
            elevated_count += 1

    # Prioritize Zero-Days / CVSS>=9 first, then Cloud/Geophysical/Cyber criticals
    def _sort_key(item: Dict[str, Any]) -> Tuple[int, float]:
        ev_d = item.get("evidence", {})
        cvss_val = float(ev_d.get("cvss_score") or 0.0)
        is_zd = 1 if (cvss_val >= 9.0 or ev_d.get("is_zero_day")) else 0
        sf = float(item.get("base_friction", 0.5))
        si = float(item.get("base_inertia", 0.5))
        return (is_zd, sf + si)

    critical_list.sort(key=_sort_key, reverse=True)

    lines: List[str] = [
        "☀️ <b>REPORTE DIARIO DE INTELIGENCIA GLOBAL</b>",
        f"🕒 {now_arg}",
        f"📊 <b>Eventos Activos Monitoreados:</b> {len(all_events)} "
        f"(🔴 <b>{len(critical_list)} Críticos</b> | 🟡 <b>{elevated_count} En Observación</b>)",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "🧭 <b>RESUMEN POR FRENTE ESTRATÉGICO:</b>",
    ]

    for front_key, label in FRONT_LABELS_ES.items():
        total_f = front_total.get(front_key, 0)
        crit_f = front_critical.get(front_key, 0)
        icon = "🔴" if crit_f > 0 else "🟢" if total_f > 0 else "⚪"
        if crit_f > 0:
            lines.append(f"• {icon} <b>{label}:</b> {crit_f} crítico(s) <i>({total_f} en total)</i>")
        else:
            lines.append(f"• {icon} <b>{label}:</b> Sin alertas críticas <i>({total_f} en seguimiento)</i>")

    lines.append("\n━━━━━━━━━━━━━━━━━━━━━━")
    lines.append("🔥 <b>EVENTOS MÁS RELEVANTES DE LAS ÚLTIMAS 24 HORAS:</b>\n")

    for idx, ev in enumerate(critical_list[:7], start=1):
        geo = ev.get("geo", {})
        ev_data = ev.get("evidence", {})
        badge = _classify_alert_reason(ev)
        title = _escape_html(_clean_headline(ev.get("headline", "")))
        content = _escape_html(str(ev.get("content", "")).strip())
        if len(content) > 170:
            content = content[:167].rsplit(" ", 1)[0] + "..."

        city = _escape_html(geo.get("city", ""))
        country = _escape_html(geo.get("country", "Global"))
        location_str = f"{city}, {country}" if city and city.lower() not in country.lower() else country
        source_name = _escape_html(_human_source_name(ev.get("source", "OSINT")))
        url = str(ev_data.get("source_url", "")).strip()

        item_lines = [
            f"<b>{idx}. {_escape_html(badge)}</b>",
            f"   <b>{title}</b>",
        ]
        if content and content.lower() != title.lower():
            item_lines.append(f"   <i>{content}</i>")
        item_lines.append(f"   📍 {location_str} — {source_name}")
        if url.startswith("http"):
            item_lines.append(f"   🔗 <a href=\"{url}\">Fuente oficial</a>")
        lines.append("\n".join(item_lines) + "\n")

    lines.append("━━━━━━━━━━━━━━━━━━━━━━")
    lines.append(f"🌐 <b><a href=\"{DASHBOARD_URL}\">Ver Dashboard y Mapa Interactivo en Vivo (GitHub Pages)</a></b>")
    return "\n".join(lines)
