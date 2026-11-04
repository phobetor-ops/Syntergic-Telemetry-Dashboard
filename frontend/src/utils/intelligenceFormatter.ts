import { TelemetryRecord } from "@/types/telemetry";

export interface DecisionIntelligence {
  cleanTitle: string;
  summary: string;
  categoryBadge: string;
  shortTag: string;
  sourceLabel: string;
  severityLabel: "CRÍTICO" | "OBSERVACIÓN" | "INFORMATIVO";
  recommendation: string;
  impactScope: string;
  cveId: string | null;
  cvssScore: number | null;
  isZeroDay: boolean;
  affectedAsset: string;
  locationLabel: string;
  frontLabel: string;
}

export const FRONT_META: Record<
  string,
  { label: string; shortLabel: string; color: string; description: string }
> = {
  ALL: {
    label: "Todos los Frentes",
    shortLabel: "GLOBAL (7 FRENTES)",
    color: "cyan",
    description: "Panorama global unificado de las 15 fuentes oficiales",
  },
  CYBER_WARFARE: {
    label: "Ciberdefensa & Zero-Days",
    shortLabel: "CIBERDEFENSA & 0-DAYS",
    color: "rose",
    description: "Vulnerabilidades CISA KEV, CVEs críticos, Ransomware y servidores Botnet C2",
  },
  INFRASTRUCTURE_CLOUD: {
    label: "Infraestructura Cloud & Redes",
    shortLabel: "CLOUD & REDES",
    color: "cyan",
    description: "Estado operativo global de Cloudflare Edge, GitHub y rutas troncales",
  },
  GEOPOLITICAL_CONFLICT: {
    label: "Geopolítica & Conflictos",
    shortLabel: "GEOPOLÍTICA",
    color: "amber",
    description: "Seguridad internacional, conflictos armados, sanciones y crisis diplomáticas",
  },
  GEOPHYSICAL_CLIMATE: {
    label: "Sismos & Desastres Naturales",
    shortLabel: "SISMOS & CLIMA",
    color: "emerald",
    description: "Terremotos USGS en tiempo real, alertas GDACS (ONU) y eventos NASA EONET",
  },
  SPACE_WEATHER_GRID: {
    label: "Clima Espacial & Red Eléctrica",
    shortLabel: "CLIMA ESPACIAL",
    color: "purple",
    description: "Tormentas geomagnéticas NOAA SWPC, llamaradas solares y riesgo en redes/GPS",
  },
  FINANCIAL_MACRO: {
    label: "Mercados & Riesgo Macro",
    shortLabel: "MERCADOS & MACRO",
    color: "blue",
    description: "Choques financieros, energía, comercio global y liquidez internacional",
  },
  BIO_HUMANITARIAN: {
    label: "Salud Global & Alertas OMS",
    shortLabel: "SALUD & OMS",
    color: "teal",
    description: "Vigilancia epidemiológica, brotes sanitarios y comunicados de la OMS",
  },
};

const SOURCE_LABELS: Record<string, string> = {
  CISA_KEV_OFFICIAL_FEED: "CISA KEV (Gobierno EE. UU.)",
  THE_HACKER_NEWS_OSINT: "The Hacker News",
  SANS_ISC_STORM_CENTER: "SANS Internet Storm Center",
  CLOUDFLARE_EDGE_STATUS: "Cloudflare Global Status",
  GITHUB_CLOUD_STATUS: "GitHub Cloud Status",
  BBC_WORLD_OSINT: "BBC World News",
  BBC_MUNDO_LATAM_OSINT: "BBC Mundo (Latinoamérica)",
  AL_JAZEERA_GLOBAL_OSINT: "Al Jazeera Internacional",
  UN_SECURITY_DISPATCH: "Naciones Unidas (ONU)",
  CNBC_GLOBAL_MACRO: "CNBC Global Markets",
  WHO_EPIDEMIOLOGICAL_OSINT: "Organización Mundial de la Salud (OMS)",
};

