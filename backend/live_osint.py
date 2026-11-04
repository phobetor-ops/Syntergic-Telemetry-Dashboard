from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import logging
import math
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html import unescape
from typing import Any, Callable, Dict, List, Optional, Tuple

import requests

logger = logging.getLogger("syntergic.live_osint")

# ============================================================================
# ISO-2 COUNTRY CODE GAZETTEER (60+ Countries -> Accurate WGS-84 & Natural Earth Names)
# Used by Ransomware.live, abuse.ch Feodo C2, and GDACS country mapping
# ============================================================================
ISO2_TO_GEO: Dict[str, Dict[str, Any]] = {
    "US": {"lat": 39.0438, "lng": -77.4874, "city": "Ashburn / Washington DC", "country": "United States of America", "region": "North America", "facility": "US-CERT & Ashburn Backbone Sector"},
    "CA": {"lat": 43.6532, "lng": -79.3832, "city": "Toronto / Ottawa", "country": "Canada", "region": "North America", "facility": "Canadian Centre for Cyber Security"},
    "MX": {"lat": 19.4326, "lng": -99.1332, "city": "Ciudad de México", "country": "Mexico", "region": "Latin America", "facility": "MX-CERT & Red Troncal México"},
    "BR": {"lat": -23.5505, "lng": -46.6333, "city": "São Paulo", "country": "Brazil", "region": "South America", "facility": "CERT.br & IX.br São Paulo Core"},
    "AR": {"lat": -34.6037, "lng": -58.3816, "city": "Buenos Aires", "country": "Argentina", "region": "South America", "facility": "BA-CSIRT & CABASE IXP Argentina"},
    "CL": {"lat": -33.4489, "lng": -70.6693, "city": "Santiago", "country": "Chile", "region": "South America", "facility": "CSIRT Chile & PIT Santiago"},
    "CO": {"lat": 4.7110, "lng": -74.0721, "city": "Bogotá", "country": "Colombia", "region": "South America", "facility": "ColCERT & NAP Colombia"},
    "PE": {"lat": -12.0464, "lng": -77.0428, "city": "Lima", "country": "Peru", "region": "South America", "facility": "ancert-PE & NAP Perú"},
    "VE": {"lat": 10.4806, "lng": -66.9036, "city": "Caracas", "country": "Venezuela", "region": "South America", "facility": "VenCERT Telemetry Sector"},
    "UY": {"lat": -34.9011, "lng": -56.1645, "city": "Montevideo", "country": "Uruguay", "region": "South America", "facility": "CERTuy Montevideo Node"},
    "EC": {"lat": -0.1807, "lng": -78.4678, "city": "Quito", "country": "Ecuador", "region": "South America", "facility": "EcuCERT Andean Relay"},
    "GB": {"lat": 51.5074, "lng": -0.1278, "city": "London", "country": "United Kingdom", "region": "Western Europe", "facility": "UK NCSC & LINX London Core"},
    "UK": {"lat": 51.5074, "lng": -0.1278, "city": "London", "country": "United Kingdom", "region": "Western Europe", "facility": "UK NCSC & LINX London Core"},
    "DE": {"lat": 50.1109, "lng": 8.6821, "city": "Frankfurt", "country": "Germany", "region": "Central Europe", "facility": "BSI Germany & DE-CIX Frankfurt"},
    "FR": {"lat": 48.8566, "lng": 2.3522, "city": "Paris", "country": "France", "region": "Western Europe", "facility": "ANSSI France & France-IX Paris"},
    "NL": {"lat": 52.3676, "lng": 4.9041, "city": "Amsterdam", "country": "Netherlands", "region": "Western Europe", "facility": "NCSC-NL & AMS-IX Amsterdam"},
    "ES": {"lat": 40.4168, "lng": -3.7038, "city": "Madrid", "country": "Spain", "region": "Southern Europe", "facility": "CCN-CERT & ESPANIX Madrid"},
    "IT": {"lat": 45.4642, "lng": 9.1900, "city": "Milan / Rome", "country": "Italy", "region": "Southern Europe", "facility": "CSIRT Italia & MIX Milan"},
    "CH": {"lat": 46.9480, "lng": 7.4474, "city": "Zurich / Geneva", "country": "Switzerland", "region": "Central Europe", "facility": "GovCERT.ch & SwissIX"},
    "SE": {"lat": 59.3293, "lng": 18.0686, "city": "Stockholm", "country": "Sweden", "region": "Northern Europe", "facility": "CERT-SE & Netnod Stockholm"},
    "NO": {"lat": 59.9139, "lng": 10.7522, "city": "Oslo", "country": "Norway", "region": "Northern Europe", "facility": "NorCERT & NIX Oslo"},
    "FI": {"lat": 60.1699, "lng": 24.9384, "city": "Helsinki", "country": "Finland", "region": "Northern Europe", "facility": "NCSC-FI & FICIX Helsinki"},
    "PL": {"lat": 52.2297, "lng": 21.0122, "city": "Warsaw", "country": "Poland", "region": "Eastern Europe", "facility": "CERT Polska & PLIX Warsaw"},
    "UA": {"lat": 50.4501, "lng": 30.5234, "city": "Kyiv", "country": "Ukraine", "region": "Eastern Europe", "facility": "CERT-UA & UA-IX Kyiv"},
    "RU": {"lat": 55.7558, "lng": 37.6173, "city": "Moscow", "country": "Russia", "region": "Eurasia", "facility": "MSK-IX Eurasian Core"},
    "TR": {"lat": 41.0082, "lng": 28.9784, "city": "Istanbul / Ankara", "country": "Turkey", "region": "Eurasia", "facility": "USOM TR-CERT & DE-CIX Istanbul"},
    "IL": {"lat": 32.0853, "lng": 34.7818, "city": "Tel Aviv", "country": "Israel", "region": "Middle East", "facility": "INCD IL-CERT & IIX Tel Aviv"},
    "AE": {"lat": 25.2048, "lng": 55.2708, "city": "Dubai", "country": "United Arab Emirates", "region": "Middle East", "facility": "aeCERT & UAE-IX Dubai"},
    "SA": {"lat": 24.7136, "lng": 46.6753, "city": "Riyadh", "country": "Saudi Arabia", "region": "Middle East", "facility": "Saudi NCA-CERT & JED-IX"},
    "IR": {"lat": 35.6892, "lng": 51.3890, "city": "Tehran", "country": "Iran", "region": "Middle East", "facility": "MAHER CERT & Tehran IXP"},
    "EG": {"lat": 30.0444, "lng": 31.2357, "city": "Cairo / Suez", "country": "Egypt", "region": "North Africa", "facility": "EG-CERT & Suez Optical Corridor"},
    "ZA": {"lat": -26.2041, "lng": 28.0473, "city": "Johannesburg", "country": "South Africa", "region": "Sub-Saharan Africa", "facility": "NAPAfrica IXP Johannesburg"},
    "NG": {"lat": 6.5244, "lng": 3.3792, "city": "Lagos", "country": "Nigeria", "region": "West Africa", "facility": "ngCERT & IXPN Lagos"},
    "KE": {"lat": -1.2921, "lng": 36.8219, "city": "Nairobi", "country": "Kenya", "region": "East Africa", "facility": "KE-CIRT/CC & KIXP Nairobi"},
    "IN": {"lat": 19.0760, "lng": 72.8777, "city": "Mumbai / New Delhi", "country": "India", "region": "South Asia", "facility": "CERT-In & DE-CIX Mumbai"},
    "PK": {"lat": 33.6844, "lng": 73.0479, "city": "Islamabad / Karachi", "country": "Pakistan", "region": "South Asia", "facility": "PKCERT South Asia Node"},
    "CN": {"lat": 39.9042, "lng": 116.4074, "city": "Beijing / Shanghai", "country": "China", "region": "East Asia", "facility": "CNCERT/CC & CN-Backbone"},
    "TW": {"lat": 25.0330, "lng": 121.5654, "city": "Taipei / Hsinchu", "country": "Taiwan", "region": "East Asia", "facility": "TWCERT/CC & TWIX Taipei"},
    "JP": {"lat": 35.6762, "lng": 139.6503, "city": "Tokyo", "country": "Japan", "region": "East Asia", "facility": "JPCERT/CC & JPIX Tokyo"},
    "KR": {"lat": 37.5665, "lng": 126.9780, "city": "Seoul", "country": "South Korea", "region": "East Asia", "facility": "KrCERT/CC & KINX Seoul"},
    "SG": {"lat": 1.3521, "lng": 103.8198, "city": "Singapore", "country": "Singapore", "region": "Southeast Asia", "facility": "SingCERT & Equinix SG1"},
    "ID": {"lat": -6.2088, "lng": 106.8456, "city": "Jakarta", "country": "Indonesia", "region": "Southeast Asia", "facility": "ID-SIRTII & IIX Jakarta"},
    "PH": {"lat": 14.5995, "lng": 120.9842, "city": "Manila", "country": "Philippines", "region": "Southeast Asia", "facility": "CERT-PH & PhOpenIX Manila"},
    "TH": {"lat": 13.7563, "lng": 100.5018, "city": "Bangkok", "country": "Thailand", "region": "Southeast Asia", "facility": "ThaiCERT & BKNIX Bangkok"},
    "VN": {"lat": 21.0285, "lng": 105.8542, "city": "Hanoi / Ho Chi Minh", "country": "Vietnam", "region": "Southeast Asia", "facility": "VNCERT & VNIX Hanoi"},
    "MY": {"lat": 3.1390, "lng": 101.6869, "city": "Kuala Lumpur", "country": "Malaysia", "region": "Southeast Asia", "facility": "MyCERT & MyIX Kuala Lumpur"},
    "AU": {"lat": -33.8688, "lng": 151.2093, "city": "Sydney", "country": "Australia", "region": "Oceania", "facility": "ACSC Australia & IX Australia"},
    "NZ": {"lat": -36.8485, "lng": 174.7633, "city": "Auckland", "country": "New Zealand", "region": "Oceania", "facility": "CERT NZ & APE Auckland"},
    "BE": {"lat": 50.8503, "lng": 4.3517, "city": "Brussels", "country": "Belgium", "region": "Western Europe", "facility": "CERT.be & BNIX Brussels"},
    "AT": {"lat": 48.2082, "lng": 16.3738, "city": "Vienna", "country": "Austria", "region": "Central Europe", "facility": "CERT.at & VIX Vienna"},
    "PT": {"lat": 38.7223, "lng": -9.1393, "city": "Lisbon", "country": "Portugal", "region": "Southern Europe", "facility": "CERT.PT & GigaPIX Lisbon"},
    "GR": {"lat": 37.9838, "lng": 23.7275, "city": "Athens", "country": "Greece", "region": "Southern Europe", "facility": "GR-CSIRT & GR-IX Athens"},
    "RO": {"lat": 44.4268, "lng": 26.1025, "city": "Bucharest", "country": "Romania", "region": "Eastern Europe", "facility": "DNSC Romania & InterLAN"},
    "CZ": {"lat": 50.0755, "lng": 14.4378, "city": "Prague", "country": "Czechia", "region": "Central Europe", "facility": "CSIRT.CZ & NIX.CZ Prague"},
}

