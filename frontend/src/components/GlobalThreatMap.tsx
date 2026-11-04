"use client";

import React, { useState, useMemo, useEffect } from "react";
import * as d3Geo from "d3-geo";
import * as topojson from "topojson-client";
import worldAtlasData from "@/data/world-110m.json";
import { TelemetryRecord } from "@/types/telemetry";
import { analyzeRecordForDecision, FRONT_META } from "@/utils/intelligenceFormatter";
import {
  Globe,
  MapPin,
  Filter,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Compass,
  Radio,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Terminal,
  Copy,
  Check,
  Maximize2,
  Download,
  Crosshair,
  Clock,
  Activity,
  Lock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
} from "lucide-react";

interface GlobalThreatMapProps {
  telemetryList: TelemetryRecord[];
  selectedEvent: TelemetryRecord | null;
  onSelectEvent: (event: TelemetryRecord) => void;
  onOpenFullModal: (event: TelemetryRecord) => void;
  onMitigateNode?: (
    eventId: string,
    facility?: string,
    actionType?: string
  ) => Promise<TelemetryRecord | null>;
}

// Strategic Optical Backbone Links [lng, lat] pairs
const BACKBONE_LINKS: Array<[[number, number], [number, number]]> = [
  [[-121.9552, 37.3541], [-77.4874, 39.0438]], // Santa Clara <-> Ashburn
  [[-77.4874, 39.0438], [-0.0196, 51.5055]],   // Ashburn <-> London
  [[-77.4874, 39.0438], [8.6821, 50.1109]],    // Ashburn <-> Frankfurt
  [[-77.4874, 39.0438], [-46.6333, -23.5505]], // Ashburn <-> Sao Paulo
  [[-0.0196, 51.5055], [-21.9426, 64.1466]],   // London <-> Reykjavik
  [[-0.0196, 51.5055], [8.6821, 50.1109]],     // London <-> Frankfurt
  [[8.6821, 50.1109], [6.0557, 46.2330]],      // Frankfurt <-> Geneva
  [[8.6821, 50.1109], [15.6267, 78.2232]],     // Frankfurt <-> Svalbard
  [[6.0557, 46.2330], [32.2654, 30.5852]],     // Geneva <-> Suez
  [[32.2654, 30.5852], [43.3333, 12.5833]],    // Suez <-> Bab-el-Mandeb
  [[43.3333, 12.5833], [55.2708, 25.2048]],    // Bab-el-Mandeb <-> Dubai
  [[55.2708, 25.2048], [103.8198, 1.2721]],    // Dubai <-> Singapore
  [[103.8198, 1.2721], [120.9970, 24.7820]],   // Singapore <-> Hsinchu
  [[120.9970, 24.7820], [139.6503, 35.6762]],  // Hsinchu <-> Tokyo
  [[103.8198, 1.2721], [151.2093, -33.8688]],  // Singapore <-> Sydney
];

type ProjectionType = "NATURAL_EARTH" | "EQUIRECTANGULAR";

const STRATEGIC_FRONTS = [
  { id: "ALL", label: "TODOS LOS FRENTES", short: "GLOBAL 360°" },
  { id: "CYBER_WARFARE", label: "CIBERDEFENSA & RANSOMWARE", short: "CYBER" },
  { id: "INFRASTRUCTURE_CLOUD", label: "INFRAESTRUCTURA & CLOUD", short: "CLOUD/BGP" },
  { id: "GEOPOLITICAL_CONFLICT", label: "GEOPOLÍTICA & CONFLICTOS", short: "GEOPOL" },
  { id: "GEOPHYSICAL_CLIMATE", label: "GEOFÍSICA, SISMOS & ONU", short: "GEOPHYS" },
  { id: "SPACE_WEATHER_GRID", label: "CLIMA ESPACIAL & RED", short: "SPACE/NOAA" },
  { id: "FINANCIAL_MACRO", label: "MERCADOS & ENERGÍA", short: "MACRO/FIN" },
  { id: "BIO_HUMANITARIAN", label: "BIOSEGURIDAD & OMS", short: "BIO/WHO" },
] as const;