export function formatSourceLabel(rawSource: string): string {
  const s = (rawSource || "OSINT").trim();
  if (SOURCE_LABELS[s]) return SOURCE_LABELS[s];
  if (s.startsWith("RANSOMWARE_LIVE")) {
    const group = s.match(/\[([^\]]+)\]/)?.[1];
    return group ? `Ransomware.live (Grupo ${group})` : "Ransomware.live";
  }
  if (s.startsWith("ABUSE_CH_FEODO")) {
    const mw = s.match(/\[([^\]]+)\]/)?.[1];
    return mw ? `abuse.ch Feodo (${mw})` : "abuse.ch Botnet Radar";
  }
  if (s.startsWith("GDACS_UN_ALERT")) return "Alerta GDACS (ONU / UE)";
  if (s.startsWith("USGS_NEIC_LIVE") || s.startsWith("USGS_LIVE")) return "Servicio Geológico USGS";
  if (s.startsWith("NASA_EONET")) return "NASA Earth Observatory";
  if (s.startsWith("NOAA_SWPC")) return "NOAA Clima Espacial";
  return s;
}

function extractLineField(raw: string, tag: string): string {
  const regex = new RegExp(`\\[${tag}\\]\\s*([^\\n]+)`, "i");
  const match = raw.match(regex);
  return match ? match[1].trim() : "";
}