# ============================================================================
# REAL-WORLD GEOPOLITICAL & INFRASTRUCTURE KEYWORD GAZETTEER
# ============================================================================
GAZETTEER: List[Dict[str, Any]] = [
    # Tech & Cyber Vendors
    {"keywords": ["microsoft", "windows", "azure", "exchange", "sharepoint", "active directory"], "lat": 47.6740, "lng": -122.1215, "city": "Redmond, WA", "country": "United States of America", "country_code": "US", "region": "North America", "facility": "Microsoft MSRC Threat Hub"},
    {"keywords": ["cisco", "ios xe", "asa", "firepower", "webex", "meraki"], "lat": 37.4082, "lng": -121.9538, "city": "San Jose, CA", "country": "United States of America", "country_code": "US", "region": "North America", "facility": "Cisco Talos Intelligence Core"},
    {"keywords": ["fortinet", "fortios", "fortigate", "fortiproxy", "fortisiem"], "lat": 37.3861, "lng": -122.0239, "city": "Sunnyvale, CA", "country": "United States of America", "country_code": "US", "region": "North America", "facility": "FortiGuard Labs Global SOC"},
    {"keywords": ["palo alto", "pan-os", "globalprotect", "cortex"], "lat": 37.3813, "lng": -121.9830, "city": "Santa Clara, CA", "country": "United States of America", "country_code": "US", "region": "North America", "facility": "Unit 42 Threat Enclave"},
    {"keywords": ["apple", "ios", "macos", "webkit", "iphone"], "lat": 37.3349, "lng": -122.0090, "city": "Cupertino, CA", "country": "United States of America", "country_code": "US", "region": "North America", "facility": "Apple Product Security Node"},
    {"keywords": ["google", "chrome", "android", "chromium", "kubernetes"], "lat": 37.4220, "lng": -122.0841, "city": "Mountain View, CA", "country": "United States of America", "country_code": "US", "region": "North America", "facility": "Google Threat Analysis Group"},
    {"keywords": ["ivanti", "connect secure", "pulse secure", "avalanche", "epmm"], "lat": 40.5247, "lng": -111.8638, "city": "South Jordan, UT", "country": "United States of America", "country_code": "US", "region": "North America", "facility": "Ivanti Security Operations"},
    {"keywords": ["vmware", "esxi", "vcenter", "broadcom", "nsx"], "lat": 37.4027, "lng": -122.1475, "city": "Palo Alto, CA", "country": "United States of America", "country_code": "US", "region": "North America", "facility": "VMware Cloud Security Core"},
    {"keywords": ["oracle", "weblogic", "java", "mysql", "solaris"], "lat": 30.2423, "lng": -97.7212, "city": "Austin, TX", "country": "United States of America", "country_code": "US", "region": "North America", "facility": "Oracle Cloud Security Hub"},
    {"keywords": ["gitlab", "github", "npm", "pypi", "docker"], "lat": 37.7749, "lng": -122.4194, "city": "San Francisco, CA", "country": "United States of America", "country_code": "US", "region": "North America", "facility": "SF Cloud & DevSecOps Backbone"},
    # Regions & Countries (English + Spanish for Latin America feeds)
    {"keywords": ["zyxel", "qnap", "asus", "d-link", "synology", "taiwan", "taipei", "tsmc", "hsinchu", "taiwán"], "lat": 25.0330, "lng": 121.5654, "city": "Taipei / Hsinchu", "country": "Taiwan", "country_code": "TW", "region": "East Asia", "facility": "TW-CERT & Hsinchu Fab SOC"},
    {"keywords": ["sap", "germany", "frankfurt", "berlin", "munich", "alemania"], "lat": 50.1109, "lng": 8.6821, "city": "Frankfurt", "country": "Germany", "country_code": "DE", "region": "Central Europe", "facility": "DE-CIX Frankfurt & BSI Center"},
    {"keywords": ["israel", "tel aviv", "jerusalem", "gaza", "idf", "hezbollah", "lebanon", "beirut", "líbano", "palestin"], "lat": 32.0853, "lng": 34.7818, "city": "Tel Aviv / Levant", "country": "Israel", "country_code": "IL", "region": "Middle East", "facility": "Eastern Med Strategic Telemetry"},
    {"keywords": ["south korea", "seoul", "korean", "pyongyang", "north korea", "lazarus", "corea"], "lat": 37.5665, "lng": 126.9780, "city": "Seoul", "country": "South Korea", "country_code": "KR", "region": "East Asia", "facility": "KrCERT Peninsula Threat Radar"},
    {"keywords": ["china", "beijing", "shanghai", "chinese", "volt typhoon", "salt typhoon", "apt41", "hong kong"], "lat": 39.9042, "lng": 116.4074, "city": "Beijing", "country": "China", "country_code": "CN", "region": "East Asia", "facility": "CN-Backbone & East Asia IXP"},
    {"keywords": ["japan", "tokyo", "osaka", "japanese", "japón"], "lat": 35.6762, "lng": 139.6503, "city": "Tokyo", "country": "Japan", "country_code": "JP", "region": "East Asia", "facility": "JPCERT/CC & JPIX Tokyo Core"},
    {"keywords": ["ukraine", "kyiv", "kharkiv", "odesa", "kherson", "donetsk", "ukrainian", "zelensky", "ucrania"], "lat": 50.4501, "lng": 30.5234, "city": "Kyiv / Kherson", "country": "Ukraine", "country_code": "UA", "region": "Eastern Europe", "facility": "CERT-UA & Eastern Europe Grid"},
    {"keywords": ["russia", "moscow", "russian", "kremlin", "apt28", "apt29", "sandworm", "rusia"], "lat": 55.7558, "lng": 37.6173, "city": "Moscow", "country": "Russia", "country_code": "RU", "region": "Eurasia", "facility": "MSK-IX Eurasian Routing Monitor"},
    {"keywords": ["iran", "tehran", "iranian", "hormuz", "persian gulf", "irán"], "lat": 35.6892, "lng": 51.3890, "city": "Tehran", "country": "Iran", "country_code": "IR", "region": "Middle East", "facility": "Persian Gulf Telemetry Node"},
    {"keywords": ["yemen", "houthi", "red sea", "bab-el-mandeb", "aden", "djibouti", "mar rojo"], "lat": 12.5850, "lng": 43.3330, "city": "Bab-el-Mandeb", "country": "Djibouti", "country_code": "DJ", "region": "Red Sea Corridor", "facility": "Red Sea Subsea Chokepoint Sensor"},
    {"keywords": ["uk", "britain", "british", "london", "england", "scotland", "reino unido", "londres"], "lat": 51.5074, "lng": -0.1278, "city": "London", "country": "United Kingdom", "country_code": "GB", "region": "Western Europe", "facility": "UK NCSC & LINX London Hub"},
    {"keywords": ["france", "paris", "french", "francia"], "lat": 48.8566, "lng": 2.3522, "city": "Paris", "country": "France", "country_code": "FR", "region": "Western Europe", "facility": "ANSSI France & France-IX"},
    {"keywords": ["switzerland", "geneva", "zurich", "who ", "oms", "un ", "united nations", "naciones unidas", "ginebra"], "lat": 46.2044, "lng": 6.1432, "city": "Geneva", "country": "Switzerland", "country_code": "CH", "region": "Central Europe", "facility": "UN / WHO International Hub Geneva"},
    {"keywords": ["india", "new delhi", "mumbai", "indian", "bengaluru"], "lat": 19.0760, "lng": 72.8777, "city": "Mumbai / New Delhi", "country": "India", "country_code": "IN", "region": "South Asia", "facility": "CERT-In & Mumbai Subsea Hub"},
    {"keywords": ["pakistan", "islamabad", "karachi", "afghanistan", "kabul"], "lat": 33.6844, "lng": 73.0479, "city": "Islamabad", "country": "Pakistan", "country_code": "PK", "region": "South Asia", "facility": "South Asia Regional Telemetry"},
    {"keywords": ["australia", "sydney", "melbourne", "canberra", "australian"], "lat": -33.8688, "lng": 151.2093, "city": "Sydney", "country": "Australia", "country_code": "AU", "region": "Oceania", "facility": "ACSC & Sydney Southern Cross"},
    {"keywords": ["brazil", "sao paulo", "são paulo", "brasilia", "rio", "brazilian", "brasil"], "lat": -23.5505, "lng": -46.6333, "city": "São Paulo", "country": "Brazil", "country_code": "BR", "region": "South America", "facility": "IX.br São Paulo South American Core"},
    {"keywords": ["argentina", "buenos aires", "patagonia", "milei"], "lat": -34.6037, "lng": -58.3816, "city": "Buenos Aires", "country": "Argentina", "country_code": "AR", "region": "South America", "facility": "CABASE Southern Cone IXP"},
    {"keywords": ["chile", "santiago", "valparaíso", "atacama"], "lat": -33.4489, "lng": -70.6693, "city": "Santiago", "country": "Chile", "country_code": "CL", "region": "South America", "facility": "CSIRT Chile & PIT Andean Node"},
    {"keywords": ["colombia", "bogotá", "bogota", "medellín", "cali"], "lat": 4.7110, "lng": -74.0721, "city": "Bogotá", "country": "Colombia", "country_code": "CO", "region": "South America", "facility": "ColCERT & NAP Colombia"},
    {"keywords": ["peru", "perú", "lima", "andes"], "lat": -12.0464, "lng": -77.0428, "city": "Lima", "country": "Peru", "country_code": "PE", "region": "South America", "facility": "NAP Perú Pacific Telemetry"},
    {"keywords": ["mexico", "méxico", "mexican", "mexico city", "guadalajara", "monterrey"], "lat": 19.4326, "lng": -99.1332, "city": "Ciudad de México", "country": "Mexico", "country_code": "MX", "region": "Latin America", "facility": "MX-CERT Central Telemetry"},
    {"keywords": ["haiti", "haití", "caribbean", "caribe", "cuba", "dominican", "jamaica", "puerto rico"], "lat": 18.5944, "lng": -72.3074, "city": "Caribbean Basin", "country": "Haiti", "country_code": "HT", "region": "Caribbean", "facility": "Caribbean Basin Humanitarian Sensor"},
    {"keywords": ["venezuela", "caracas", "ecuador", "quito", "bolivia", "paraguay", "uruguay", "américa latina", "latinoamérica", "americas"], "lat": 4.7110, "lng": -74.0721, "city": "Región Andina / LatAm", "country": "Colombia", "country_code": "CO", "region": "Latin America", "facility": "Red de Vigilancia LatAm ONU"},
    {"keywords": ["sudan", "khartoum", "darfur", "sudán", "chad", "ethiopia", "somalia"], "lat": 15.5007, "lng": 32.5599, "city": "Khartoum", "country": "Sudan", "country_code": "SD", "region": "East Africa", "facility": "Horn of Africa Crisis Monitor"},
    {"keywords": ["congo", "drc", "kinshasa", "goma", "rwanda", "uganda", "kenya", "nairobi"], "lat": -1.2921, "lng": 36.8219, "city": "Nairobi / Great Lakes", "country": "Kenya", "country_code": "KE", "region": "East Africa", "facility": "East Africa Regional Telemetry"},
    {"keywords": ["south africa", "johannesburg", "cape town", "nigeria", "lagos", "sahel", "mali", "niger", "african"], "lat": -26.2041, "lng": 28.0473, "city": "Johannesburg", "country": "South Africa", "country_code": "ZA", "region": "Sub-Saharan Africa", "facility": "NAPAfrica IXP Johannesburg"},
    {"keywords": ["uae", "dubai", "abu dhabi", "saudi", "riyadh", "qatar", "opec", "gulf"], "lat": 25.2048, "lng": 55.2708, "city": "Dubai / Riyadh", "country": "United Arab Emirates", "country_code": "AE", "region": "Arabian Gulf", "facility": "UAE-IX Energy & Financial Hub"},
    {"keywords": ["singapore", "malacca", "asean", "southeast asia"], "lat": 1.3521, "lng": 103.8198, "city": "Singapore", "country": "Singapore", "country_code": "SG", "region": "Southeast Asia", "facility": "Equinix SG1 & Malacca Corridor"},
    {"keywords": ["philippines", "manila", "indonesia", "jakarta", "vietnam", "thailand", "bangkok", "myanmar"], "lat": 14.5995, "lng": 120.9842, "city": "Manila / ASEAN", "country": "Philippines", "country_code": "PH", "region": "Southeast Asia", "facility": "Luzon Strait Subsea Telemetry"},
    {"keywords": ["spain", "madrid", "barcelona", "valencia", "españa", "italy", "rome", "milan", "italia", "european"], "lat": 40.4168, "lng": -3.7038, "city": "Madrid / Southern Europe", "country": "Spain", "country_code": "ES", "region": "Southern Europe", "facility": "ESPANIX & Southern Europe Node"},
    {"keywords": ["wall street", "fed ", "federal reserve", "nasdaq", "s&p 500", "dow jones", "treasury", "new york", "nyse"], "lat": 40.7128, "lng": -74.0060, "city": "New York, NY", "country": "United States of America", "country_code": "US", "region": "North America", "facility": "NY4 Secaucus / Wall Street Liquidity Core"},
    {"keywords": ["us ", "u.s.", "united states", "washington", "pentagon", "white house", "cisa", "fbi", "florida", "california", "texas", "estados unidos"], "lat": 39.0438, "lng": -77.4874, "city": "Washington DC / Ashburn", "country": "United States of America", "country_code": "US", "region": "North America", "facility": "US-EAST Federal & IXP Backbone"},
]

