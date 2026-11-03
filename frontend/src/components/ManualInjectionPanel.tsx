"use client";

import React, { useState } from "react";
import { Send, Zap, AlertCircle, ShieldCheck, CornerDownLeft, MapPin } from "lucide-react";

interface ManualInjectionPanelProps {
  onInject: (headline: string, forceSpike?: boolean, city?: string) => Promise<any>;
  onTriggerSpike: () => void;
}

const TARGET_CITIES = [
  { label: "Automático / Aleatorio Global", value: "" },
  { label: "Ashburn, VA (US-East IXP)", value: "Ashburn" },
  { label: "Bab-el-Mandeb (Cables Mar Rojo)", value: "Bab-el-Mandeb" },
  { label: "Frankfurt (DE-CIX Core)", value: "Frankfurt" },
  { label: "London (LCH Clearnet)", value: "London" },
  { label: "Ismailia (Canal de Suez)", value: "Ismailia" },
  { label: "Hsinchu, Taiwan (Fab 20 EUV)", value: "Hsinchu" },
  { label: "Santa Clara, CA (AI Cluster)", value: "Santa Clara" },
  { label: "Tokyo (Otemachi IX / SCADA)", value: "Tokyo" },
  { label: "Svalbard, Norway (Estación Polar)", value: "Svalbard" },
  { label: "Dubai (DIFC Financial Hub)", value: "Dubai" },
  { label: "Singapore (Estrecho de Malaca)", value: "Singapore" },
  { label: "Geneva (CERN WLCG Tier-0)", value: "Geneva" },
  { label: "São Paulo (IX.br / B3)", value: "São Paulo" },
  { label: "Sydney (Southern Cross CLS)", value: "Sydney" },
  { label: "Reykjavik (Geothermal HPC)", value: "Reykjavik" },
];

export const ManualInjectionPanel: React.FC<ManualInjectionPanelProps> = ({
  onInject,
}) => {
  const [headline, setHeadline] = useState<string>("");
  const [targetCity, setTargetCity] = useState<string>("");
  const [forceCritical, setForceCritical] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim()) return;

    setIsSubmitting(true);
    try {
      await onInject(headline.trim(), forceCritical, targetCity || undefined);
      setFeedback("SEÑAL INYECTADA Y PROCESADA POR LOGOS ENGINE");
      setHeadline("");
      setTimeout(() => setFeedback(null), 3500);
    } catch {
      setFeedback("ERROR AL INYECTAR SEÑAL");
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePresetInject = async (presetText: string, spike: boolean, city?: string) => {
    setIsSubmitting(true);
    try {
      await onInject(presetText, spike, city || targetCity || undefined);
      setFeedback(
        spike
          ? "ALERTA ROJA (KERNEL PANIC) DESPLEGADA EN EL MAPA"
          : "SEÑAL TÁCTICA INYECTADA EN TIEMPO REAL"
      );
      setTimeout(() => setFeedback(null), 3500);
    } catch {
      setFeedback("ERROR EN SIMULACIÓN");
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-slate-950/90 border border-slate-800 rounded-lg p-4 font-mono text-xs shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-slate-200 uppercase tracking-wider">
            CONSOLA DE INYECCIÓN OSINT // SIMULADOR DE EVENTOS GEOPOLÍTICOS Y DE RED
          </h3>
        </div>
        {feedback && (
          <span className="text-[10px] text-cyan-300 font-bold bg-cyan-950 border border-cyan-500 px-2.5 py-0.5 rounded animate-pulse">
            ✓ {feedback}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Presets */}
        <div className="flex flex-col gap-2">
          <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">
            ESCENARIOS RÁPIDOS DE PRUEBA (1-CLIC)
          </span>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() =>
                handlePresetInject(
                  "GLOBAL KERNEL PANIC: Corte simultáneo de 4 cables submarinos de fibra óptica en el corredor del Atlántico Norte y Mar Rojo.",
                  true,
                  "Bab-el-Mandeb"
                )
              }
              disabled={isSubmitting}
              className="flex items-center justify-between p-2.5 rounded bg-rose-950/50 hover:bg-rose-900/70 border border-rose-700/70 hover:border-rose-400 text-rose-200 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <div className="font-bold text-[11px]">DISPARAR PICO CRÍTICO (RED ALERT)</div>
                  <div className="text-[9px] text-rose-400">Corte Submarino / BGP Hijack (&gt;0.85 Ω)</div>
                </div>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 bg-rose-900 rounded font-bold">&gt;0.70 Ω</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handlePresetInject(
                  "ELEVATED INERTIA: Fallo de transformador de 380kV y caída de liquidez interbancaria en nodo europeo.",
                  false,
                  "Frankfurt"
                )
              }
              disabled={isSubmitting}
              className="flex items-center justify-between p-2.5 rounded bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/60 hover:border-amber-400 text-amber-200 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold text-[11px]">INYECTAR FRICCIÓN ELEVADA (YELLOW)</div>
                  <div className="text-[9px] text-amber-400">Anomalía SCADA / Spread Bancario</div>
                </div>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 bg-amber-900 rounded font-bold">0.4-0.7 Ω</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handlePresetInject(
                  "STABLE SYNTERGIA: Sincronización atómica White Rabbit confirmada con 0.00% pérdida de paquetes.",
                  false,
                  "Geneva"
                )
              }
              disabled={isSubmitting}
              className="flex items-center justify-between p-2.5 rounded bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-700/60 hover:border-emerald-400 text-emerald-200 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-[11px]">INYECTAR PULSO ESTABLE (GREEN)</div>
                  <div className="text-[9px] text-emerald-400">Equilibrio Nominal en Nodo</div>
                </div>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-900 rounded font-bold">&lt;0.40 Ω</span>
            </button>
          </div>
        </div>

        {/* Freeform input with Target Location Selector */}
        <div className="lg:col-span-2 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">
              INYECCIÓN PERSONALIZADA CON DESTINO GEOGRÁFICO
            </span>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-black/60 border border-slate-700 rounded px-2 py-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <select
                  value={targetCity}
                  onChange={(e) => setTargetCity(e.target.value)}
                  className="bg-slate-950 text-slate-200 text-[11px] focus:outline-none cursor-pointer"
                >
                  {TARGET_CITIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-1.5 text-[11px] text-rose-400 font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={forceCritical}
                  onChange={(e) => setForceCritical(e.target.checked)}
                  className="accent-rose-500"
                />
                FORZAR PICO ROJO
              </label>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 flex-1">
            <textarea
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Escribe un titular o evento OSINT para evaluar en el Logos Engine (ej. 'Kernel panic y secuestro de rutas BGP en el punto de intercambio de Ashburn')..."
              rows={3}
              className="w-full flex-1 p-3 rounded bg-black/70 border border-slate-800 focus:border-cyan-500 text-slate-100 placeholder-slate-600 focus:outline-none resize-none text-xs font-mono"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-500">
                El evento se geolocalizará en el mapa y generará su expediente forense automáticamente
              </span>
              <button
                type="submit"
                disabled={isSubmitting || !headline.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500 text-cyan-200 hover:text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
                <span>INYECTAR AL SENSOR</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
