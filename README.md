# SYNTERGIC TELEMETRY DASHBOARD // DECISION INTELLIGENCE & EWS v2.5 PRODUCTION

> **Sistema de Alerta Temprana (EWS), Inteligencia de Amenazas e IDS Pasivo Ciber-Físico bajo arquitectura Zero-Trust.**  
> Monitorea el estado global en tiempo real a través de **7 Frentes Estratégicos** y **15 Fuentes Oficiales en Vivo**, traduciendo incidentes reales del planeta en **inteligencia directamente accionable para la toma de decisiones** con cartografía vectorial exacta (`Natural Earth 110m WGS-84`), directivas operativas claras, alertas limpias a Telegram y auditoría forense con huella criptográfica SHA-256.

🌐 **Dashboard en Vivo en la Nube (GitHub Pages — Costo $0):**  
👉 **[https://phobetor-ops.github.io/Syntergic-Telemetry-Dashboard/](https://phobetor-ops.github.io/Syntergic-Telemetry-Dashboard/)**

🚨 **Canal de Alertas en Telegram:**  
* **Alertas Inmediatas 24/7:** Disparo automático ante **Zero-Days en explotación activa**, vulnerabilidades con **CVSS ≥ 9.0**, caídas masivas de nubes, sismos $M \ge 6.0$ y desastres críticos.
* **Reporte Diario Global:** Despachado todas las mañanas a las **08:00 hs (Hora Argentina / ART)** con el resumen de los 7 frentes y acceso al Dashboard web.

---

## ÍNDICE DE DOCUMENTACIÓN

1. [Filosofía de Diseño: De Datos Abstractos a Inteligencia para Decisiones](#1-filosofía-de-diseño-de-datos-abstractos-a-inteligencia-para-decisiones)
2. [Arquitectura del Sistema y Flujo de Datos (Las 3 Etapas)](#2-arquitectura-del-sistema-y-flujo-de-datos-las-3-etapas)
3. [Priorización de Incidentes: Zero-Days (CVSS ≥ 9.0) y Severidades](#3-priorización-de-incidentes-zero-days-cvss--90-y-severidades)
4. [Los 7 Frentes Estratégicos y las 15 Fuentes Oficiales Conectadas](#4-los-7-frentes-estratégicos-y-las-15-fuentes-oficiales-conectadas)
5. [Módulos del Dashboard (Estética Cyberpunk & Toma de Decisiones)](#5-módulos-del-dashboard-estética-cyberpunk--toma-de-decisiones)
6. [Despliegue Web a Costo Cero (GitHub Pages & Modo Cloud Autónomo)](#6-despliegue-web-a-costo-cero-github-pages--modo-cloud-autónomo)
7. [Sistema de Alertas en Telegram (Horarios, Umbrales y Formato Limpio)](#7-sistema-de-alertas-en-telegram-horarios-umbrales-y-formato-limpio)
8. [Guía de Inicio y Despliegue Rápido (Local, PowerShell, Bash y Docker)](#8-guía-de-inicio-y-despliegue-rápido-local-powershell-bash-y-docker)
9. [Referencia de Endpoints REST y WebSockets](#9-referencia-de-endpoints-rest-y-websockets)
10. [Estructura del Proyecto](#10-estructura-del-proyecto)

---

## 1. FILOSOFÍA DE DISEÑO: DE DATOS ABSTRACTOS A INTELIGENCIA PARA DECISIONES

El objetivo principal de Syntergic v2.5 es resolver la **fatiga de alertas** y evitar que el operador pierda tiempo interpretando fórmulas matemáticas o descifrando códigos internos.

```text
  [ ENFOQUE TRADICIONAL (RUIDOSO) ]                 [ ENFOQUE SYNTERGIC v2.5 (ACCIONABLE) ]
  • "Alerta: Omega = 0.892 SF=0.86 SI=0.91"   ──►   • "¿Qué ocurrió?": Zero-Day en PAN-OS (CVSS 9.8)
  • "Kernel Panic / Directiva Wu-Wei"        ──►   • "¿Quién está afectado?": Firewalls corporativos
  • Coordenadas crudas y tablas de workers   ──►   • "¿Qué debo hacer?": Aplicar parche CISA inmediato
  • Sin contexto operativo inmediato         ──►   • "¿Dónde verificar?": Link directo a la fuente oficial
```

### Separación Clara entre Inteligencia y Auditoría
1. **Capa Operativa Principal (Visible):**
   * **¿Qué ocurrió?** Titular limpio y resumen ejecutivo sin corchetes de depuración.
   * **¿Cuál es el nivel de riesgo real?** Identificación clara (`🚨 ZERO-DAY • CVSS 9.8`, `💀 RANSOMWARE EXTORTION`, `☁️ CAÍDA CLOUD MAYOR`, `🌋 SISMO M6.2`).
   * **¿Qué activo o sector está comprometido?** Identificación del software, proveedor o región afectada.
   * **¿Qué decisión se debe tomar?** Caja de recomendación operativa destacada en neón con directivas concretas.
   * **Verificación Oficial:** Botón directo a la fuente oficial (CISA, NVD, Cloudflare, USGS, OMS).
2. **Capa Técnica y de Registro Forense (Cajón de Auditoría):**
   * Los registros de telemetría en crudo, la huella criptográfica **SHA-256**, los parámetros físicos y la cronología detallada se conservan intactos en un **acordeón colapsable (`[+] VER LOG TÉCNICO & REGISTRO FORENSE`)** y en el exportable **JSON** para peritajes técnicos sin saturar la pantalla ejecutiva.

---

## 2. ARQUITECTURA DEL SISTEMA Y FLUJO DE DATOS (LAS 3 ETAPAS)

```text
                 [ 15 FUENTES OFICIALES EN VIVO DE INTERNET ]
        (USGS, GDACS ONU/UE, NASA EONET, CISA KEV, Ransomware.live,
         abuse.ch Feodo C2, SANS ISC, The Hacker News, Cloudflare,
         GitHub Status, NOAA SWPC, BBC World/Mundo, Al Jazeera, ONU,
                         CNBC Macro, OMS/WHO)
                                   │
                                   ▼
        ┌──────────────────────────────────────────────────────┐
        │ ETAPA 1: Ingesta Concurrente & Geocodificación       │
        │  - ThreadPoolExecutor paralelo (10 hilos)            │
        │  - Geocodificación WGS-84 nativa, ISO-2 y Gazetteer  │
        │  - Consulta directa a CVE.org / MITRE AWG            │
        │  - Generación de huella criptográfica SHA-256        │
        └──────────────────────────┬───────────────────────────┘
                                   │
                                   ▼
        ┌──────────────────────────────────────────────────────┐
        │ ETAPA 2: Motor de Clasificación & Evaluación         │
        │  - Extracción de puntuación CVSS (3.1 / 4.0)         │
        │  - Detección de explotación activa (Zero-Days CISA)  │
        │  - Formateador de Decisiones (intelligenceFormatter) │
        └──────────────────────────┬───────────────────────────┘
                                   │
                                   ▼
        ┌──────────────────────────────────────────────────────┐
        │ ETAPA 3: Zero-Trust Dispatcher & Cloud Sentinel      │
        │  - Dispatcher WebSockets bidireccional en memoria    │
        │  - Caché de deduplicación SHA-256 (sin spam)         │
        │  - Generador de snapshot live-osint-snapshot.json    │
        │  - Disparador de Alertas Telegram en Español (ART)   │
        └──────────────────────────┬───────────────────────────┘
                                   │
                  ┌────────────────┴────────────────┐
                  ▼                                 ▼
   ┌─────────────────────────────┐   ┌─────────────────────────────┐
   │ DASHBOARD WEB LOCAL / CLOUD │   │ BOT OFICIAL EN TELEGRAM     │
   │  - GitHub Pages (Costo $0)  │   │  - Alertas Inmediatas 24/7  │
   │  - Mapa D3-Geo Natural Earth│   │  - Resumen Diario 08:00 ART │
   │  - Dossier de Decisión      │   │  - Formato limpio sin ruido │
   │  - Bitácora de Auditoría    │   │  - Enlaces directos a fuentes│
   └─────────────────────────────┘   └─────────────────────────────┘
```

---

## 3. PRIORIZACIÓN DE INCIDENTES: ZERO-DAYS (CVSS ≥ 9.0) Y SEVERIDADES

El sistema evalúa cada incidente con una matriz de prioridad para garantizar que los eventos verdaderamente críticos disparen acciones inmediatas:

| Nivel de Prioridad | Criterios de Detección | Impacto en Telegram | Visualización en el Mapa |
| :--- | :--- | :--- | :--- |
| **🚨 PRIORIDAD MÁXIMA (CRÍTICA)** | • **Zero-Day en explotación activa** (Catálogo CISA KEV o advisory 0-Day).<br>• Cualquier vulnerabilidad con severidad **CVSS ≥ 9.0** (verificada contra la API oficial de `CVE.org / MITRE AWG`). | **Alerta Inmediata 24/7** (en menos de 30 min sin esperar al reporte diario). | Baliza roja brillante pulsante con etiqueta `[CVSS 9.8]` o `[0-DAY]`. |
| **🔴 PRIORIDAD ALTA (SEVERA)** | • Caídas mayores en **Cloudflare Global Anycast** o **GitHub Core Cloud**.<br>• **Terremotos $M \ge 6.0$** (USGS) o Alerta Roja de desastre de la ONU (**GDACS**).<br>• Tormentas solares severas (**NOAA SWPC** $K \ge 6$ o fulguraciones clase X).<br>• Ataques confirmados de **Ransomware** o servidores **Botnet C2** activos. | **Alerta Inmediata 24/7** (filtrada por deduplicación SHA-256). | Baliza roja con etiqueta temática (ej. `[RANSOMWARE]`, `[CLOUD DOWN]`, `[M6.2]`). |
| **🟡 EN OBSERVACIÓN (ELEVADA)** | • Vulnerabilidades con parche disponible.<br>• Sismos moderados ($4.5 \le M < 6.0$).<br>• Degradaciones menores en servicios cloud.<br>• Tensiones geopolíticas o volatilidad financiera regional. | Incluido en el **Boletín Diario de las 08:00 AM ART** (sin alerta de interrupción). | Baliza ámbar con etiqueta de observación. |
| **🟢 INFORMATIVO (BASAL)** | • Monitoreo geofísico basal, comunicados estándar de la ONU y actividad de red normal. | Registro en bitácora interna. | Baliza verde esmeralda. |

---

## 4. LOS 7 FRENTES ESTRATÉGICOS Y LAS 15 FUENTES OFICIALES CONECTADAS

El motor concurrente consulta 15 fuentes oficiales agrupadas en **7 Frentes Estratégicos**:

| Frente Estratégico | Fuentes Oficiales Conectadas | Qué Monitorea |
| :--- | :--- | :--- |
| **🛡️ `CYBER_WARFARE`**<br>(Ciberdefensa & 0-Days) | 1. **CISA KEV Catalog** (Gobierno EE. UU.)<br>2. **API Oficial CVE.org / MITRE AWG**<br>3. **Ransomware.live API v2**<br>4. **abuse.ch Feodo Tracker (Botnets C2)**<br>5. **The Hacker News RSS**<br>6. **SANS Internet Storm Center (ISC)** | Explotación activa de Zero-Days, víctimas corporativas de extorsión ransomware, servidores activos de botnets (`QakBot`, `Pikabot`, etc.) y vectores de ataque emergentes. |
| **☁️ `INFRASTRUCTURE_CLOUD`**<br>(Cloud & Redes) | 7. **Cloudflare Global Status API**<br>8. **GitHub Cloud Status API** | Degradación de redes Anycast, caídas de DNS global, enrutamiento BGP y estado de la nube de desarrollo más grande del mundo. |
| **🌐 `GEOPOLITICAL_CONFLICT`**<br>(Seguridad Internacional) | 9. **BBC World News RSS**<br>10. **Al Jazeera English Global**<br>11. **Naciones Unidas (ONU News)**<br>12. **BBC Mundo (Latinoamérica)** | Conflictos armados, ataques con misiles, sanciones económicas, golpes de estado y disrupciones de seguridad internacional. |
| **🌋 `GEOPHYSICAL_CLIMATE`**<br>(Sismos & Clima ONU) | 13. **USGS Earthquake ComCat API (M4.5+)**<br>14. **GDACS UN/EC GeoRSS (ONU / Unión Europea)**<br>15. **NASA EONET v3 (Tierra & Satélites)** | Terremotos en tiempo real con profundidad e hipocentro, alertas rojas de desastres naturales (tsunamis, ciclones) y eventos satelitales NASA. |
| **☀️ `SPACE_WEATHER_GRID`**<br>(Clima Espacial & Red) | 16. **NOAA Space Weather Prediction Center** | Tormentas geomagnéticas, eyecciones de masa coronal (CME) y riesgo en telecomunicaciones satelitales, GPS y redes de alta tensión. |
| **📉 `FINANCIAL_MACRO`**<br>(Mercados & Energía) | 17. **CNBC Global Markets Feed** | Crisis de liquidez, shocks energéticos, suspensión de cotizaciones y riesgo de crédito sistémico. |
| **🧬 `BIO_HUMANITARIAN`**<br>(Salud Global & OMS) | 18. **Organización Mundial de la Salud (OMS/WHO)** | Brotes epidemiológicos, alertas sanitarias de emergencia internacional y emergencias humanitarias. |

---

## 5. MÓDULOS DEL DASHBOARD (ESTÉTICA CYBERPUNK & TOMA DE DECISIONES)

El frontend está desarrollado en **Next.js 14**, **Tailwind CSS**, **D3-Geo** y **Recharts**, optimizado para centros de operaciones con estética **Cyberpunk HUD**:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [RADIO] SYNTERGIC // CENTRO DE INTELIGENCIA GLOBAL       [DATOS EN VIVO] [15:08:25 ART]│
│ 🚨 PRIORIDAD ALTA: 2 ZERO-DAYS / CVSS ≥ 9.0 Y 14 INCIDENTES CRÍTICOS ACTIVOS           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ 🛡️ CIBERDEFENSA ]   │ [ ☁️ INFRAESTRUCTURA ]  │ [ 🌋 SISMOS/CLIMA ] │ [ 🌐 GEOPOLÍTICA ]  │
│ 2 Zero-Days Activos   │ Cloudflare Operativo   │ 1 Sismo M5.8 USGS  │ 4 Alertas Globales  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [MAPA VECTORIAL D3-GEO NATURAL EARTH 110M]     │ [EXPEDIENTE OPERATIVO DE DECISIÓN]    │
│  - 177 Países con coloración por severidad     │  🚨 ZERO-DAY CRÍTICO • CVSS 9.8       │
│  - Balizas con etiquetas: [CVSS 9.8], [M6.2]   │  📌 Palo Alto Networks PAN-OS RCE    │
│  - Filtro directo: [🚨 ZERO-DAYS / CVSS ≥ 9]   │  🎯 ACCIÓN OPERATIVA RECOMENDADA:     │
│  - Rutas troncales submarinas BGP              │     Aplicar parche de emergencia CISA │
│                                                │  🛡️ ACTIVO AFECTADO: Firewalls Edge  │
│                                                │  🔗 [VERIFICAR FUENTE OFICIAL ↗]      │
│                                                │  [+] Ver Log Técnico & Registro SHA   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ BITÁCORA OPERATIVA DE INCIDENTES (AUDIT LOG)   │ TENDENCIAS Y MONITOREO TEMPORAL       │
│  - Lista en tiempo real filtrable por CVE/país │  - Gráfica Recharts de Severidad (0-100%)│
│  - Activo afectado y recomendación por fila    │  - Umbral de acción inmediata en 70%  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Cabecera Ejecutiva de Decisión (`NetworkStatusHeader.tsx`):**
   * Muestra el estado operativo global, reloj sincronizado en **Hora Argentina (`ART`)**, conmutador de sonido de cabina y 3 contadores prioritarios: `ZERO-DAYS / CVSS ≥ 9`, `CRÍTICOS ACTIVOS` y `EVENTOS EN VIVO`.
2. **Tarjetas de Inteligencia por Dominio (`SystemMatrixStats.tsx`):**
   * Cuatro cuadrantes que resumen el estado de **Ciberdefensa**, **Infraestructura Cloud**, **Sismos & Clima** y **Geopolítica/OMS**.
3. **Cartografía Global Vectorial (`GlobalThreatMap.tsx`):**
   * Proyección cartográfica **Natural Earth I (WGS-84)** con zoom interactivo y paneo.
   * Botón de filtrado rápido para aislar exclusivamente los **Zero-Days y vulnerabilidades CVSS ≥ 9.0**.
   * Balizas con etiquetas de decisión (`[CVSS 9.8]`, `[M5.8]`, `[RANSOMWARE]`).
4. **Expediente Operativo de Decisión (Panel Lateral):**
   * Destaca la **Acción Operativa Recomendada**, el **Activo Afectado**, el **Resumen del Incidente** y el **Enlace a la Fuente Oficial**.
   * Incluye el botón **`CONTENER AMENAZA / AISLAR NODO`** para mitigar el incidente y un cajón colapsable para auditoría técnica.
5. **Bitácora Operativa & Terminal de Auditoría (`MitigatedInjectionsLog.tsx`):**
   * Registro cronológico con buscador en tiempo real, selector de severidad y enlace directo para inspeccionar el expediente de cualquier nodo.
6. **Gráficos de Tendencias Temporales (`TelemetryGraphs.tsx`):**
   * Curvas de severidad y actividad por dominio con líneas de referencia en 40% (Nivel Base) y 70% (Umbral de Acción Inmediata).
7. **Expediente a Pantalla Completa (`ForensicEvidenceModal.tsx`):**
   * Modal ampliado para análisis forense profundo con opción de descarga de expediente en `.json`.

---

## 6. DESPLIEGUE WEB A COSTO CERO (GITHUB PAGES & MODO CLOUD AUTÓNOMO)

El proyecto cuenta con una arquitectura diseñada para ejecutarse **100% gratis en la web pública** sin requerir un servidor dedicado de backend:

👉 **URL de Acceso Directo:** [https://phobetor-ops.github.io/Syntergic-Telemetry-Dashboard/](https://phobetor-ops.github.io/Syntergic-Telemetry-Dashboard/)

### Cómo Funciona el Modo Cloud Autónomo
1. **Generación de Snapshot en GitHub Actions (Job 1):**
   * Cada vez que se ejecuta el workflow en la nube, el motor Python consulta las 15 fuentes (incluyendo las que bloquean navegadores por directivas CORS como CISA KEV, Ransomware.live, Feodo C2, BBC, Al Jazeera, GDACS y OMS), evalúa los CVSS y empaqueta la instantánea en [`frontend/public/live-osint-snapshot.json`](./frontend/public/live-osint-snapshot.json).
2. **Compilación Estática de Next.js (Job 3):**
   * Next.js compila en modo estático (`output: "export"`) para la ruta base `/Syntergic-Telemetry-Dashboard`.
3. **Ejecución en el Navegador del Usuario (`useSyntergicSocket.ts`):**
   * Al abrir el enlace de GitHub Pages, el frontend detecta el entorno en la nube y activa automáticamente el **Modo Cloud Autónomo**:
     * Carga los ~85 eventos reales del snapshot generado por GitHub Actions.
     * Consulta en tiempo real desde el navegador las APIs públicas que permiten CORS (**USGS Terremotos en Vivo**, **Cloudflare Global Status** y **GitHub Status**).
     * Mantiene funcionando la gráfica temporal, la interactividad del mapa y la contención de amenazas en el navegador.

---

## 7. SISTEMA DE ALERTAS EN TELEGRAM (HORARIOS, UMBRALES Y FORMATO LIMPIO)

El despachador de alertas ([`backend/telegram_notifier.py`](./backend/telegram_notifier.py) y [`backend/cloud_sentinel.py`](./backend/cloud_sentinel.py)) entrega información limpia y directa en **Hora Argentina (`ART` / `UTC-3`)**:

### Horarios y Disparadores

| Tipo de Alerta | Frecuencia | Condición de Disparo |
| :--- | :--- | :--- |
| 🚨 **Alerta Inmediata de Picos Críticos** | **Cada 30 minutos** (24/7) | Se dispara de forma inmediata **SOLO si aparece un nuevo evento prioritario** (Zero-Day CVSS $\ge 9.0$, ataque ransomware, sismo $M \ge 6.0$, caída cloud mayor). La memoria caché SHA-256 (`sentinel_seen_hashes.json`) evita alertas repetidas. |
| ☀️ **Reporte Diario Global de Inteligencia** | **Todos los días a las 08:00 AM ART** (`11:00 UTC`) | Envía el panorama consolidado de los 7 Frentes Estratégicos con las amenazas más relevantes de las últimas 24 horas y acceso directo al Dashboard en GitHub Pages. |
| ⚡ **Disparo Manual** | Bajo demanda | Desde la pestaña **Actions ➔ Run workflow** en GitHub o pulsando el botón en el Dashboard local. |

### Ejemplo del Mensaje que Llega a Telegram:

```text
🚨 ALERTA INMEDIATA DE INTELIGENCIA
🕒 05/11/2026 15:10 hs (Hora Argentina)
━━━━━━━━━━━━━━━━━━━━━━
Se detectaron 1 incidente(s) prioritario(s) en tiempo real:

1. 🚨 ZERO-DAY CRÍTICO (Severidad CVSS 9.8/10)
📌 Palo Alto Networks PAN-OS Remote Code Execution Vulnerability
📝 Vulnerabilidad crítica de ejecución remota de código explotada activamente en firewalls perimetrales.
📍 Santa Clara, United States of America  |  📡 Fuente: Catálogo CISA KEV (EE. UU.)
🔗 Ver reporte oficial

━━━━━━━━━━━━━━━━━━━━━━
🌐 Abrir Mapa Interactivo en Vivo (GitHub Pages)
```

---

## 8. GUÍA DE INICIO Y DESPLIEGUE RÁPIDO (LOCAL, POWERSHELL, BASH Y DOCKER)

Cualquier persona puede clonar este repositorio y ejecutarlo en local en 2 minutos. Los scripts de inicio preparan automáticamente el entorno virtual de Python (`venv`) e instalan las dependencias de `npm`.

### Paso 1: Clonar el Repositorio y Configurar Variables
```bash
git clone https://github.com/phobetor-ops/Syntergic-Telemetry-Dashboard.git
cd Syntergic-Telemetry-Dashboard
cp .env.example .env
```
*(Opcional: Si deseas recibir alertas en Telegram, edita `.env` agregando tu `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`).*

### Paso 2: Iniciar los Servidores

#### En Windows (PowerShell):
```powershell
# Inicia automáticamente Backend (FastAPI en :8000) y Frontend (Next.js en :3000):
.\start-cluster.ps1

# Para detener ambos servidores:
.\stop-cluster.ps1
```

#### En Linux / macOS (Bash):
```bash
chmod +x start-cluster.sh
./start-cluster.sh
```

#### Con Docker Compose:
```bash
docker compose up --build -d
```

### URLs de Acceso Local:
* **Dashboard SOC (Frontend):** [http://localhost:3000](http://localhost:3000)
* **API REST & WebSocket Hub (Backend):** [http://localhost:8000](http://localhost:8000)
* **Documentación Interactiva Swagger:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 9. REFERENCIA DE ENDPOINTS REST Y WEBSOCKETS

| Método | Endpoint | Descripción |
| :---: | :--- | :--- |
| `GET` | `/health` | Estado del cluster, memoria, clientes WebSocket conectados y total de incidentes procesados. |
| `GET` | `/api/status` | Estado global actual (`GREEN`, `YELLOW`, `RED`), métricas de severidad y directiva activa. |
| `GET` | `/api/telemetry/hotspots` | Catálogo de ~85 incidentes globales activos con coordenadas satelitales y expediente de evidencia. |
| `POST` | `/api/telemetry/sync-live` | Fuerza una consulta paralela en vivo a las 15 fuentes oficiales. |
| `POST` | `/api/telemetry/telegram-dispatch` | Despacha el reporte a Telegram bajo demanda (`?mode=sentinel` o `?mode=digest`). |
| `POST` | `/api/telemetry/mitigate` | Aplica la directiva de contención sobre un nodo específico (`event_id`, `facility`). |
| `WS` | `/ws/telemetry` | Túnel WebSocket bidireccional que transmite eventos en tiempo real con latencia inferior a 10 ms. |

---

## 10. ESTRUCTURA DEL PROYECTO

```text
Syntergic-Telemetry-Dashboard/
├── .github/
│   └── workflows/
│       └── syntergic_cloud_sentinel.yml # Workflow en GitHub Actions (Alertas cada 30m, Reporte diario 08:00 ART & Deploy Pages)
├── start-cluster.ps1                 # Script de inicio automático para Windows
├── stop-cluster.ps1                  # Script de detención limpia de puertos
├── start-cluster.sh                  # Script de inicio para Linux y macOS
├── docker-compose.yml                # Despliegue en contenedores Docker
├── render.yaml                       # Blueprint para despliegue web en Render
├── .env.example                      # Ejemplo de configuración para credenciales de Telegram
├── README.md                         # Documentación completa técnica y operativa
│
├── backend/
│   ├── main.py                       # Servidor FastAPI, WebSocket Hub y controlador de mitigación
│   ├── live_osint.py                 # Conector concurrente a 15 fuentes oficiales con evaluación CVSS y Zero-Days
│   ├── cloud_sentinel.py             # Sentinel de ejecución en la nube con caché SHA-256 y exportador de snapshots
│   ├── telegram_notifier.py          # Cliente Telegram Bot API con formato limpio en Hora Argentina (ART)
│   ├── tasks.py                      # Procesamiento analítico y tareas asíncronas
│   ├── models.py                     # Modelos Pydantic (TelemetryRecord, GeoLocation, Evidence)
│   └── requirements.txt              # Dependencias Python (FastAPI, Requests, Uvicorn, Celery, Redis)
│
└── frontend/
    ├── package.json                  # Dependencias Next.js 14, Tailwind, D3-Geo, Recharts, Lucide
    ├── next.config.mjs               # Configuración de exportación estática para GitHub Pages
    ├── public/
    │   └── live-osint-snapshot.json  # Snapshot estático de los 7 frentes para GitHub Pages
    └── src/
        ├── utils/
        │   └── intelligenceFormatter.ts # Motor de formateo para la toma de decisiones y recomendaciones operativas
        ├── data/
        │   └── world-110m.json       # Topología cartográfica oficial Natural Earth 110m (177 países)
        ├── hooks/
        │   └── useSyntergicSocket.ts # Hook híbrido: WebSocket local + Modo Cloud Autónomo
        ├── components/
        │   ├── NetworkStatusHeader.tsx    # Cabecera ejecutiva con contadores de Zero-Days y hora argentina
        │   ├── SystemMatrixStats.tsx      # Tarjetas de inteligencia para los 4 cuadrantes estratégicos
        │   ├── GlobalThreatMap.tsx        # Mapa mundial D3-Geo, filtro de 0-Days y Expediente Operativo
        │   ├── ForensicEvidenceModal.tsx  # Expediente a pantalla completa con cajón colapsable de auditoría
        │   ├── TelemetryGraphs.tsx        # Gráfico temporal de severidad y tendencias de incidentes
        │   └── MitigatedInjectionsLog.tsx # Bitácora operativa de incidentes con búsqueda en tiempo real
        └── app/
            └── page.tsx              # Vista principal del Centro de Comando Syntergic
```