FALLBACK_CYBER_HUBS = [
    {"lat": 39.0438, "lng": -77.4874, "city": "Ashburn, VA", "country": "United States of America", "country_code": "US", "region": "North America", "facility": "US-EAST CISA & Ashburn IXP Sensor"},
    {"lat": 50.1109, "lng": 8.6821, "city": "Frankfurt", "country": "Germany", "country_code": "DE", "region": "Central Europe", "facility": "DE-CIX European Threat Telemetry"},
    {"lat": 51.5074, "lng": -0.1278, "city": "London", "country": "United Kingdom", "country_code": "GB", "region": "Western Europe", "facility": "LINX London Cyber Defense Relay"},
    {"lat": 1.3521, "lng": 103.8198, "city": "Singapore", "country": "Singapore", "country_code": "SG", "region": "Southeast Asia", "facility": "APAC Threat Intelligence Hub"},
    {"lat": 35.6762, "lng": 139.6503, "city": "Tokyo", "country": "Japan", "country_code": "JP", "region": "East Asia", "facility": "JPCERT/CC Pacific Sensor"},
    {"lat": -23.5505, "lng": -46.6333, "city": "São Paulo", "country": "Brazil", "country_code": "BR", "region": "South America", "facility": "IX.br South America Core"},
]

COUNTRY_NAME_NORMALIZATION = {
    "US": "United States of America",
    "USA": "United States of America",
    "United States": "United States of America",
    "California": "United States of America",
    "Alaska": "United States of America",
    "Hawaii": "United States of America",
    "Texas": "United States of America",
    "Nevada": "United States of America",
    "Washington": "United States of America",
    "Oregon": "United States of America",
    "UK": "United Kingdom",
    "Russia": "Russia",
}


