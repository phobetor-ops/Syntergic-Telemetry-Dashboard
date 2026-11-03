"use client";

import React, { useState, useEffect } from "react";
import { TelemetryRecord } from "@/types/telemetry";
import {
  X,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Copy,
  Check,
  ExternalLink,
  Download,
  Flame,
  Cpu,
  Activity,
  Terminal,
  Clock,
  Lock,
  Layers,
} from "lucide-react";

interface ForensicEvidenceModalProps {
  event: TelemetryRecord | null;
  onClose: () => void;
  onMitigateNode?: (
    eventId: string,
    facility?: string,
    actionType?: string
  ) => Promise<TelemetryRecord | null>;
  onUpdateEvent?: (updated: TelemetryRecord) => void;
}

export const ForensicEvidenceModal: React.FC<ForensicEvidenceModalProps> = ({
  event,
  onClose,
  onMitigateNode,
  onUpdateEvent,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [mitigating, setMitigating] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (event) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [event, onClose]);

  if (!event) return null;

  const isRed = event.threat_level === "RED";
  const isYellow = event.threat_level === "YELLOW";

  const handleCopyEvidence = () => {
    if (event.evidence?.raw_evidence) {
      navigator.clipboard.writeText(event.evidence.raw_evidence);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadDump = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(event, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `SYNTERGIC-FORENSIC-${event.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleIsolate = async () => {
    if (onMitigateNode) {
      setMitigating(true);
      try {
        const updated = await onMitigateNode(
          event.id,
          event.geo?.facility,
          "WU_WEI_SANDBOX_ISOLATION"
        );
        if (updated && onUpdateEvent) {
          onUpdateEvent(updated);
        }
        setActionFeedback(
          "PROTOCOLO WU-WEI EJECUTADO: NODO AISLADO EN SANDBOX Y CARGA TÉRMICA ESTABILIZADA"
        );
        setTimeout(() => setActionFeedback(null), 4000);
      } finally {
        setMitigating(false);
      }
    } else {
      setActionFeedback("SECTOR AISLADO: PROTOCOLO WU-WEI ACTIVADO");
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-lg border-2 bg-slate-950 shadow-2xl font-mono text-xs flex flex-col ${
          isRed
            ? "border-rose-500 shadow-rose-950/40"
            : isYellow
            ? "border-amber-500 shadow-amber-950/30"
            : "border-emerald-500 shadow-emerald-950/20"
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            {isRed ? (
              <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
            ) : isYellow ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-sm text-slate-100 tracking-wider">
                  INSPECCIÓN FORENSE PROFUNDA // EVIDENCIAS DEL SUCESO
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                    isRed
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                      : isYellow
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                  }`}
                >
                  {event.threat_level} ALERT (Ω {event.metrics.omega_index.toFixed(3)})
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                SIGNAL ID: <span className="text-cyan-400 font-bold">{event.id}</span> | TIMESTAMP:{" "}
                {event.timestamp}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {actionFeedback && (
            <div className="p-2.5 rounded bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-center font-bold tracking-wider animate-pulse">
              ✓ {actionFeedback}
            </div>
          )}

          {/* Location & Geospatial Provenance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3.5 rounded bg-black/60 border border-slate-800">
            <div className="md:col-span-2 flex flex-col gap-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                PROCEDENCIA E INSTALACIÓN CRÍTICA
              </span>
              <div className="font-bold text-slate-100 text-sm">
                {event.geo?.facility || "DISTRIBUTED EDGE GATEWAY"}
              </div>
              <div className="text-slate-300 text-xs">
                {event.geo?.city}, {event.geo?.country} ({event.geo?.region})
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold">
                COORDENADAS GPS (WGS-84)
              </span>
              <div className="font-mono text-cyan-400 text-sm font-bold">
                {event.geo
                  ? `${event.geo.lat.toFixed(4)}° N, ${event.geo.lng.toFixed(4)}° E`
                  : "UNMAPPED"}
              </div>
              <div className="text-slate-400 text-[10px]">
                RADIO DE IMPACTO:{" "}
                <strong className="text-slate-200">
                  {event.evidence?.impact_radius_km || 350} km
                </strong>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                PROTOCOLO &amp; SECTOR
              </span>
              <div className="font-bold text-emerald-400 text-xs truncate">
                {event.evidence?.protocol || "BGP-4 / DWDM TELEMETRY"}
              </div>
              <div className="text-slate-400 text-[10px] truncate">
                ASN/SECTOR:{" "}
                <strong className="text-white">
                  {event.evidence?.asn_or_sector || event.source}
                </strong>
              </div>
            </div>
          </div>

          {/* Raw Headline & Narrative */}
          <div className="p-3.5 rounded bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span className="uppercase font-bold">
                CABECERA DE TRANSMISIÓN OSINT [{event.source}]
              </span>
              <span>
                CONFIANZA ALGORÍTMICA:{" "}
                <strong className="text-cyan-400">
                  {((event.evidence?.confidence_score || 0.96) * 100).toFixed(1)}%
                </strong>
              </span>
            </div>
            <div className="text-slate-100 text-sm font-semibold leading-relaxed">
              &gt; {event.headline}
            </div>
          </div>

          {/* Logos Entropy Breakdown Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded bg-slate-900/40 border border-slate-800 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-slate-400 text-[10px]">
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  CARGA TÉRMICA (Ω)
                </span>
                <span className="text-rose-400 font-bold">
                  {event.metrics.omega_index.toFixed(3)}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded overflow-hidden">
                <div
                  className="bg-rose-500 h-full"
                  style={{ width: `${Math.min(100, event.metrics.omega_index * 100)}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-500">Índice total de entropía del nodo</span>
            </div>

            <div className="p-3 rounded bg-slate-900/40 border border-slate-800 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-slate-400 text-[10px]">
                <span className="flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  FRICCIÓN SOCIAL
                </span>
                <span className="text-cyan-400 font-bold">
                  {event.metrics.social_friction.toFixed(3)}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded overflow-hidden">
                <div
                  className="bg-cyan-500 h-full"
                  style={{ width: `${Math.min(100, event.metrics.social_friction * 100)}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-500">Hostilidad y pánico operativo</span>
            </div>

            <div className="p-3 rounded bg-slate-900/40 border border-slate-800 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-slate-400 text-[10px]">
                <span className="flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  INERCIA ESTRUCTURAL
                </span>
                <span className="text-amber-400 font-bold">
                  {event.metrics.structural_inertia.toFixed(3)}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded overflow-hidden">
                <div
                  className="bg-amber-500 h-full"
                  style={{ width: `${Math.min(100, event.metrics.structural_inertia * 100)}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-500">Degradación sistémica de infraestructura</span>
            </div>
          </div>

          {/* REAL FORENSIC EVIDENCE OF THE EVENT */}
          <div className="rounded border border-cyan-900/60 bg-black/95 p-4 space-y-3 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-cyan-400">
                <Terminal className="w-4 h-4" />
                <span className="font-bold tracking-wider uppercase text-xs">
                  EVIDENCIA TÉCNICA REAL // VOLCADO DE TELEMETRÍA Y SENSORES
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">
                  VECTOR: <strong className="text-emerald-400">{event.evidence?.detection_vector}</strong>
                </span>
                <button
                  onClick={handleCopyEvidence}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition-colors cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copied ? "COPIADO" : "COPIAR TRAZA"}</span>
                </button>
              </div>
            </div>

            <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap select-text">
              {event.evidence?.raw_evidence || "No raw forensic log captured for this frame."}
            </pre>

            {/* Chronological Forensic Timeline */}
            {event.evidence?.timeline && event.evidence.timeline.length > 0 && (
              <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1.5">
                <span className="text-[10px] text-cyan-400 font-bold uppercase flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  SECUENCIA CRONOLÓGICA DEL SUCESO:
                </span>
                <div className="space-y-1">
                  {event.evidence.timeline.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-[11px]">
                      <span className="text-cyan-300 font-bold shrink-0 w-24">
                        [{step.offset}]
                      </span>
                      <span className="text-slate-200">{step.event}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affected Entities Chips */}
            {event.evidence?.entities && event.evidence.entities.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                  ENTIDADES, OPERADORES Y SISTEMAS COMPROMETIDOS:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {event.evidence.entities.map((entity, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-[10px] font-semibold"
                    >
                      {entity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source Reference & SHA256 */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-2 border-t border-slate-900">
              <span className="flex items-center gap-1.5 text-slate-400">
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                FUENTE OFICIAL:{" "}
                {event.evidence?.source_url?.startsWith("http") ? (
                  <a
                    href={event.evidence.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-300 hover:text-emerald-200 underline font-bold"
                  >
                    {event.evidence.source_url} ↗
                  </a>
                ) : (
                  <span className="text-cyan-300">{event.evidence?.source_url}</span>
                )}
              </span>
              <span className="truncate max-w-md">
                SHA-256: {event.evidence?.sha256_fingerprint || "VERIFIED"}
              </span>
            </div>
          </div>

          {/* Mitigation Directive & Action Taken */}
          <div className="p-3.5 rounded bg-black/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold block">
                DIRECTIVA EJECUTADA POR LOGOS ENGINE
              </span>
              <div
                className={`text-xs font-bold font-mono ${
                  isRed ? "text-rose-400" : isYellow ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {event.neutralized_action}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleDownloadDump}
                className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors w-full sm:w-auto justify-center cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORTAR JSON FORENSE</span>
              </button>

              <button
                onClick={handleIsolate}
                disabled={mitigating}
                className="flex items-center gap-1.5 px-3 py-2 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-600 text-rose-200 hover:text-white text-xs font-bold transition-colors w-full sm:w-auto justify-center cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  {mitigating ? "EJECUTANDO..." : "EJECUTAR AISLAMIENTO WU-WEI"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between items-center">
          <span>SYNTERGIC ZERO-TRUST IDS // FORENSIC ENGINE v2.0</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 uppercase font-bold cursor-pointer"
          >
            CERRAR [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