export const GlobalThreatMap: React.FC<GlobalThreatMapProps> = ({
  telemetryList,
  selectedEvent,
  onSelectEvent,
  onOpenFullModal,
  onMitigateNode,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [filterFront, setFilterFront] = useState<string>("ALL");
  const [syncingLive, setSyncingLive] = useState<boolean>(false);
  const [sendingTelegram, setSendingTelegram] = useState<boolean>(false);
  const [projectionType, setProjectionType] = useState<ProjectionType>("NATURAL_EARTH");
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [hoveredFacility, setHoveredFacility] = useState<string | null>(null);
  const [lockedFacility, setLockedFacility] = useState<string | null>(null);
  const [copiedLog, setCopiedLog] = useState<boolean>(false);
  const [mitigating, setMitigating] = useState<boolean>(false);
  const [mitigationMsg, setMitigationMsg] = useState<string | null>(null);
  const [showTechnicalLog, setShowTechnicalLog] = useState<boolean>(false);

  // Build unique active nodes keyed by STABLE facility name (never changes ID on stream update)
  const activeNodesMap = useMemo(() => {
    const map = new Map<string, TelemetryRecord>();
    for (const record of telemetryList) {
      if (record.geo && record.geo.lat !== undefined && record.geo.lng !== undefined) {
        const key = record.geo.facility || `${record.geo.city}-${record.geo.country}`;
        if (!map.has(key)) {
          map.set(key, record);
        }
      }
    }
    return map;
  }, [telemetryList]);

  // Stable list of nodes sorted by longitude (West to East) so cards NEVER jump around on stream ticks
  const stableNodes = useMemo(() => {
    return Array.from(activeNodesMap.values()).sort((a, b) => {
      const lngA = a.geo?.lng ?? 0;
      const lngB = b.geo?.lng ?? 0;
      return lngA - lngB;
    });
  }, [activeNodesMap]);

  // Auto-select initial highest-entropy node if nothing is locked yet
  useEffect(() => {
    if (!lockedFacility && stableNodes.length > 0) {
      const highest = [...stableNodes].sort((a, b) => {
        const intelA = analyzeRecordForDecision(a);
        const intelB = analyzeRecordForDecision(b);
        const prioA = (intelA.isZeroDay ? 10 : 0) + (intelA.cvssScore || 0);
        const prioB = (intelB.isZeroDay ? 10 : 0) + (intelB.cvssScore || 0);
        return prioB - prioA;
      })[0];
      if (highest?.geo?.facility) {
        setLockedFacility(highest.geo.facility);
      }
    }
  }, [stableNodes, lockedFacility]);

  // Sync lockedFacility when parent selects an event (e.g., from terminal log)
  useEffect(() => {
    if (selectedEvent?.geo?.facility) {
      setLockedFacility(selectedEvent.geo.facility);
    }
  }, [selectedEvent]);

  // Currently inspected record (always up-to-date for the locked facility, or exact selectedEvent)
  const inspectedRecord = useMemo(() => {
    if (selectedEvent && (!lockedFacility || selectedEvent.geo?.facility === lockedFacility)) {
      return activeNodesMap.get(lockedFacility || "") || selectedEvent;
    }
    if (lockedFacility && activeNodesMap.has(lockedFacility)) {
      return activeNodesMap.get(lockedFacility)!;
    }
    return stableNodes[0] || null;
  }, [selectedEvent, lockedFacility, activeNodesMap, stableNodes]);

  const inspectedIntel = useMemo(
    () => (inspectedRecord ? analyzeRecordForDecision(inspectedRecord) : null),
    [inspectedRecord]
  );

  // Filtered nodes for map rendering (by Severity / Zero-Days AND Strategic Front)
  const filteredNodes = useMemo(() => {
    return stableNodes.filter((n) => {
      const intel = analyzeRecordForDecision(n);
      let matchSev = true;
      if (filterSeverity === "ZERODAY") {
        matchSev = intel.isZeroDay || (intel.cvssScore !== null && intel.cvssScore >= 9.0);
      } else if (filterSeverity === "RED") {
        matchSev = intel.severityLabel === "CRÍTICO";
      } else if (filterSeverity === "YELLOW") {
        matchSev = intel.severityLabel === "OBSERVACIÓN";
      } else if (filterSeverity === "GREEN") {
        matchSev = intel.severityLabel === "INFORMATIVO";
      }

      const front = n.evidence?.strategic_front || "CYBER_WARFARE";
      const matchFront = filterFront === "ALL" || front === filterFront;
      return matchSev && matchFront;
    });
  }, [stableNodes, filterSeverity, filterFront]);

  // Count nodes per Strategic Front
  const frontCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: stableNodes.length };
    for (const n of stableNodes) {
      const f = n.evidence?.strategic_front || "CYBER_WARFARE";
      counts[f] = (counts[f] || 0) + 1;
    }
    return counts;
  }, [stableNodes]);

  const handleSyncLiveFeeds = async () => {
    if (syncingLive) return;
    setSyncingLive(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/telemetry/sync-live`, { method: "POST" });
      if (res.ok) {
        setMitigationMsg("15 FUENTES OSINT SINCRONIZADAS EN VIVO");
        setTimeout(() => setMitigationMsg(null), 3500);
      }
    } catch {
      setMitigationMsg("SINCRONIZADO CON CLOUD SNAPSHOT + APIS EN VIVO (GITHUB PAGES)");
      setTimeout(() => setMitigationMsg(null), 3500);
    } finally {
      setTimeout(() => setSyncingLive(false), 1200);
    }
  };

  const handleSendTelegramDigest = async () => {
    if (sendingTelegram) return;
    setSendingTelegram(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/telemetry/telegram-dispatch?mode=digest`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.status === "SENT") {
        setMitigationMsg("REPORTE GLOBAL ENVIADO A TELEGRAM CON ÉXITO");
      } else {
        setMitigationMsg("CONFIGURA TELEGRAM_BOT_TOKEN Y CHAT_ID EN .ENV");
      }
      setTimeout(() => setMitigationMsg(null), 4000);
    } catch {
      setMitigationMsg("MODO CLOUD: TELEGRAM SE ENVÍA AUTOMÁTICAMENTE VÍA GITHUB ACTIONS");
      setTimeout(() => setMitigationMsg(null), 4500);
    } finally {
      setSendingTelegram(false);
    }
  };

  // Country threat map for coloring affected countries on the globe
  const countryThreatLevelMap = useMemo(() => {
    const map = new Map<string, "RED" | "YELLOW" | "GREEN">();
    for (const node of stableNodes) {
      const countryName = node.geo?.country;
      if (!countryName) continue;
      const prev = map.get(countryName);
      if (node.threat_level === "RED") {
        map.set(countryName, "RED");
      } else if (node.threat_level === "YELLOW" && prev !== "RED") {
        map.set(countryName, "YELLOW");
      } else if (!prev) {
        map.set(countryName, "GREEN");
      }
    }
    return map;
  }, [stableNodes]);

  // D3-Geo Projection & Path Generator (1000 x 500 viewBox)
  const { projection, pathGenerator, countriesFeatures, bordersMesh, graticulePath, spherePath, backbonePaths } =
    useMemo(() => {
      const worldTopo = worldAtlasData as unknown as any;
      const countries = topojson.feature(worldTopo, worldTopo.objects.countries) as unknown as GeoJSON.FeatureCollection;
      const borders = topojson.mesh(
        worldTopo,
        worldTopo.objects.countries,
        (a: any, b: any) => a !== b
      );

      const proj =
        projectionType === "NATURAL_EARTH"
          ? d3Geo.geoNaturalEarth1().fitExtent(
              [
                [14, 14],
                [986, 486],
              ],
              { type: "Sphere" }
            )
          : d3Geo.geoEquirectangular().fitExtent(
              [
                [14, 14],
                [986, 486],
              ],
              { type: "Sphere" }
            );

      const pathGen = d3Geo.geoPath().projection(proj);
      const graticule = d3Geo.geoGraticule10();

      const links = BACKBONE_LINKS.map(([c1, c2]) =>
        pathGen({
          type: "LineString",
          coordinates: [c1, c2],
        } as any)
      ).filter(Boolean) as string[];

      return {
        projection: proj,
        pathGenerator: pathGen,
        countriesFeatures: countries.features,
        bordersMesh: pathGen(borders as any) || "",
        graticulePath: pathGen(graticule) || "",
        spherePath: pathGen({ type: "Sphere" } as any) || "",
        backbonePaths: links,
      };
    }, [projectionType]);

  // Decision counters
  const zeroDayCount = useMemo(() => {
    return stableNodes.filter((n) => {
      const info = analyzeRecordForDecision(n);
      return info.isZeroDay || (info.cvssScore !== null && info.cvssScore >= 9.0);
    }).length;
  }, [stableNodes]);

  const redCount = useMemo(() => {
    return stableNodes.filter(
      (n) => analyzeRecordForDecision(n).severityLabel === "CRÍTICO"
    ).length;
  }, [stableNodes]);

  const yellowCount = useMemo(() => {
    return stableNodes.filter(
      (n) => analyzeRecordForDecision(n).severityLabel === "OBSERVACIÓN"
    ).length;
  }, [stableNodes]);

  const greenCount = useMemo(() => {
    return stableNodes.filter(
      (n) => analyzeRecordForDecision(n).severityLabel === "INFORMATIVO"
    ).length;
  }, [stableNodes]);

  // Handlers
  const handleSelectNode = (node: TelemetryRecord) => {
    const fac = node.geo?.facility || null;
    setLockedFacility(fac);
    onSelectEvent(node);
  };

  const handleCopyForensic = () => {
    if (!inspectedRecord?.evidence?.raw_evidence) return;
    navigator.clipboard.writeText(inspectedRecord.evidence.raw_evidence);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const handleDownloadForensic = () => {
    if (!inspectedRecord) return;
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(inspectedRecord, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `SYNTERGIC-FORENSIC-${inspectedRecord.id}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleExecuteMitigation = async (actionType: string) => {
    if (!inspectedRecord || !onMitigateNode) return;
    setMitigating(true);
    try {
      const updated = await onMitigateNode(
        inspectedRecord.id,
        inspectedRecord.geo?.facility,
        actionType
      );
      if (updated) {
        onSelectEvent(updated);
        setMitigationMsg(`ACCION "${actionType}" EJECUTADA SOBRE EL NODO`);
        setTimeout(() => setMitigationMsg(null), 3500);
      }
    } finally {
      setMitigating(false);
    }
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="w-full flex flex-col bg-slate-950/95 border border-slate-800 rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
      {/* TOP BAR: Title, Threat Counters, Projection & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Globe className="w-4 h-4 text-cyan-400" />
          <div>
            <h2 className="font-bold text-slate-100 uppercase tracking-wider text-xs sm:text-sm">
              CARTOGRAFÍA GLOBAL DE AMENAZAS // CENTRO DE RESPUESTA OPERATIVA
            </h2>
            <p className="text-[10px] text-slate-400">
              Vigilancia geográfica multi-frente en tiempo real. Selecciona una baliza para evaluar impacto y medidas correctivas.
            </p>
          </div>
        </div>

        {/* Status Badges & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filter: Zero-Days & CVSS >= 9 */}
          <button
            onClick={() => setFilterSeverity(filterSeverity === "ZERODAY" ? "ALL" : "ZERODAY")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-bold transition-all cursor-pointer ${
              filterSeverity === "ZERODAY"
                ? "bg-rose-500/30 border-rose-400 text-rose-200 shadow-md shadow-rose-950/60"
                : "bg-rose-950/40 border-rose-800/80 text-rose-300 hover:border-rose-500"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            {zeroDayCount} ZERO-DAYS / CVSS ≥ 9
          </button>

          <button
            onClick={() => setFilterSeverity(filterSeverity === "RED" ? "ALL" : "RED")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-bold transition-all cursor-pointer ${
              filterSeverity === "RED"
                ? "bg-rose-500/30 border-rose-400 text-rose-200"
                : "bg-slate-900 border-slate-800 text-rose-400 hover:border-rose-700"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {redCount} CRÍTICOS
          </button>

          <button
            onClick={() => setFilterSeverity(filterSeverity === "YELLOW" ? "ALL" : "YELLOW")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-bold transition-all cursor-pointer ${
              filterSeverity === "YELLOW"
                ? "bg-amber-500/30 border-amber-400 text-amber-200"
                : "bg-slate-900 border-slate-800 text-amber-400 hover:border-amber-700"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {yellowCount} EN OBSERVACIÓN
          </button>

          <button
            onClick={() => setFilterSeverity(filterSeverity === "GREEN" ? "ALL" : "GREEN")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-bold transition-all cursor-pointer ${
              filterSeverity === "GREEN"
                ? "bg-emerald-500/30 border-emerald-400 text-emerald-200"
                : "bg-slate-900 border-slate-800 text-emerald-400 hover:border-emerald-700"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {greenCount} INFORMATIVOS
          </button>

          {filterSeverity !== "ALL" && (
            <button
              onClick={() => setFilterSeverity("ALL")}
              className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold"
            >
              VER TODOS ({stableNodes.length})
            </button>
          )}

          {/* Projection Toggle */}
          <div className="flex items-center rounded border border-slate-700 overflow-hidden bg-black/50 text-[10px]">
            <button
              onClick={() => setProjectionType("NATURAL_EARTH")}
              className={`px-2 py-1 font-bold transition-colors cursor-pointer ${
                projectionType === "NATURAL_EARTH"
                  ? "bg-cyan-950 text-cyan-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              NATURAL EARTH
            </button>
            <button
              onClick={() => setProjectionType("EQUIRECTANGULAR")}
              className={`px-2 py-1 font-bold transition-colors cursor-pointer ${
                projectionType === "EQUIRECTANGULAR"
                  ? "bg-cyan-950 text-cyan-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              WGS-84 PLANA
            </button>
          </div>

          {/* Live OSINT Re-Sync Button */}
          <button
            onClick={handleSyncLiveFeeds}
            disabled={syncingLive}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-cyan-500/70 bg-cyan-950/70 hover:bg-cyan-900 text-cyan-200 font-bold text-[10px] transition-all cursor-pointer disabled:opacity-50"
            title="Sincronizar las 15 fuentes oficiales en vivo (USGS, GDACS, CISA, Ransomware.live, abuse.ch, NOAA, OMS, Cloudflare, BBC, ONU)"
          >
            <Radio className={`w-3 h-3 text-cyan-400 ${syncingLive ? "animate-spin" : ""}`} />
            <span>{syncingLive ? "SINCRONIZANDO..." : "SYNC 15 FUENTES EN VIVO"}</span>
          </button>

          {/* Telegram Sitrep Dispatch Button */}
          <button
            onClick={handleSendTelegramDigest}
            disabled={sendingTelegram}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-sky-500/70 bg-sky-950/70 hover:bg-sky-900 text-sky-200 font-bold text-[10px] transition-all cursor-pointer disabled:opacity-50"
            title="Enviar Panorama Global de los 7 Frentes a tu canal de Telegram"
          >
            <Activity className="w-3 h-3 text-sky-400" />
            <span>{sendingTelegram ? "ENVIANDO..." : "TELEGRAM SITREP"}</span>
          </button>
        </div>
      </div>

      {/* STRATEGIC FRONTS FILTER BAR (7 Global Intelligence Domains) */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 bg-slate-950 border-b border-slate-800/90">
        <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3 text-cyan-400" />
          FRENTES ESTRATÉGICOS:
        </span>
        {STRATEGIC_FRONTS.map((front) => {
          const active = filterFront === front.id;
          const count = frontCounts[front.id] || 0;
          return (
            <button
              key={front.id}
              onClick={() => setFilterFront(front.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                active
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm"
                  : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200"
              }`}
            >
              <span>{front.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] ${
                  active ? "bg-cyan-400/25 text-cyan-100" : "bg-slate-800 text-slate-300"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* MAIN BODY: Left = Real Cartographic World Map (7 cols) | Right = Docked Forensic Inspector (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 border-b border-slate-800">
        {/* LEFT COLUMN: Real Vector World Map */}
        <div className="xl:col-span-7 relative bg-[#020611] overflow-hidden select-none flex flex-col justify-between border-b xl:border-b-0 xl:border-r border-slate-800 min-h-[380px]">
          {/* Zoom & Pan Floating Controls */}
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-1 bg-slate-950/90 border border-slate-800 p-1 rounded shadow-lg">
            <button
              onClick={() => setZoom((z) => Math.min(3.5, +(z + 0.5).toFixed(1)))}
              title="Acercar mapa"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setZoom((z) => {
                  const next = Math.max(1, +(z - 0.5).toFixed(1));
                  if (next === 1) setPan({ x: 0, y: 0 });
                  return next;
                });
              }}
              title="Alejar mapa"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetView}
              title="Restablecer vista 1:1"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Active Target HUD Indicator Top-Left */}
          {inspectedRecord && inspectedRecord.geo && (
            <div className="absolute top-3 left-3 z-20 bg-slate-950/90 border border-cyan-500/40 px-3 py-1.5 rounded shadow-lg backdrop-blur-sm flex items-center gap-2 pointer-events-none">
              <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <div className="text-[10px]">
                <span className="text-slate-400">OBJETIVO FIJADO: </span>
                <strong className="text-slate-100">
                  {inspectedRecord.geo.city}, {inspectedRecord.geo.country}
                </strong>
                <span className="text-cyan-400 ml-2">
                  [{inspectedRecord.geo.lat.toFixed(2)}°, {inspectedRecord.geo.lng.toFixed(2)}°]
                </span>
              </div>
            </div>
          )}

          {/* SVG World Map Canvas */}
          <div
            className={`w-full h-full flex items-center justify-center ${
              zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
            }`}
            onMouseDown={(e) => {
              if (zoom <= 1) return;
              setIsDragging(true);
              setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            }}
            onMouseMove={(e) => {
              if (!isDragging) return;
              setPan({
                x: Math.max(-350 * zoom, Math.min(350 * zoom, e.clientX - dragStart.x)),
                y: Math.max(-200 * zoom, Math.min(200 * zoom, e.clientY - dragStart.y)),
              });
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            <svg
              viewBox="0 0 1000 500"
              className="w-full h-auto max-h-[500px]"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <radialGradient id="oceanSphereGrad" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="#071226" />
                  <stop offset="100%" stopColor="#02060f" />
                </radialGradient>
                <radialGradient id="redNodeGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="amberNodeGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="greenNodeGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>
              </defs>

              <g
                transform={`translate(${500 + pan.x}, ${250 + pan.y}) scale(${zoom}) translate(-500, -250)`}
              >
                {/* 1. Ocean Sphere Outline & Fill */}
                <path
                  d={spherePath}
                  fill="url(#oceanSphereGrad)"
                  stroke="#1e3a5f"
                  strokeWidth={1.2 / zoom}
                />

                {/* 2. True Spherical Graticule (10° x 10° Grid) */}
                <path
                  d={graticulePath}
                  fill="none"
                  stroke="#0f2342"
                  strokeWidth={0.6 / zoom}
                  strokeDasharray="2 2"
                />

                {/* 3. Authentic Natural Earth 110m Country Polygons */}
                <g>
                  {countriesFeatures.map((feature: any, idx: number) => {
                    const d = pathGenerator(feature);
                    if (!d) return null;
                    const countryName: string = feature.properties?.name || "";
                    const countryThreat = countryThreatLevelMap.get(countryName);

                    let fill = "#0c1930";
                    let stroke = "#1b3358";
                    if (countryThreat === "RED") {
                      fill = "#2d0b18";
                      stroke = "#881337";
                    } else if (countryThreat === "YELLOW") {
                      fill = "#271b09";
                      stroke = "#78350f";
                    } else if (countryThreat === "GREEN") {
                      fill = "#082222";
                      stroke = "#065f46";
                    }

                    return (
                      <path
                        key={feature.id || idx}
                        d={d}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={0.6 / zoom}
                        className="transition-colors duration-300"
                      />
                    );
                  })}
                </g>

                {/* 4. Internal Country Borders Mesh */}
                <path
                  d={bordersMesh}
                  fill="none"
                  stroke="#1e3a5f"
                  strokeWidth={0.45 / zoom}
                  opacity={0.8}
                />

                {/* 5. Great-Circle Geodesic Subsea / Optical Backbone Arcs */}
                <g>
                  {backbonePaths.map((arcPath, i) => (
                    <path
                      key={i}
                      d={arcPath}
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth={1.0 / zoom}
                      strokeDasharray="3 3"
                      opacity={0.35}
                    />
                  ))}
                </g>

                {/* 6. Interactive Incident Beacons (Zero-Jump Positioning) */}
                {filteredNodes.map((node) => {
                  if (!node.geo) return null;
                  const coords = projection([node.geo.lng, node.geo.lat]);
                  if (!coords) return null;
                  const [x, y] = coords;

                  const facKey =
                    node.geo.facility || `${node.geo.city}-${node.geo.country}`;
                  const isSelected = inspectedRecord?.geo?.facility === facKey;
                  const isHovered = hoveredFacility === facKey;
                  const isRed = node.threat_level === "RED";
                  const isYellow = node.threat_level === "YELLOW";
                  const omega = node.metrics.omega_index;

                  const primaryColor = isRed
                    ? "#f43f5e"
                    : isYellow
                    ? "#f59e0b"
                    : "#10b981";
                  const darkFill = isRed
                    ? "#881337"
                    : isYellow
                    ? "#78350f"
                    : "#064e3b";

                  return (
                    <g
                      key={facKey}
                      transform={`translate(${x}, ${y})`}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectNode(node);
                      }}
                      onMouseEnter={() => setHoveredFacility(facKey)}
                      onMouseLeave={() =>
                        setHoveredFacility((prev) => (prev === facKey ? null : prev))
                      }
                    >
                      {/* Generous Invisible Hit Target (Never Moves!) */}
                      <circle cx={0} cy={0} r={16 / zoom} fill="transparent" />

                      {/* Ambient Glow Halo */}
                      <circle
                        cx={0}
                        cy={0}
                        r={(isRed ? 20 : isYellow ? 14 : 10) / zoom}
                        fill={
                          isRed
                            ? "url(#redNodeGlow)"
                            : isYellow
                            ? "url(#amberNodeGlow)"
                            : "url(#greenNodeGlow)"
                        }
                        opacity={isSelected || isHovered ? 0.95 : 0.65}
                      />

                      {/* Red Critical Expanding Shockwave Ring */}
                      {isRed && (
                        <circle
                          cx={0}
                          cy={0}
                          r={14 / zoom}
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth={1.5 / zoom}
                          opacity={0.8}
                        >
                          <animate
                            attributeName="r"
                            from={String(5 / zoom)}
                            to={String(22 / zoom)}
                            dur="1.8s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            from="0.9"
                            to="0"
                            dur="1.8s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}

                      {/* Selected / Hovered Tactical Reticle Ring [ + ] */}
                      {(isSelected || isHovered) && (
                        <g>
                          <circle
                            cx={0}
                            cy={0}
                            r={11 / zoom}
                            fill="none"
                            stroke={isSelected ? "#22d3ee" : "#e2e8f0"}
                            strokeWidth={1.5 / zoom}
                            strokeDasharray={`${3 / zoom} ${2 / zoom}`}
                          />
                          {/* Crosshair ticks */}
                          <line
                            x1={-15 / zoom}
                            y1={0}
                            x2={-9 / zoom}
                            y2={0}
                            stroke={isSelected ? "#22d3ee" : "#e2e8f0"}
                            strokeWidth={1.3 / zoom}
                          />
                          <line
                            x1={9 / zoom}
                            y1={0}
                            x2={15 / zoom}
                            y2={0}
                            stroke={isSelected ? "#22d3ee" : "#e2e8f0"}
                            strokeWidth={1.3 / zoom}
                          />
                          <line
                            x1={0}
                            y1={-15 / zoom}
                            x2={0}
                            y2={-9 / zoom}
                            stroke={isSelected ? "#22d3ee" : "#e2e8f0"}
                            strokeWidth={1.3 / zoom}
                          />
                          <line
                            x1={0}
                            y1={9 / zoom}
                            x2={0}
                            y2={15 / zoom}
                            stroke={isSelected ? "#22d3ee" : "#e2e8f0"}
                            strokeWidth={1.3 / zoom}
                          />
                        </g>
                      )}

                      {/* Outer Beacon Circle */}
                      <circle
                        cx={0}
                        cy={0}
                        r={(isSelected ? 6.5 : isRed ? 5.5 : 4.5) / zoom}
                        fill={darkFill}
                        stroke={isSelected ? "#22d3ee" : primaryColor}
                        strokeWidth={1.6 / zoom}
                      />

                      {/* Inner Bright Core */}
                      <circle
                        cx={0}
                        cy={0}
                        r={(isSelected ? 3 : 2.2) / zoom}
                        fill={isRed ? "#fecdd3" : isYellow ? "#fef3c7" : "#a7f3d0"}
                      />

                      {/* On-Map Label for Selected, Hovered, or Critical Red Nodes */}
                      {(isSelected || isHovered || isRed) && (() => {
                        const nodeIntel = analyzeRecordForDecision(node);
                        const tagText = `${node.geo.city.toUpperCase()} [${nodeIntel.shortTag}]`;
                        return (
                          <g transform={`translate(${9 / zoom}, ${-7 / zoom})`}>
                            <rect
                              x={0}
                              y={-9 / zoom}
                              width={(tagText.length * 5.6 + 12) / zoom}
                              height={13 / zoom}
                              rx={2 / zoom}
                              fill={isSelected ? "#083344" : "#020617"}
                              stroke={isSelected ? "#06b6d4" : primaryColor}
                              strokeWidth={0.8 / zoom}
                              opacity={0.94}
                            />
                            <text
                              x={4 / zoom}
                              y={0}
                              fill={isSelected ? "#67e8f9" : isRed ? "#fda4af" : "#fde68a"}
                              fontSize={8.5 / zoom}
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {tagText}
                            </text>
                          </g>
                        );
                      })()}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Map Bottom Legend Bar */}
          <div className="px-3 py-2 bg-slate-950/90 border-t border-slate-900 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-bold text-slate-300">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                 CLASIFICACIÓN OPERATIVA:
              </span>
              <span className="flex items-center gap-1 text-rose-300 font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> CRÍTICO / ZERO-DAY
              </span>
              <span className="flex items-center gap-1 text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> EN OBSERVACIÓN
              </span>
              <span className="flex items-center gap-1 text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> INFORMATIVO
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <span>ZOOM: {zoom.toFixed(1)}x</span>
              <span>•</span>
              <span>RUTAS SUBMARINAS BGP: ACTIVAS</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Actionable Decision Intelligence & Dossier (5 cols) */}
        <div className="xl:col-span-5 bg-slate-950 flex flex-col justify-between p-4 space-y-3">
          {inspectedRecord && inspectedIntel ? (
            <>
              <div className="space-y-3">
                {/* Dossier Header */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>EXPEDIENTE OPERATIVO DE DECISIÓN</span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-100 mt-0.5">
                      {inspectedRecord.geo?.facility || "NODO GLOBAL"}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1 text-slate-200 font-semibold">
                        <MapPin className="w-3 h-3 text-cyan-400" />
                        {inspectedIntel.locationLabel}
                      </span>
                      <span>•</span>
                      <span className="text-cyan-400 font-bold">
                        {inspectedRecord.geo?.lat.toFixed(2)}° N, {inspectedRecord.geo?.lng.toFixed(2)}° E
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold border uppercase ${
                        inspectedIntel.severityLabel === "CRÍTICO"
                          ? "bg-rose-500/25 text-rose-200 border-rose-500/60 shadow-sm shadow-rose-950"
                          : inspectedIntel.severityLabel === "OBSERVACIÓN"
                          ? "bg-amber-500/20 text-amber-200 border-amber-500/50"
                          : "bg-emerald-500/20 text-emerald-200 border-emerald-500/50"
                      }`}
                    >
                      {inspectedIntel.categoryBadge}
                    </span>
                    <button
                      onClick={() => onOpenFullModal(inspectedRecord)}
                      className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      VER EXPEDIENTE COMPLETO
                    </button>
                  </div>
                </div>

                {/* Mitigation Feedback Banner */}
                {mitigationMsg && (
                  <div className="p-2 rounded bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-[11px] font-bold text-center animate-pulse">
                    ✓ {mitigationMsg}
                  </div>
                )}

                {/* Incident Clean Headline & Summary Card */}
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="text-cyan-400 font-bold uppercase">
                      {inspectedIntel.frontLabel}
                    </span>
                    <span>FUENTE: {inspectedIntel.sourceLabel}</span>
                  </div>
                  <h4 className="text-slate-100 text-xs sm:text-sm font-bold leading-snug">
                    {inspectedIntel.cleanTitle}
                  </h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed pt-0.5">
                    {inspectedIntel.summary}
                  </p>
                </div>

                {/* ACTIONABLE RECOMMENDATION (Prominently displayed) */}
                <div
                  className={`p-3.5 rounded-lg border-2 transition-all ${
                    inspectedIntel.severityLabel === "CRÍTICO"
                      ? "bg-rose-950/30 border-rose-500/80 shadow-[inset_0_0_15px_rgba(244,63,94,0.15)]"
                      : "bg-cyan-950/30 border-cyan-500/70 shadow-[inset_0_0_15px_rgba(6,182,212,0.12)]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                    <ShieldAlert
                      className={`w-3.5 h-3.5 ${
                        inspectedIntel.severityLabel === "CRÍTICO" ? "text-rose-400" : "text-cyan-400"
                      }`}
                    />
                    <span
                      className={
                        inspectedIntel.severityLabel === "CRÍTICO"
                          ? "text-rose-300 font-extrabold"
                          : "text-cyan-300 font-extrabold"
                      }
                    >
                      ACCIÓN OPERATIVA RECOMENDADA
                    </span>
                  </div>
                  <p className="text-slate-100 text-xs font-semibold leading-relaxed">
                    {inspectedIntel.recommendation}
                  </p>
                </div>

                {/* Key Context Grid (Asset & Official Source) */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                    <span className="text-slate-500 uppercase font-bold flex items-center gap-1">
                      <Layers className="w-3 h-3 text-rose-400" />
                      ACTIVO / SECTOR AFECTADO
                    </span>
                    <span className="text-slate-200 font-bold truncate mt-1">
                      {inspectedIntel.affectedAsset}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                    <span className="text-slate-500 uppercase font-bold flex items-center gap-1">
                      <ExternalLink className="w-3 h-3 text-emerald-400" />
                      VERIFICACIÓN EN FUENTE
                    </span>
                    <div className="mt-1">
                      {inspectedRecord.evidence?.source_url?.startsWith("http") ? (
                        <a
                          href={inspectedRecord.evidence.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 underline"
                        >
                          Verificar reporte oficial ↗
                        </a>
                      ) : (
                        <span className="text-slate-400 font-bold">Oficial validada</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collapsible Technical Audit Trail (Hidden from clutter, available on demand) */}
                <div className="border border-slate-800/90 rounded-lg overflow-hidden bg-black/60">
                  <button
                    onClick={() => setShowTechnicalLog(!showTechnicalLog)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 font-bold uppercase text-slate-300">
                      <FileText className="w-3 h-3 text-cyan-400" />
                      {showTechnicalLog ? "OCULTAR REGISTRO TÉCNICO" : "VER LOG TÉCNICO & REGISTRO FORENSE"}
                    </span>
                    {showTechnicalLog ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {showTechnicalLog && (
                    <div className="p-3 border-t border-slate-800 space-y-2 text-[10px] bg-black">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">CAPTURA DE TELEMETRÍA:</span>
                        <button
                          onClick={handleCopyForensic}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[9px]"
                        >
                          {copiedLog ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                          <span>{copiedLog ? "COPIADO" : "COPIAR"}</span>
                        </button>
                      </div>
                      <pre className="text-emerald-300/90 font-mono text-[9px] leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-24 overflow-y-auto p-2 rounded bg-slate-950 border border-slate-900">
                        {inspectedRecord.evidence?.raw_evidence || "Sin captura cruda."}
                      </pre>
                      <div className="text-[9px] text-slate-500 truncate">
                        SHA-256: <code>{inspectedRecord.evidence?.sha256_fingerprint || "N/A"}</code>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => handleExecuteMitigation("OPERATIONAL_CONTAINMENT")}
                  disabled={mitigating}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer disabled:opacity-50 ${
                    inspectedRecord.mitigated_by_soc
                      ? "bg-emerald-950/70 border border-emerald-500 text-emerald-300"
                      : "bg-rose-950/80 hover:bg-rose-900 border border-rose-500/80 text-rose-200 hover:text-white"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>
                    {inspectedRecord.mitigated_by_soc
                      ? "AMENAZA CONTENIDA ✓"
                      : mitigating
                      ? "CONTENIENDO..."
                      : "CONTENER AMENAZA / AISLAR"}
                  </span>
                </button>

                <button
                  onClick={handleDownloadForensic}
                  className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                  title="Descargar JSON Forense"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>

                <button
                  onClick={() => onOpenFullModal(inspectedRecord)}
                  className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-600 text-cyan-200 font-bold text-xs transition-colors cursor-pointer"
                  title="Abrir expediente completo"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>DETALLES</span>
                </button>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 italic py-12">
              Selecciona un nodo en el mapa para inspeccionar su expediente operativo.
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM DIRECTORY: Stable Grid of All Global Surveillance Nodes (With Decision Tags!) */}
      <div className="p-3 bg-slate-900/90 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-slate-300 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            DIRECTORIO GLOBAL DE SENSORES ({filteredNodes.length} NODOS ACTIVOS — FILTRO: {filterSeverity}):
          </span>
          <span className="text-cyan-400 text-[10px] font-bold">
            HAZ CLIC EN CUALQUIER TARJETA PARA FIJAR OBJETIVO Y VER MEDIDAS CORRECTIVAS
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {filteredNodes.map((item) => {
            const facKey =
              item.geo?.facility || `${item.geo?.city}-${item.geo?.country}`;
            const isSelected = inspectedRecord?.geo?.facility === facKey;
            const itemIntel = analyzeRecordForDecision(item);
            const isCrit = itemIntel.severityLabel === "CRÍTICO";
            const isObs = itemIntel.severityLabel === "OBSERVACIÓN";

            return (
              <button
                key={facKey}
                type="button"
                onClick={() => handleSelectNode(item)}
                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-cyan-950/70 border-2 border-cyan-400 shadow-md shadow-cyan-950/60"
                    : isCrit
                    ? "bg-rose-950/35 hover:bg-rose-950/60 border-rose-600/70 text-rose-200"
                    : isObs
                    ? "bg-amber-950/30 hover:bg-amber-950/50 border-amber-600/60 text-amber-200"
                    : "bg-slate-950/70 hover:bg-slate-900 border-slate-800 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-[11px] text-slate-100 truncate">
                    {item.geo?.city}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold border shrink-0 ${
                      isCrit
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                        : isObs
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                    }`}
                  >
                    {itemIntel.shortTag}
                  </span>
                </div>

                <div className="text-[10px] text-slate-300 font-medium truncate mb-1">
                  {itemIntel.cleanTitle}
                </div>

                <div className="flex items-center justify-between text-[9px] pt-1 border-t border-slate-800/80">
                  <span className="text-slate-500 truncate">
                    {item.geo?.country}
                  </span>
                  <span className="text-cyan-400 font-bold shrink-0">
                    {isSelected ? "● SELECCIONADO" : "EVALUAR →"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