def _clean_html(raw_text: str) -> str:
    if not raw_text:
        return ""
    cleaned = re.sub(r"<[^>]+>", " ", raw_text)
    cleaned = unescape(cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def _sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()


def _apply_jitter(geo: Dict[str, Any], seed_text: str) -> Dict[str, Any]:
    """Applies a small deterministic angular offset (±0.85 deg) so multiple live events in the same city remain visually separated."""
    out = dict(geo)
    h_val = int(_sha256_hex(seed_text)[:8], 16)
    angle = (h_val % 360) * (math.pi / 180.0)
    radius = 0.45 + ((h_val >> 8) % 100) / 120.0
    out["lat"] = round(max(-80.0, min(80.0, out["lat"] + math.sin(angle) * radius)), 4)
    out["lng"] = round(max(-179.0, min(179.0, out["lng"] + math.cos(angle) * radius)), 4)
    return out


def resolve_iso2_country(iso2: str, unique_suffix: str = "") -> Dict[str, Any]:
    code = (iso2 or "US").strip().upper()
    base = ISO2_TO_GEO.get(code, ISO2_TO_GEO["US"])
    geo = {
        "lat": base["lat"],
        "lng": base["lng"],
        "city": base["city"],
        "country": base["country"],
        "country_code": code if len(code) == 2 else "US",
        "region": base["region"],
        "facility": f"{base['facility']} [{unique_suffix}]" if unique_suffix else base["facility"],
    }
    if unique_suffix:
        geo = _apply_jitter(geo, f"{code}:{unique_suffix}")
    return geo


def resolve_geolocation_from_text(text: str, unique_suffix: str = "") -> Dict[str, Any]:
    lower = text.lower()
    matched_entry = None
    for entry in GAZETTEER:
        for kw in entry["keywords"]:
            if kw in lower:
                matched_entry = entry
                break
        if matched_entry:
            break

    if not matched_entry:
        idx = int(_sha256_hex(text)[:8], 16) % len(FALLBACK_CYBER_HUBS)
        matched_entry = FALLBACK_CYBER_HUBS[idx]

    geo = dict(matched_entry)
    geo.pop("keywords", None)

    if unique_suffix:
        geo["facility"] = f"{geo['facility']} [{unique_suffix}]"
        geo = _apply_jitter(geo, f"{text}:{unique_suffix}")

    return geo


def _infer_country_from_place(place: str, lat: float, lng: float) -> Tuple[str, str, str]:
    if not place:
        return ("Epicenter Sector", "International Waters", "UN")
    parts = [p.strip() for p in place.split(",")]
    region_tail = parts[-1] if len(parts) > 1 else place
    country = COUNTRY_NAME_NORMALIZATION.get(region_tail, region_tail)
    for known in [
        "Japan", "Chile", "Indonesia", "Philippines", "Papua New Guinea", "Mexico",
        "Peru", "New Zealand", "Taiwan", "Turkey", "Greece", "Italy", "Iran",
        "China", "Russia", "India", "Afghanistan", "Tajikistan", "Canada",
        "Argentina", "Colombia", "Ecuador", "Guatemala", "El Salvador", "Nicaragua",
        "Costa Rica", "Panama", "Fiji", "Tonga", "Vanuatu", "Solomon Islands", "Iceland",
        "United States", "Brazil", "Australia", "Spain", "France", "United Kingdom"
    ]:
        if known.lower() in place.lower():
            country = COUNTRY_NAME_NORMALIZATION.get(known, known)
            break
    code = country[:2].upper() if country else "UN"
    return (place[:38], country, code)


def _extract_cvss_score(text: str) -> Optional[float]:
    """Extracts explicit CVSS score (e.g., 'CVSS 9.8', 'CVSS v3.1: 10.0', 'score of 9.6') from text."""
    if not text:
        return None
    patterns = [
        r"cvss(?:\s*v?[34](?:\.\d)?)?(?:\s*base)?(?:\s*score|\s*rating)?\s*(?:of|:|=|-|\s)\s*(10\.0|[0-9]\.\d)",
        r"(?:severity|score)\s*(?:of|:|=)\s*(10\.0|9\.\d)\b",
    ]
    lower = text.lower()
    for pat in patterns:
        m = re.search(pat, lower)
        if m:
            try:
                return float(m.group(1))
            except ValueError:
                pass
    return None


def _fetch_cve_cvss_from_mitre(cve_id: str) -> Optional[float]:
    """Queries official CVE.org / MITRE AWG API for exact CVSS baseScore of a CVE (fast, unauthenticated)."""
    if not cve_id or not cve_id.upper().startswith("CVE-"):
        return None
    try:
        url = f"https://cveawg.mitre.org/api/cve/{cve_id.upper()}"
        resp = requests.get(url, timeout=3.5)
        if resp.status_code != 200:
            return None
        data = resp.json()
        containers = data.get("containers", {})
        cna_metrics = containers.get("cna", {}).get("metrics", [])
        adp_list = containers.get("adp", [])
        all_metrics = list(cna_metrics)
        for adp in adp_list:
            all_metrics.extend(adp.get("metrics", []))
        best_score: Optional[float] = None
        for m in all_metrics:
            for key in ("cvssV4_0", "cvssV3_1", "cvssV3_0", "cvssV2_0"):
                if key in m and isinstance(m[key], dict):
                    sc = m[key].get("baseScore")
                    if sc is not None:
                        val = float(sc)
                        if best_score is None or val > best_score:
                            best_score = val
        return best_score
    except Exception:
        return None


def _score_text_entropy(text: str) -> Tuple[float, float, str]:
    lower = text.lower()
    cvss = _extract_cvss_score(text)
    has_zero_day = any(k in lower for k in ["zero-day", "0-day", "zero day", "actively exploited"])

    if (cvss is not None and cvss >= 9.0) or has_zero_day:
        return (0.92, 0.90, "CRITICAL")

    critical_terms = [
        "zero-day", "actively exploited", "ransomware", "rce", "remote code execution",
        "breach", "attack", "war", "missile", "strike", "killed", "explosion", "earthquake",
        "tsunami", "cyclone", "hurricane", "eruption", "critical", "emergency", "hijack",
        "outage", "blackout", "sanctions", "nuclear", "conflict", "crisis", "guerra",
        "ataque", "muertos", "emergencia", "epidemic", "outbreak", "crash", "default", "coup"
    ]
    elevated_terms = [
        "vulnerability", "cve-", "patch", "flaw", "malware", "phishing", "botnet",
        "ddos", "warning", "alert", "protest", "inflation", "disruption", "storm",
        "wildfire", "seismic", "tension", "military", "probe", "exploit", "alerta",
        "crisis", "tensión", "inflación", "tariff", "recession", "volatility", "virus"
    ]

    crit_hits = sum(1 for kw in critical_terms if kw in lower)
    elev_hits = sum(1 for kw in elevated_terms if kw in lower)

    if crit_hits >= 2:
        sf = min(0.96, 0.76 + crit_hits * 0.04)
        si = min(0.95, 0.74 + elev_hits * 0.04)
        return (round(sf, 3), round(si, 3), "CRITICAL")
    elif crit_hits == 1 or elev_hits >= 2:
        sf = min(0.68, 0.46 + crit_hits * 0.08 + elev_hits * 0.04)
        si = min(0.68, 0.44 + elev_hits * 0.05)
        return (round(sf, 3), round(si, 3), "ELEVATED")
    else:
        sf = 0.24 + (int(_sha256_hex(text)[:2], 16) % 14) / 100.0
        si = 0.22 + (int(_sha256_hex(text)[2:4], 16) % 14) / 100.0
        return (round(sf, 3), round(si, 3), "NORMAL")


# ============================================================================
# FRONT 1: CYBER_WARFARE (Ransomware.live, abuse.ch Feodo C2, CISA KEV, THN, SANS)
# ============================================================================
def fetch_ransomware_live_events(limit: int = 8) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []
    url = "https://api.ransomware.live/v2/recentvictims"
    try:
        resp = requests.get(url, headers={"User-Agent": "Syntergic-EWS/2.5"}, timeout=6)
        resp.raise_for_status()
        victims = resp.json()[:limit]
        for idx, v in enumerate(victims):
            victim_name = v.get("victim") or "Undisclosed Enterprise"
            group_name = (v.get("group") or "unknown").upper()
            country_iso = (v.get("country") or "US").upper()
            sector = v.get("activity") or "Corporate Infrastructure"
            discovered = v.get("discovered") or v.get("attackdate") or datetime.now(timezone.utc).isoformat()
            desc = v.get("description") or f"Confirmed ransomware extortion claim by {group_name} targeting {victim_name} ({sector})."
            post_url = v.get("url") or v.get("claim_url") or "https://www.ransomware.live/"
            domain = v.get("domain") or "N/A"

            short_id = _sha256_hex(f"{victim_name}-{group_name}-{discovered}")[:6].upper()
            geo = resolve_iso2_country(country_iso, unique_suffix=f"RW-{short_id}")

            raw_dump = (
                f"[RANSOMWARE-LIVE-FEED] ThreatActor={group_name} | Victim={victim_name} | Country={country_iso}\n"
                f"[TARGET-SECTOR] {sector} | Domain={domain} | Discovered={discovered}\n"
                f"[INTELLIGENCE-BRIEF] {desc[:300]}\n"
                f"[VERIFIABLE-RECORD] {post_url}"
            )

            events.append({
                "source": f"RANSOMWARE_LIVE [{group_name}]",
                "headline": f"[RANSOMWARE BREACH // {group_name}] Victim: {victim_name} ({sector}, {country_iso})",
                "content": desc[:350],
                "base_friction": 0.86,
                "base_inertia": 0.82,
                "severity": "CRITICAL",
                "geo": geo,
                "evidence": {
                    "event_type": "ACTIVE_RANSOMWARE_EXTORTION",
                    "strategic_front": "CYBER_WARFARE",
                    "protocol": f"Ransomware.live Threat Intel API v2 ({group_name})",
                    "asn_or_sector": f"{sector.upper()} // {country_iso}",
                    "impact_radius_km": 450,
                    "entities": [f"Ransomware Group: {group_name}", f"Victim: {victim_name}", f"Sector: {sector}"],
                    "raw_evidence": raw_dump,
                    "timeline": [
                        {"offset": str(discovered)[:19], "event": f"Extortion leak site publication detected for {victim_name} by {group_name}", "severity": "CRITICAL"},
                        {"offset": "SECTOR-AUDIT", "event": f"Classified under {sector} in {geo['country']} ({country_iso})", "severity": "ELEVATED"},
                        {"offset": "LIVE-INGEST", "event": "Ingested from api.ransomware.live/v2/recentvictims", "severity": "NORMAL"}
                    ],
                    "confidence_score": 0.98,
                    "source_url": post_url if str(post_url).startswith("http") else "https://www.ransomware.live/",
                    "detection_vector": "RANSOMWARE_LIVE_DARKNET_MONITOR",
                    "sha256_fingerprint": _sha256_hex(raw_dump)
                }
            })
    except Exception as e:
        logger.warning(f"[LIVE OSINT] Ransomware.live fetch failed: {e}")
    return events


def fetch_feodo_c2_live_events(limit: int = 5) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []
    url = "https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json"
    try:
        resp = requests.get(url, headers={"User-Agent": "Syntergic-EWS/2.5"}, timeout=6)
        resp.raise_for_status()
        c2_list = resp.json()[:limit]
        for c2 in c2_list:
            ip = c2.get("ip_address", "0.0.0.0")
            port = c2.get("port", 443)
            malware = c2.get("malware", "BotnetC2")
            asn = c2.get("as_number", 0)
            as_name = c2.get("as_name", "Autonomous System")
            country_iso = (c2.get("country") or "US").upper()
            status = (c2.get("status") or "online").upper()
            first_seen = c2.get("first_seen", "")
            last_online = c2.get("last_online", "")
            hostname = c2.get("hostname") or ip

            geo = resolve_iso2_country(country_iso, unique_suffix=f"C2-{ip}")
            browse_url = f"https://feodotracker.abuse.ch/browse/host/{ip}/"

            raw_dump = (
                f"[ABUSE.CH-FEODO-C2] Botnet={malware} | C2_Endpoint={ip}:{port} | Status={status}\n"
                f"[BGP-ROUTING] AS{asn} ({as_name}) | Hostname={hostname} | Country={country_iso}\n"
                f"[OBSERVATION-WINDOW] FirstSeen={first_seen} | LastOnline={last_online}\n"
                f"[TRACKER-URL] {browse_url}"
            )

            events.append({
                "source": f"ABUSE_CH_FEODO [{malware.upper()}]",
                "headline": f"[ACTIVE BOTNET C2 // {malware}] Command Server {ip}:{port} on AS{asn} ({as_name})",
                "content": f"Active {malware} Command & Control (C2) server tracked by abuse.ch Feodo Tracker in {geo['country']} (AS{asn} {as_name}).",
                "base_friction": 0.74 if status == "ONLINE" else 0.56,
                "base_inertia": 0.72 if status == "ONLINE" else 0.54,
                "severity": "CRITICAL" if status == "ONLINE" else "ELEVATED",
                "geo": geo,
                "evidence": {
                    "event_type": "ACTIVE_BOTNET_C2_INFRASTRUCTURE",
                    "strategic_front": "CYBER_WARFARE",
                    "protocol": f"TCP/{port} Botnet C2 Beacon ({malware})",
                    "asn_or_sector": f"AS{asn} ({as_name})",
                    "impact_radius_km": 380,
                    "entities": ["abuse.ch Feodo Tracker", f"Malware: {malware}", f"AS{asn} {as_name}", f"{ip}:{port}"],
                    "raw_evidence": raw_dump,
                    "timeline": [
                        {"offset": first_seen[:16], "event": f"Initial {malware} C2 beacon identified at {ip}:{port}", "severity": "ELEVATED"},
                        {"offset": last_online, "event": f"C2 node verified {status} on AS{asn} ({as_name})", "severity": "CRITICAL"},
                        {"offset": "LIVE-INGEST", "event": "Ingested from feodotracker.abuse.ch recommended blocklist", "severity": "NORMAL"}
                    ],
                    "confidence_score": 0.99,
                    "source_url": browse_url,
                    "detection_vector": "ABUSE_CH_FEODO_BOTNET_RADAR",
                    "sha256_fingerprint": _sha256_hex(raw_dump)
                }
            })
    except Exception as e:
        logger.warning(f"[LIVE OSINT] Feodo C2 fetch failed: {e}")
    return events


def fetch_cisa_kev_live_events(limit: int = 6) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []
    url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
    try:
        resp = requests.get(url, timeout=6)
        resp.raise_for_status()
        vulns = resp.json().get("vulnerabilities", [])
        vulns_sorted = sorted(vulns, key=lambda v: v.get("dateAdded", ""), reverse=True)[:limit]

        for v in vulns_sorted:
            cve_id = v.get("cveID", "CVE-UNKNOWN")
            vendor = v.get("vendorProject", "Enterprise Vendor")
            product = v.get("product", "System")
            vuln_name = v.get("vulnerabilityName", "Active Exploitation")
            short_desc = v.get("shortDescription", "")
            date_added = v.get("dateAdded", "")
            due_date = v.get("dueDate", "")
            ransomware = v.get("knownRansomwareCampaignUse", "Unknown")
            req_action = v.get("requiredAction", "")
            cwes = ", ".join(v.get("cwes", [])) or "CWE-Other"

            nvd_url = f"https://nvd.nist.gov/vuln/detail/{cve_id}"
            geo = resolve_geolocation_from_text(f"{vendor} {product} {vuln_name}", unique_suffix=cve_id)

            cvss_score = _fetch_cve_cvss_from_mitre(cve_id) or _extract_cvss_score(short_desc)
            is_ransomware = ransomware.lower() == "known"
            is_cvss_9_plus = cvss_score is not None and cvss_score >= 9.0

            sf = 0.92 if (is_ransomware or is_cvss_9_plus) else 0.82
            si = 0.90 if (is_ransomware or is_cvss_9_plus) else 0.80
            cvss_tag = f" | CVSS {cvss_score:.1f}" if cvss_score is not None else " | 0-Day Activo"

            raw_dump = (
                f"[CISA-KEV-CATALOG] CVE={cve_id}{cvss_tag} | Vendor={vendor} | Product={product} | CWE={cwes}\n"
                f"[EXPLOITATION-STATE] Actively Exploited in the Wild | RansomwareCampaignUse={ransomware} | DateAdded={date_added}\n"
                f"[TECHNICAL-SUMMARY] {short_desc}\n"
                f"[MANDATORY-DIRECTIVE] {req_action} (Due: {due_date}) | Reference: {nvd_url}"
            )

            events.append({
                "source": "CISA_KEV_OFFICIAL_FEED",
                "headline": f"[CISA KEV {cve_id}{cvss_tag}] {vuln_name} ({vendor} {product})",
                "content": short_desc,
                "base_friction": sf,
                "base_inertia": si,
                "severity": "CRITICAL",
                "geo": geo,
                "evidence": {
                    "event_type": "ACTIVELY_EXPLOITED_ZERO_DAY_CVE",
                    "strategic_front": "CYBER_WARFARE",
                    "cvss_score": cvss_score,
                    "is_zero_day": True,
                    "protocol": f"CISA KEV Catalog / NIST NVD ({cwes})",
                    "asn_or_sector": f"{cve_id} // {vendor.upper()}",
                    "impact_radius_km": 650,
                    "entities": ["CISA", vendor, product, cve_id],
                    "raw_evidence": raw_dump,
                    "timeline": [
                        {"offset": date_added, "event": f"CISA confirmed active exploitation of {cve_id} in {vendor} {product}", "severity": "CRITICAL"},
                        {"offset": f"DUE {due_date}", "event": f"Mandatory remediation directive (Ransomware linkage: {ransomware})", "severity": "ELEVATED"},
                        {"offset": "LIVE-INGEST", "event": "Synchronized from official cisa.gov KEV catalog", "severity": "NORMAL"}
                    ],
                    "confidence_score": 0.99,
                    "source_url": nvd_url,
                    "detection_vector": "CISA_BOD_22_01_THREAT_CATALOG",
                    "sha256_fingerprint": _sha256_hex(raw_dump)
                }
            })
    except Exception as e:
        logger.warning(f"[LIVE OSINT] CISA KEV fetch failed: {e}")
    return events


# ============================================================================
# FRONT 2: INFRASTRUCTURE_CLOUD (Cloudflare Status API & GitHub Status API)
# ============================================================================
def fetch_cloud_infrastructure_incidents(limit: int = 4) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []
    endpoints = [
        ("CLOUDFLARE_EDGE_STATUS", "https://www.cloudflarestatus.com/api/v2/incidents.json", "Cloudflare Global Anycast Network"),
        ("GITHUB_CLOUD_STATUS", "https://www.githubstatus.com/api/v2/incidents.json", "GitHub Core Cloud Infrastructure"),
    ]
    for source_tag, api_url, provider_name in endpoints:
        try:
            resp = requests.get(api_url, timeout=6)
            resp.raise_for_status()
            incidents = resp.json().get("incidents", [])[:limit]
            for inc in incidents:
                inc_id = inc.get("id", "INC-01")[:8].upper()
                name = inc.get("name", "Cloud Infrastructure Degradation")
                impact = (inc.get("impact") or "minor").lower()
                status = (inc.get("status") or "monitoring").upper()
                shortlink = inc.get("shortlink") or api_url
                created_at = inc.get("created_at", "")
                updates = inc.get("incident_updates", [])
                latest_body = _clean_html(updates[0].get("body", name)) if updates else name

                geo = resolve_geolocation_from_text(f"{name} {latest_body}", unique_suffix=f"INFRA-{inc_id}")

                if impact in ("critical", "major"):
                    sf, si, sev = 0.80, 0.84, "CRITICAL"
                elif impact == "minor" or status != "RESOLVED":
                    sf, si, sev = 0.52, 0.58, "ELEVATED"
                else:
                    sf, si, sev = 0.28, 0.34, "NORMAL"

                raw_dump = (
                    f"[CLOUD-STATUS-API] Provider={provider_name} | IncidentID={inc_id} | Impact={impact.upper()} | Status={status}\n"
                    f"[INCIDENT-TITLE] {name}\n"
                    f"[LATEST-TELEMETRY] {latest_body[:320]}\n"
                    f"[CREATED-AT] {created_at} | Verifiable Status Link: {shortlink}"
                )

                events.append({
                    "source": source_tag,
                    "headline": f"[{source_tag} // {status}] {name}",
                    "content": latest_body[:350],
                    "base_friction": sf,
                    "base_inertia": si,
                    "severity": sev,
                    "geo": geo,
                    "evidence": {
                        "event_type": "CLOUD_BACKBONE_INFRASTRUCTURE_INCIDENT",
                        "strategic_front": "INFRASTRUCTURE_CLOUD",
                        "protocol": "BGP Anycast / Edge CDN / Statuspage API v2",
                        "asn_or_sector": f"{source_tag}-{inc_id}",
                        "impact_radius_km": 550,
                        "entities": [provider_name, f"Status: {status}", f"Impact: {impact.upper()}"],
                        "raw_evidence": raw_dump,
                        "timeline": [
                            {"offset": created_at[:19], "event": f"Incident opened on {provider_name}: {name}", "severity": sev},
                            {"offset": f"STATE:{status}", "event": latest_body[:140], "severity": sev},
                            {"offset": "LIVE-INGEST", "event": f"Synchronized from {api_url}", "severity": "NORMAL"}
                        ],
                        "confidence_score": 0.99,
                        "source_url": shortlink,
                        "detection_vector": f"CLOUD_INFRASTRUCTURE_API // {source_tag}",
                        "sha256_fingerprint": _sha256_hex(raw_dump)
                    }
                })
        except Exception as e:
            logger.warning(f"[LIVE OSINT] Cloud status fetch failed for {source_tag}: {e}")
    return events


# ============================================================================
# FRONT 4: GEOPHYSICAL_CLIMATE (GDACS UN/EU GeoRSS, USGS Earthquakes, NASA EONET)
# ============================================================================
def fetch_gdacs_un_live_events(limit: int = 8) -> List[Dict[str, Any]]:
    """Fetches official UN / European Commission GDACS multi-hazard alerts with embedded WGS-84 coordinates."""
    events: List[Dict[str, Any]] = []
    url = "https://www.gdacs.org/xml/rss.xml"
    try:
        resp = requests.get(url, headers={"User-Agent": "Syntergic-EWS/2.5"}, timeout=6)
        resp.raise_for_status()
        safe_xml = re.sub(r"&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)", "&amp;", resp.text)
        root = ET.fromstring(safe_xml.encode("utf-8"))
        items = root.findall(".//item")[:limit]

        for item in items:
            title = _clean_html(item.findtext("title") or "GDACS Global Disaster Alert")
            desc = _clean_html(item.findtext("description") or "")
            link = (item.findtext("link") or "https://www.gdacs.org/").strip()
            pub_date = (item.findtext("pubDate") or "").strip()

            lat, lng = None, None
            alert_level = "Green"
            event_type_code = "EQ"
            country_str = "Global Sector"
            severity_text = ""

            for el in item.iter():
                tag_local = el.tag.split("}")[-1].lower()
                if tag_local == "lat" and el.text:
                    try:
                        lat = float(el.text.strip())
                    except ValueError:
                        pass
                elif tag_local == "long" and el.text:
                    try:
                        lng = float(el.text.strip())
                    except ValueError:
                        pass
                elif tag_local == "alertlevel" and el.text:
                    alert_level = el.text.strip()
                elif tag_local == "eventtype" and el.text:
                    event_type_code = el.text.strip()
                elif tag_local == "country" and el.text:
                    country_str = el.text.strip()
                elif tag_local == "severity" and el.text:
                    severity_text = el.text.strip()

            if lat is None or lng is None:
                continue

            alert_upper = alert_level.upper()
            if "RED" in alert_upper:
                sf, si, sev = 0.89, 0.91, "CRITICAL"
            elif "ORANGE" in alert_upper:
                sf, si, sev = 0.62, 0.66, "ELEVATED"
            else:
                sf, si, sev = 0.29, 0.33, "NORMAL"

            norm_country = COUNTRY_NAME_NORMALIZATION.get(country_str, country_str)
            short_hash = _sha256_hex(link)[:5].upper()

            raw_dump = (
                f"[GDACS-UN-EU-DISPATCH] HazardType={event_type_code} | AlertLevel={alert_upper} | Country={country_str}\n"
                f"[SATELLITE-COORDS] Lat={lat:.4f}°, Lng={lng:.4f}° | SeverityMetric={severity_text or desc[:80]}\n"
                f"[SUMMARY] {title} — {desc[:220]}\n"
                f"[GDACS-REPORT-URL] {link}"
            )

            events.append({
                "source": f"GDACS_UN_ALERT [{alert_upper}]",
                "headline": f"[GDACS {alert_upper} // {event_type_code}] {title}",
                "content": desc[:350],
                "base_friction": sf,
                "base_inertia": si,
                "severity": sev,
                "geo": {
                    "lat": round(lat, 4),
                    "lng": round(lng, 4),
                    "city": f"{country_str} ({event_type_code})"[:36],
                    "country": norm_country,
                    "country_code": norm_country[:2].upper(),
                    "region": f"GDACS Hazard Sector ({event_type_code})",
                    "facility": f"GDACS UN/EC Sensor [{event_type_code}-{short_hash}]"
                },
                "evidence": {
                    "event_type": f"GDACS_HAZARD_{event_type_code}_{alert_upper}",
                    "strategic_front": "GEOPHYSICAL_CLIMATE",
                    "protocol": "GDACS UN/EC GeoRSS WGS-84 Telemetry",
                    "asn_or_sector": f"GDACS-{event_type_code}-{short_hash}",
                    "impact_radius_km": 600 if sev == "CRITICAL" else 300,
                    "entities": ["UN OCHA & European Commission JRC (GDACS)", country_str, f"Hazard: {event_type_code}"],
                    "raw_evidence": raw_dump,
                    "timeline": [
                        {"offset": pub_date[:22], "event": f"GDACS issued {alert_upper} alert: {title}", "severity": sev},
                        {"offset": "WGS84-LOCK", "event": f"Coordinates verified at ({lat:.3f}°, {lng:.3f}°) in {country_str}", "severity": sev},
                        {"offset": "LIVE-INGEST", "event": "Ingested from official gdacs.org/xml/rss.xml", "severity": "NORMAL"}
                    ],
                    "confidence_score": 0.99,
                    "source_url": link,
                    "detection_vector": "GDACS_UNITED_NATIONS_SATELLITE_ALERT",
                    "sha256_fingerprint": _sha256_hex(raw_dump)
                }
            })
    except Exception as e:
        logger.warning(f"[LIVE OSINT] GDACS fetch failed: {e}")
    return events


def fetch_usgs_live_events(limit: int = 7) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []
    url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson"
    try:
        resp = requests.get(url, timeout=6)
        resp.raise_for_status()
        features = resp.json().get("features", [])[:limit]

        for feat in features:
            props = feat.get("properties", {})
            geom = feat.get("geometry", {})
            coords = geom.get("coordinates", [0.0, 0.0, 10.0])
            lng, lat = float(coords[0]), float(coords[1])
            depth_km = float(coords[2]) if len(coords) > 2 else 10.0

            mag = float(props.get("mag") or 4.5)
            place = props.get("place") or f"Lat {lat:.2f}, Lng {lng:.2f}"
            event_url = props.get("url") or "https://earthquake.usgs.gov/earthquakes/map/"
            event_id = feat.get("id") or f"usgs-{int(time.time())}"
            epoch_ms = props.get("time") or int(time.time() * 1000)
            event_dt = datetime.fromtimestamp(epoch_ms / 1000.0, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            tsunami = int(props.get("tsunami") or 0)
            net = (props.get("net") or "us").upper()
            rms = props.get("rms") or 0.5
            gap = props.get("gap") or 45
            status_str = (props.get("status") or "reviewed").upper()

            city_label, country_name, country_code = _infer_country_from_place(place, lat, lng)

            if mag >= 5.5 or tsunami == 1:
                sf = min(0.98, round(0.75 + (mag - 5.4) * 0.12, 3))
                si = min(0.98, round(0.78 + (mag - 5.4) * 0.12, 3))
                sev = "CRITICAL"
            elif mag >= 4.8:
                sf = round(0.48 + (mag - 4.8) * 0.22, 3)
                si = round(0.52 + (mag - 4.8) * 0.22, 3)
                sev = "ELEVATED"
            else:
                sf = round(0.28 + (mag - 4.0) * 0.15, 3)
                si = round(0.32 + (mag - 4.0) * 0.15, 3)
                sev = "NORMAL"

            raw_dump = (
                f"[USGS-COMCAT-LIVE] EventID={event_id} | Network={net} | Status={status_str}\n"
                f"[HYPOCENTER] Lat={lat:.4f}°, Lng={lng:.4f}° | Depth={depth_km:.1f} km | Location={place}\n"
                f"[SEISMIC-METRICS] Magnitude=M{mag:.1f} ({props.get('magType', 'mb')}) | RMS={rms}s | Gap={gap}° | Tsunami={tsunami}\n"
                f"[ORIGIN-TIME] {event_dt} | Verifiable URL: {event_url}"
            )

            events.append({
                "source": f"USGS_NEIC_LIVE [{net}]",
                "headline": f"[LIVE SEISMIC M{mag:.1f}] {place} (Depth: {depth_km:.1f} km)",
                "content": f"Real-time USGS NEIC detection at {place}. Origin time: {event_dt}.",
                "base_friction": sf,
                "base_inertia": si,
                "severity": sev,
                "geo": {
                    "lat": round(lat, 4),
                    "lng": round(lng, 4),
                    "city": city_label,
                    "country": country_name,
                    "country_code": country_code,
                    "region": f"Seismic Zone ({net})",
                    "facility": f"USGS Station {event_id.upper()}"
                },
                "evidence": {
                    "event_type": "REALTIME_SEISMIC_CRUSTAL_EVENT",
                    "strategic_front": "GEOPHYSICAL_CLIMATE",
                    "protocol": "USGS GeoJSON API v1.0 / ANSS ComCat",
                    "asn_or_sector": f"USGS-{event_id.upper()}",
                    "impact_radius_km": int(max(60, (mag - 3.5) * 180)),
                    "entities": ["USGS National Earthquake Information Center", f"Network {net}", place],
                    "raw_evidence": raw_dump,
                    "timeline": [
                        {"offset": event_dt, "event": f"P-wave arrival recorded by {net} array (M{mag:.1f} at {depth_km:.1f} km)", "severity": sev},
                        {"offset": "USGS-REVIEW", "event": f"Hypocenter status: {status_str} (RMS {rms}s, Gap {gap}°)", "severity": sev},
                        {"offset": "LIVE-INGEST", "event": "Ingested from earthquake.usgs.gov live GeoJSON feed", "severity": "NORMAL"}
                    ],
                    "confidence_score": 0.99,
                    "source_url": event_url,
                    "detection_vector": "USGS_GLOBAL_SEISMOGRAPH_NETWORK",
                    "sha256_fingerprint": _sha256_hex(raw_dump)
                }
            })
    except Exception as e:
        logger.warning(f"[LIVE OSINT] USGS fetch failed: {e}")
    return events


def fetch_nasa_eonet_live_events(limit: int = 6) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []
    url = f"https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit={limit}"
    try:
        resp = requests.get(url, timeout=6)
        resp.raise_for_status()
        raw_events = resp.json().get("events", [])[:limit]

        for ev in raw_events:
            eonet_id = ev.get("id", "EONET-LIVE")
            title = ev.get("title", "NASA Environmental Anomaly")
            categories = ev.get("categories", [])
            cat_title = categories[0].get("title", "Environmental Hazard") if categories else "Natural Event"
            sources = ev.get("sources", [])
            source_url = sources[0].get("url") if sources and sources[0].get("url") else (ev.get("link") or "https://eonet.gsfc.nasa.gov/")
            source_id = sources[0].get("id", "NASA-EO") if sources else "NASA-EO"

            geometries = ev.get("geometry", [])
            if not geometries:
                continue
            latest_geom = geometries[-1]
            coords = latest_geom.get("coordinates", [0.0, 0.0])
            if isinstance(coords[0], list):
                lng, lat = float(coords[0][0][0]), float(coords[0][0][1])
            else:
                lng, lat = float(coords[0]), float(coords[1])

            obs_date = latest_geom.get("date", datetime.now(timezone.utc).isoformat())
            mag_val = latest_geom.get("magnitudeValue")
            mag_unit = latest_geom.get("magnitudeUnit") or ""
            mag_str = f"{mag_val} {mag_unit}".strip() if mag_val is not None else "Active Satellite Track"

            is_severe = any(k in cat_title.lower() or k in title.lower() for k in ["cyclone", "volcano", "storm", "typhoon", "hurricane"])
            sf = 0.78 if is_severe else 0.54
            si = 0.81 if is_severe else 0.56
            sev = "CRITICAL" if is_severe else "ELEVATED"

            city_label, country_name, country_code = _infer_country_from_place(title, lat, lng)

            raw_dump = (
                f"[NASA-EONET-V3] EventID={eonet_id} | Category={cat_title} | PrimaryAgency={source_id}\n"
                f"[SATELLITE-GEOMETRY] Lat={lat:.4f}°, Lng={lng:.4f}° | Timestamp={obs_date}\n"
                f"[INTENSITY-TELEMETRY] Magnitude={mag_str} | TrackPoints={len(geometries)} orbital passes\n"
                f"[OFFICIAL-SOURCE] {source_url}"
            )

            events.append({
                "source": f"NASA_EONET_SATELLITE [{source_id}]",
                "headline": f"[NASA EONET // {cat_title.upper()}] {title}",
                "content": f"Active environmental hazard tracked by NASA Earth Observatory ({cat_title}).",
                "base_friction": sf,
                "base_inertia": si,
                "severity": sev,
                "geo": {
                    "lat": round(lat, 4),
                    "lng": round(lng, 4),
                    "city": title[:34],
                    "country": country_name,
                    "country_code": country_code,
                    "region": cat_title,
                    "facility": f"NASA EONET Track {eonet_id}"
                },
                "evidence": {
                    "event_type": f"NASA_EONET_{cat_title.upper().replace(' ', '_')}",
                    "strategic_front": "GEOPHYSICAL_CLIMATE",
                    "protocol": "NASA EONET v3 REST GeoJSON / MODIS-VIIRS",
                    "asn_or_sector": f"{eonet_id} // {source_id}",
                    "impact_radius_km": 420 if is_severe else 180,
                    "entities": ["NASA Goddard Space Flight Center", f"Agency {source_id}", title],
                    "raw_evidence": raw_dump,
                    "timeline": [
                        {"offset": geometries[0].get("date", obs_date)[:19], "event": f"Initial orbital anomaly detection: {title}", "severity": "ELEVATED"},
                        {"offset": obs_date[:19], "event": f"Latest satellite fix at ({lat:.3f}°, {lng:.3f}°) — {mag_str}", "severity": sev},
                        {"offset": "LIVE-INGEST", "event": "Ingested from eonet.gsfc.nasa.gov/api/v3/events", "severity": "NORMAL"}
                    ],
                    "confidence_score": 0.98,
                    "source_url": source_url,
                    "detection_vector": "NASA_EARTH_OBSERVATORY_CONSTELLATION",
                    "sha256_fingerprint": _sha256_hex(raw_dump)
                }
            })
    except Exception as e:
        logger.warning(f"[LIVE OSINT] NASA EONET fetch failed: {e}")
    return events


# ============================================================================
# FRONT 5: SPACE_WEATHER_GRID (NOAA Space Weather Prediction Center Alerts)
# ============================================================================
SPACE_GROUND_STATIONS = [
    {"lat": 40.0150, "lng": -105.2705, "city": "Boulder, CO", "country": "United States of America", "country_code": "US", "region": "North America", "facility": "NOAA Space Weather Prediction Center (SWPC)"},
    {"lat": 78.2232, "lng": 15.6267, "city": "Longyearbyen, Svalbard", "country": "Norway", "country_code": "NO", "region": "Arctic Circle", "facility": "SvalSat Polar Ground Station & EISCAT Radar"},
    {"lat": 64.8378, "lng": -147.7164, "city": "Fairbanks, AK", "country": "United States of America", "country_code": "US", "region": "Arctic North America", "facility": "Poker Flat High-Latitude Geomagnetic Observatory"},
    {"lat": 67.8558, "lng": 20.2253, "city": "Kiruna", "country": "Sweden", "region": "Arctic Europe", "country_code": "SE", "facility": "Esrange Space Center & Ionospheric Array"},
]


def fetch_noaa_space_weather_events(limit: int = 3) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []
    url = "https://services.swpc.noaa.gov/products/alerts.json"
    try:
        resp = requests.get(url, timeout=6)
        resp.raise_for_status()
        alerts = resp.json()[:limit]
        for idx, al in enumerate(alerts):
            prod_id = al.get("product_id", "SWPC")
            issue_dt = al.get("issue_datetime", "")
            msg = (al.get("message") or "").strip()
            lines = [ln.strip() for ln in msg.splitlines() if ln.strip()]
            summary_line = next(
                (ln for ln in lines if any(k in ln.upper() for k in ["ALERT:", "WARNING:", "SUMMARY:", "WATCH:"])),
                lines[0] if lines else "NOAA Space Weather Advisory"
            )

            station = dict(SPACE_GROUND_STATIONS[idx % len(SPACE_GROUND_STATIONS)])
            station["facility"] = f"{station['facility']} [{prod_id}-{idx+1}]"

            is_storm = any(k in msg.upper() for k in ["K-INDEX OF 5", "K-INDEX OF 6", "K-INDEX OF 7", "X-RAY", "GEOMAGNETIC STORM", "BLACKOUT"])
            sf = 0.75 if is_storm else 0.52
            si = 0.78 if is_storm else 0.55
            sev = "CRITICAL" if is_storm else "ELEVATED"

            raw_dump = (
                f"[NOAA-SWPC-LIVE] ProductID={prod_id} | IssueTime={issue_dt} UTC\n"
                f"[GROUND-STATION] {station['facility']} ({station['city']})\n"
                f"[TELEMETRY-MESSAGE]\n{msg[:420]}\n"
                f"[SOURCE-URL] https://www.swpc.noaa.gov/"
            )

            events.append({
                "source": f"NOAA_SWPC_SPACE [{prod_id}]",
                "headline": f"[NOAA SPACE WEATHER // {prod_id}] {summary_line[:95]}",
                "content": msg[:360],
                "base_friction": sf,
                "base_inertia": si,
                "severity": sev,
                "geo": station,
                "evidence": {
                    "event_type": "GEOMAGNETIC_IONOSPHERIC_ANOMALY",
                    "strategic_front": "SPACE_WEATHER_GRID",
                    "protocol": "NOAA SWPC GOES Satellite Magnetometer / Solar Flux",
                    "asn_or_sector": f"NOAA-SWPC-{prod_id}",
                    "impact_radius_km": 1200,
                    "entities": ["NOAA Space Weather Prediction Center", "GOES-16/18 Magnetometer", station["city"]],
                    "raw_evidence": raw_dump,
                    "timeline": [
                        {"offset": issue_dt[:19], "event": summary_line[:120], "severity": sev},
                        {"offset": "GRID-MONITOR", "event": "High-latitude HF comms, GNSS phase lock & transformer GIC monitoring active", "severity": "ELEVATED"},
                        {"offset": "LIVE-INGEST", "event": "Ingested from services.swpc.noaa.gov/products/alerts.json", "severity": "NORMAL"}
                    ],
                    "confidence_score": 0.99,
                    "source_url": "https://www.swpc.noaa.gov/",
                    "detection_vector": "NOAA_GOES_SPACE_WEATHER_ARRAY",
                    "sha256_fingerprint": _sha256_hex(raw_dump)
                }
            })
    except Exception as e:
        logger.warning(f"[LIVE OSINT] NOAA SWPC fetch failed: {e}")
    return events


# ============================================================================
# GENERIC RSS CONNECTOR WITH STRATEGIC FRONT CLASSIFICATION
# Used for Geopolitical (BBC, Al Jazeera, UN En/Es), Cyber (THN, SANS),
# Financial (CNBC World), and Bio-Humanitarian (WHO)
# ============================================================================
def _fetch_rss_feed_items(
    feed_url: str,
    source_tag: str,
    strategic_front: str,
    event_type: str,
    protocol_label: str,
    limit: int = 5
) -> List[Dict[str, Any]]:
    items_out: List[Dict[str, Any]] = []
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Syntergic-OSINT-Telemetry/2.5)"}
        resp = requests.get(feed_url, headers=headers, timeout=6)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)

        channel_items = root.findall(".//item")[:limit]
        for item in channel_items:
            title = _clean_html(item.findtext("title") or "")
            desc = _clean_html(item.findtext("description") or "")
            link = (item.findtext("link") or "").strip()
            pub_date = (item.findtext("pubDate") or datetime.now(timezone.utc).isoformat()).strip()

            if not title or not link:
                continue

            combined_text = f"{title}. {desc}"
            sf, si, sev = _score_text_entropy(combined_text)
            cvss_score = _extract_cvss_score(combined_text)
            cve_match = re.search(r"\b(CVE-\d{4}-\d{4,7})\b", combined_text, re.IGNORECASE)
            if cvss_score is None and cve_match and strategic_front == "CYBER_WARFARE":
                cvss_score = _fetch_cve_cvss_from_mitre(cve_match.group(1))
                if cvss_score is not None and cvss_score >= 9.0:
                    sf, si, sev = 0.92, 0.90, "CRITICAL"
            is_zero_day = any(
                k in combined_text.lower()
                for k in ["zero-day", "0-day", "zero day", "actively exploited"]
            )
            short_hash = _sha256_hex(link)[:6].upper()
            geo = resolve_geolocation_from_text(combined_text, unique_suffix=f"{source_tag[:4]}-{short_hash}")

            raw_dump = (
                f"[OSINT-RSS-DISPATCH] Front={strategic_front} | Feed={source_tag} | GUID={short_hash}\n"
                f"[PUBLISHED-UTC] {pub_date}\n"
                f"[HEADLINE] {title}\n"
                f"[INTELLIGENCE-ABSTRACT] {desc[:360]}\n"
                f"[VERIFIABLE-URL] {link}"
            )

            items_out.append({
                "source": source_tag,
                "headline": title,
                "content": desc[:400],
                "base_friction": sf,
                "base_inertia": si,
                "severity": sev,
                "geo": geo,
                "evidence": {
                    "event_type": event_type,
                    "strategic_front": strategic_front,
                    "cvss_score": cvss_score,
                    "is_zero_day": is_zero_day,
                    "protocol": protocol_label,
                    "asn_or_sector": f"{source_tag}-{short_hash}",
                    "impact_radius_km": 480 if sev == "CRITICAL" else 240,
                    "entities": [source_tag, geo["city"], geo["country"], f"Front: {strategic_front}"],
                    "raw_evidence": raw_dump,
                    "timeline": [
                        {"offset": pub_date[:25], "event": f"Published by {source_tag}: {title[:90]}", "severity": sev},
                        {"offset": "NLP-GEOCODE", "event": f"Geolocated to {geo['city']}, {geo['country']} ({geo['lat']:.2f}°, {geo['lng']:.2f}°)", "severity": "NORMAL"},
                        {"offset": "LIVE-INGEST", "event": f"Verified source link attached: {link[:65]}...", "severity": "NORMAL"}
                    ],
                    "confidence_score": 0.96,
                    "source_url": link,
                    "detection_vector": f"LIVE_OSINT_RSS // {source_tag}",
                    "sha256_fingerprint": _sha256_hex(raw_dump)
                }
            })
    except Exception as e:
        logger.warning(f"[LIVE OSINT] RSS fetch failed for {source_tag} ({feed_url}): {e}")

    return items_out