export function analyzeRecordForDecision(record: TelemetryRecord): DecisionIntelligence {
  const rawHeadline = record.headline || "Incidente Detectado";
  const cleanTitle = rawHeadline.replace(/^\[[^\]]+\]\s*/, "").trim() || rawHeadline;
  const ev = (record.evidence || {}) as any;
  const rawDump = String(ev.raw_evidence || "");
  const frontKey = ev.strategic_front || "CYBER_WARFARE";
  const frontLabel = FRONT_META[frontKey]?.label || "Ciberdefensa & Zero-Days";
  const sourceLabel = formatSourceLabel(record.source);

  const city = record.geo?.city || "";
  const country = record.geo?.country || "Global";
  const locationLabel =
    city && !country.toLowerCase().includes(city.toLowerCase())
      ? `${city}, ${country}`
      : country;

  // CVE & CVSS extraction
  const cveMatch = (rawHeadline + " " + rawDump).match(/\b(CVE-\d{4}-\d{4,7})\b/i);
  const cveId = cveMatch ? cveMatch[1].toUpperCase() : null;

  let cvssScore: number | null =
    typeof ev.cvss_score === "number" ? ev.cvss_score : null;
  if (cvssScore === null) {
    const cvssMatch = (rawHeadline + " " + rawDump).match(
      /cvss(?:\s*v?[34](?:\.\d)?)?(?:\s*score)?\s*[:=]?\s*(10\.0|[0-9]\.\d)/i
    );
    if (cvssMatch) cvssScore = parseFloat(cvssMatch[1]);
  }

  const lowerAll = `${rawHeadline} ${rawDump}`.toLowerCase();
  const isZeroDay =
    Boolean(ev.is_zero_day) ||
    ev.event_type === "ACTIVELY_EXPLOITED_ZERO_DAY_CVE" ||
    lowerAll.includes("zero-day") ||
    lowerAll.includes("0-day") ||
    lowerAll.includes("actively exploited");

  const severityLabel: "CRÍTICO" | "OBSERVACIÓN" | "INFORMATIVO" =
    record.threat_level === "RED" || (cvssScore !== null && cvssScore >= 9.0)
      ? "CRÍTICO"
      : record.threat_level === "YELLOW"
      ? "OBSERVACIÓN"
      : "INFORMATIVO";

  // Extract clean summary from raw_evidence without internal brackets
  let summary = "";
  const techSummary = extractLineField(rawDump, "TECHNICAL-SUMMARY");
  const directiveLine = extractLineField(rawDump, "MANDATORY-DIRECTIVE");
  const intelBrief = extractLineField(rawDump, "INTELLIGENCE-BRIEF");
  const abstractLine = extractLineField(rawDump, "INTELLIGENCE-ABSTRACT");
  const latestTelemetry = extractLineField(rawDump, "LATEST-TELEMETRY");
  const gdacsSummary = extractLineField(rawDump, "SUMMARY");
  const seismicMetrics = extractLineField(rawDump, "SEISMIC-METRICS");

  if (techSummary) {
    summary = techSummary;
  } else if (intelBrief) {
    summary = intelBrief;
  } else if (abstractLine && abstractLine !== cleanTitle) {
    summary = abstractLine;
  } else if (latestTelemetry) {
    summary = latestTelemetry;
  } else if (gdacsSummary) {
    summary = gdacsSummary;
  } else if (seismicMetrics) {
    summary = ` Parámetros sísmicos registrados: ${seismicMetrics.replace(/\|/g, " • ")}.`;
  } else {
    summary = cleanTitle;
  }

  // Classify Category Badge, Short Tag, Affected Asset & Actionable Recommendation
  let categoryBadge = "EVENTO DE INTELIGENCIA";
  let shortTag = "INTEL";
  let recommendation =
    "Monitorear evolución en la fuente oficial y evaluar impacto sobre operaciones regionales.";
  let impactScope = ev.asn_or_sector || sourceLabel;
  let affectedAsset = ev.entities?.[1] || ev.asn_or_sector || country;

  if (cvssScore !== null && cvssScore >= 9.0) {
    categoryBadge = isZeroDay
      ? `ZERO-DAY CRÍTICO • CVSS ${cvssScore.toFixed(1)}`
      : `VULNERABILIDAD CRÍTICA • CVSS ${cvssScore.toFixed(1)}`;
    shortTag = `CVSS ${cvssScore.toFixed(1)}`;
    affectedAsset = cveId ? `${cveId} (${ev.entities?.[1] || "Sistemas expuestos"})` : cleanTitle;
    recommendation = directiveLine
      ? `Directiva oficial: ${directiveLine.replace(/\| Reference:.*$/i, "").trim()}`
      : "Prioridad máxima: Verificar presencia del software afectado en el inventario, aplicar parche de emergencia o aislar el servicio expuesto en firewall/WAF.";
    impactScope = "Explotación remota / Compromiso total de sistema";
  } else if (isZeroDay || record.source === "CISA_KEV_OFFICIAL_FEED") {
    categoryBadge = cveId ? `ZERO-DAY ACTIVO • ${cveId}` : "ZERO-DAY EN EXPLOTACIÓN ACTIVA";
    shortTag = cveId || "0-DAY ACTIVO";
    affectedAsset = `${ev.entities?.[1] || ""} ${ev.entities?.[2] || ""}`.trim() || cveId || "Infraestructura TI";
    recommendation = directiveLine
      ? `Directiva CISA: ${directiveLine.replace(/\| Reference:.*$/i, "").trim()}`
      : "Vulnerabilidad explotada activamente en el mundo real. Parchear activos expuestos de inmediato y auditar logs de acceso.";
    impactScope = "Explotación activa confirmada por CISA";
  } else if (ev.event_type === "ACTIVE_RANSOMWARE_EXTORTION" || record.source.startsWith("RANSOMWARE_LIVE")) {
    const group = record.source.match(/\[([^\]]+)\]/)?.[1] || "RANSOMWARE";
    categoryBadge = `ATAQUE RANSOMWARE • ${group}`;
    shortTag = `RANSOMWARE`;
    affectedAsset = ev.entities?.[1]?.replace("Victim: ", "") || cleanTitle;
    recommendation =
      "Auditar exposición en cadena de suministro con la organización afectada, bloquear indicadores de compromiso (IoCs) del grupo extorsivo y verificar backups inmutables.";
    impactScope = ev.entities?.[2]?.replace("Sector: ", "") || "Infraestructura Corporativa";
  } else if (ev.event_type === "ACTIVE_BOTNET_C2_INFRASTRUCTURE" || record.source.startsWith("ABUSE_CH")) {
    categoryBadge = "SERVIDOR BOTNET C2 ACTIVO";
    shortTag = "BOTNET C2";
    affectedAsset = ev.entities?.[3] || ev.asn_or_sector || "Nodo C2";
    recommendation =
      "Bloquear inmediatamente la IP y puerto del servidor C2 en reglas de salida de Firewall/EDR y buscar conexiones históricas desde la red interna.";
    impactScope = `Tráfico de Comando y Control (${ev.asn_or_sector || "ASN"})`;
  } else if (frontKey === "INFRASTRUCTURE_CLOUD") {
    categoryBadge = "INCIDENTE INFRAESTRUCTURA CLOUD";
    shortTag = "CLOUD STATUS";
    affectedAsset = ev.entities?.[0] || sourceLabel;
    recommendation =
      severityLabel === "CRÍTICO"
        ? "Pausar despliegues en producción dependientes de este proveedor, activar contingencia/failover si aplica y monitorear restablecimiento del servicio."
        : "Degradación parcial o mantenimiento en curso. Monitorear latencia de APIs y pipelines CI/CD.";
    impactScope = `${ev.entities?.[1] || ""} • ${ev.entities?.[2] || "Global CDN/Cloud"}`.trim();
  } else if (frontKey === "GEOPHYSICAL_CLIMATE") {
    const magMatch = cleanTitle.match(/M(\d+\.\d+)/i);
    if (magMatch) {
      categoryBadge = `SISMO EN VIVO • MAGNITUD M${magMatch[1]}`;
      shortTag = `SISMO M${magMatch[1]}`;
    } else if (record.source.includes("GDACS")) {
      categoryBadge = "ALERTA DE DESASTRE NATURAL (ONU)";
      shortTag = "ALERTA ONU";
    } else {
      categoryBadge = "EVENTO AMBIENTAL / SATELITAL (NASA)";
      shortTag = "SATÉLITE NASA";
    }
    affectedAsset = `${city}, ${country}`;
    recommendation =
      severityLabel === "CRÍTICO"
        ? `Evaluar impacto físico sobre centros de datos, telecomunicaciones, rutas logísticas o personal ubicado en un radio de ${ev.impact_radius_km || 400} km.`
        : "Seguimiento preventivo de actividad geofísica/climática regional sin impacto disruptivo mayor reportado.";
    impactScope = `Radio estimado de afectación: ${ev.impact_radius_km || 300} km`;
  } else if (frontKey === "SPACE_WEATHER_GRID") {
    categoryBadge = "CLIMA ESPACIAL & RED ELÉCTRICA";
    shortTag = "CLIMA ESPACIAL";
    affectedAsset = "Comunicaciones HF / GNSS / Red de Alta Latitud";
    recommendation =
      "Monitorear posibles degradaciones en precisión GPS/GNSS, enlaces satelitales y comunicaciones de radio de alta frecuencia.";
    impactScope = "Alcance ionosférico hemisférico";
  } else if (frontKey === "FINANCIAL_MACRO") {
    categoryBadge = "SEÑAL MACROECONÓMICA & MERCADOS";
    shortTag = "MACRO / FINANZAS";
    affectedAsset = country;
    recommendation =
      "Evaluar exposición cambiaria, costos de energía/suministros y riesgo de contraparte en el mercado afectado.";
    impactScope = "Mercados financieros y cadena de suministro";
  } else if (frontKey === "BIO_HUMANITARIAN") {
    categoryBadge = "VIGILANCIA EPIDEMIOLÓGICA (OMS)";
    shortTag = "SALUD / OMS";
    affectedAsset = country;
    recommendation =
      "Revisar protocolos de viaje, alertas sanitarias regionales y continuidad operativa en las zonas mencionadas por la OMS.";
    impactScope = "Salud pública y movilidad internacional";
  } else if (frontKey === "GEOPOLITICAL_CONFLICT") {
    categoryBadge =
      severityLabel === "CRÍTICO"
        ? "ESCALADA GEOPOLÍTICA CRÍTICA"
        : "MONITOREO GEOPOLÍTICO INTERNACIONAL";
    shortTag = "GEOPOLÍTICA";
    affectedAsset = `${city}, ${country}`;
    recommendation =
      severityLabel === "CRÍTICO"
        ? "Evaluar riesgos de sanciones, interrupción de rutas comerciales/energéticas o amenazas cibernéticas asociadas al conflicto en la región."
        : "Seguimiento informativo de evolución diplomática y de seguridad en la región.";
    impactScope = `Región: ${country}`;
  } else {
    categoryBadge =
      severityLabel === "CRÍTICO" ? "AMENAZA DE CIBERSEGURIDAD CRÍTICA" : "BOLETÍN DE CIBERSEGURIDAD";
    shortTag = cveId || "CIBERSEGURIDAD";
    affectedAsset = cveId || ev.asn_or_sector || sourceLabel;
    recommendation =
      "Revisar el boletín técnico oficial, validar si la tecnología mencionada forma parte del stack propio y aplicar las mitigaciones sugeridas.";
  }

  return {
    cleanTitle,
    summary,
    categoryBadge,
    shortTag,
    sourceLabel,
    severityLabel,
    recommendation,
    impactScope,
    cveId,
    cvssScore,
    isZeroDay,
    affectedAsset,
    locationLabel,
    frontLabel,
  };
}