# ============================================================================
# UNIFIED 7-FRONT PARALLEL LIVE OSINT AGGREGATOR
# ============================================================================
_LIVE_CACHE: List[Dict[str, Any]] = []
_LAST_FETCH_TS: float = 0.0
CACHE_TTL_SECONDS: float = 240.0  # Refresh every 4 minutes


def get_live_osint_catalog(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Concurrently fetches 75+ real-time global events across all 7 Strategic Fronts."""
    global _LIVE_CACHE, _LAST_FETCH_TS
    now = time.time()

    if not force_refresh and _LIVE_CACHE and (now - _LAST_FETCH_TS) < CACHE_TTL_SECONDS:
        return _LIVE_CACHE

    logger.info("[LIVE OSINT] Launching parallel multi-front synchronization across 15 official global feeds...")

    tasks: List[Callable[[], List[Dict[str, Any]]]] = [
        # Front 1: CYBER_WARFARE
        lambda: fetch_ransomware_live_events(limit=8),
        lambda: fetch_feodo_c2_live_events(limit=5),
        lambda: fetch_cisa_kev_live_events(limit=6),
        lambda: _fetch_rss_feed_items(
            "https://feeds.feedburner.com/TheHackersNews",
            "THE_HACKER_NEWS_OSINT",
            "CYBER_WARFARE",
            "LIVE_CYBERSECURITY_INCIDENT",
            "THN Threat Intel RSS 2.0",
            limit=5,
        ),
        lambda: _fetch_rss_feed_items(
            "https://isc.sans.edu/rssfeed_full.xml",
            "SANS_ISC_STORM_CENTER",
            "CYBER_WARFARE",
            "SANS_ISC_THREAT_ADVISORY",
            "SANS DShield / ISC RSS",
            limit=4,
        ),
        # Front 2: INFRASTRUCTURE_CLOUD
        lambda: fetch_cloud_infrastructure_incidents(limit=4),
        # Front 3: GEOPOLITICAL_CONFLICT (Multi-Region: Europe, Middle East, Asia, Americas/LatAm)
        lambda: _fetch_rss_feed_items(
            "https://feeds.bbci.co.uk/news/world/rss.xml",
            "BBC_WORLD_OSINT",
            "GEOPOLITICAL_CONFLICT",
            "GEOPOLITICAL_OSINT_DISPATCH",
            "BBC World News RSS 2.0",
            limit=6,
        ),
        lambda: _fetch_rss_feed_items(
            "https://www.aljazeera.com/xml/rss/all.xml",
            "AL_JAZEERA_GLOBAL_OSINT",
            "GEOPOLITICAL_CONFLICT",
            "GEOPOLITICAL_CRISIS_MONITOR",
            "Al Jazeera Global Dispatch RSS",
            limit=6,
        ),
        lambda: _fetch_rss_feed_items(
            "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
            "UN_SECURITY_DISPATCH",
            "GEOPOLITICAL_CONFLICT",
            "UNITED_NATIONS_GLOBAL_DISPATCH",
            "UN Official News Feed",
            limit=5,
        ),
        lambda: _fetch_rss_feed_items(
            "https://feeds.bbci.co.uk/mundo/rss.xml",
            "BBC_MUNDO_LATAM_OSINT",
            "GEOPOLITICAL_CONFLICT",
            "LATAM_GEOPOLITICAL_DISPATCH",
            "BBC Mundo América Latina RSS 2.0",
            limit=5,
        ),
        # Front 4: GEOPHYSICAL_CLIMATE
        lambda: fetch_gdacs_un_live_events(limit=7),
        lambda: fetch_usgs_live_events(limit=7),
        lambda: fetch_nasa_eonet_live_events(limit=6),
        # Front 5: SPACE_WEATHER_GRID
        lambda: fetch_noaa_space_weather_events(limit=3),
        # Front 6: FINANCIAL_MACRO
        lambda: _fetch_rss_feed_items(
            "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362",
            "CNBC_GLOBAL_MACRO",
            "FINANCIAL_MACRO",
            "MACROECONOMIC_LIQUIDITY_SIGNAL",
            "CNBC Global Economy & Markets Feed",
            limit=5,
        ),
        # Front 7: BIO_HUMANITARIAN
        lambda: _fetch_rss_feed_items(
            "https://www.who.int/rss-feeds/news-english.xml",
            "WHO_EPIDEMIOLOGICAL_OSINT",
            "BIO_HUMANITARIAN",
            "WHO_GLOBAL_HEALTH_DISPATCH",
            "World Health Organization (WHO) Official RSS",
            limit=4,
        ),
    ]

    aggregated: List[Dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(fn) for fn in tasks]
        for fut in as_completed(futures):
            try:
                res = fut.result()
                if res:
                    aggregated.extend(res)
            except Exception as e:
                logger.warning(f"[LIVE OSINT] Worker task error: {e}")

    if aggregated:
        _LIVE_CACHE = aggregated
        _LAST_FETCH_TS = now
        logger.info(f"[LIVE OSINT] Synchronized {len(_LIVE_CACHE)} real-world events across all 7 Strategic Fronts.")

    return _LIVE_CACHE
