# SYNTERGIC TELEMETRY DASHBOARD // EARLY WARNING SYSTEM (EWS) v2.5 PRODUCTION

> **Sistema de Alerta Temprana (EWS) e IDS Pasivo Ciber-Físico bajo arquitectura Zero-Trust.**  
> Monitorea el estado global en tiempo real a través de **7 Frentes Estratégicos** y **15 Fuentes Oficiales en Vivo**, traduciendo eventos críticos del mundo real en métricas matemáticas de **Entropía Ambiental y Social ($\Omega$)** con cartografía vectorial exacta (`Natural Earth 110m WGS-84`), evidencia forense verificable y aislamiento activo en Sandbox (**Protocolo Wu-Wei**).

🌐 **Live Cloud Dashboard (GitHub Pages — Costo Cero):**  
👉 **[https://phobetor-ops.github.io/Syntergic-Telemetry-Dashboard/](https://phobetor-ops.github.io/Syntergic-Telemetry-Dashboard/)**

---

## ÍNDICE DE DOCUMENTACIÓN

1. [Propósito General: ¿Qué es y qué mide?](#1-propósito-general-qué-es-y-qué-mide)
2. [Arquitectura del Backend y Flujo de Datos (Las 3 Etapas)](#2-arquitectura-del-backend-y-flujo-de-datos-las-3-etapas)
   - [Etapa 1: Sensor de Ingesta Paralela y Geocodificación (`live_osint.py`)](#etapa-1-sensor-de-ingesta-paralela-y-geocodificación-backendLlive_osintpy)
   - [Etapa 2: Motor Logos — Cálculo Matemático de Entropía (`tasks.py`)](#etapa-2-motor-logos--cálculo-matemático-de-entropía-backendtaskspy)
   - [Etapa 3: Zero-Trust Dispatcher y Máquina de Estados (`main.py`)](#etapa-3-zero-trust-dispatcher-y-máquina-de-estados-backendmainpy)
3. [Utilidad Operativa de la Etapa 3 (¿Para qué sirve la Máquina de Estados?)](#3-utilidad-operativa-de-la-etapa-3-para-qué-sirve-la-máquina-de-estados)
4. [Los 7 Frentes Estratégicos y las 15 Fuentes Oficiales en Vivo](#4-los-7-frentes-estratégicos-y-las-15-fuentes-oficiales-en-vivo)
5. [Funcionamiento Detallado del Frontend (Los 6 Módulos del Dashboard)](#5-funcionamiento-detallado-del-frontend-los-6-módulos-del-dashboard)
6. [Guía de Inicio y Apagado Rápido (Scripts y Comandos)](#6-guía-de-inicio-y-apagado-rápido-scripts-y-comandos)
7. [Referencia de Endpoints REST y WebSockets](#7-referencia-de-endpoints-rest-y-websockets)
8. [Estructura del Proyecto](#8-estructura-del-proyecto)

---

## 1. PROPÓSITO GENERAL: ¿QUÉ ES Y QUÉ MIDE?

El **Syntergic Telemetry Dashboard** es una plataforma de vigilancia e inteligencia en tiempo real diseñada para detectar, cuantificar, geolocalizar y contener anomalías sistémicas antes de que provoquen fallos en cascada.

En lugar de mostrar simples titulares desconectados, el sistema recolecta eventos reales que están ocurriendo hoy en el planeta (terremotos, ataques de ransomware, servidores de comando y control de botnets, caídas de nubes globales, tormentas geomagnéticas, choques financieros y conflictos geopolíticos) y los procesa mediante un modelo matemático de **Carga Térmica / Entropía ($\Omega$)**.

Cuando la entropía de un nodo o el promedio móvil global supera los umbrales de seguridad, el sistema activa directivas automáticas de contención (**Rate-Limiting** o el **Protocolo Wu-Wei de Aislamiento en Sandbox**).

---

## 2. ARQUITECTURA DEL BACKEND Y FLUJO DE DATOS (LAS 3 ETAPAS)

```
                 [ 15 FUENTES OFICIALES EN VIVO DE INTERNET ]
        (USGS, GDACS ONU/UE, NASA EONET, CISA KEV, Ransomware.live,
         abuse.ch Feodo C2, SANS ISC, The Hacker News, Cloudflare,
         GitHub Status, NOAA SWPC, BBC World/Mundo, Al Jazeera, ONU,
                         CNBC Macro, OMS/WHO)
                                   │
                                   ▼
        ┌──────────────────────────────────────────────────────┐
        │ ETAPA 1: Sensor de Ingesta Paralela (live_osint.py)  │
        │  - Pool concurrente ThreadPoolExecutor (10 hilos)    │
        │  - Geocodificación WGS-84 nativa, ISO-2 y Gazetteer  │
        │  - Separación angular anti-solapamiento de nodos     │
        │  - Generación de huella criptográfica SHA-256        │
        └──────────────────────────┬───────────────────────────┘
                                   │
                                   ▼
        ┌──────────────────────────────────────────────────────┐
        │ ETAPA 2: Motor Logos (tasks.py / live_osint.py)      │
        │  - Fricción Social (SF): Hostilidad / Pánico [0..1]  │
        │  - Inercia Estructural (SI): Fallo sistémico [0..1]  │
        │  - Índice Omega (Ω): Carga térmica resultante [0..1] │
        └──────────────────────────┬───────────────────────────┘
                                   │
                                   ▼
        ┌──────────────────────────────────────────────────────┐
        │ ETAPA 3: Zero-Trust Dispatcher & Máquina de Estados  │
        │  - Ventana deslizante de Promedio Móvil (10 muestras)│
        │  - Semáforo Ejecutivo Global: GREEN / YELLOW / RED   │
        │  - Búfer en memoria de alta velocidad (200 eventos)  │
        │  - Controlador de Mitigación Activa Wu-Wei           │
        └──────────────────────────┬───────────────────────────┘
                                   │ WebSockets Bidireccionales
                                   │ (ws://localhost:8000/ws/telemetry)
                                   ▼
        ┌──────────────────────────────────────────────────────┐
        │ FRONTEND NEXT.JS 14 (DASHBOARD SOC EN PUERTO 3000)   │
        │  - Mapa Global Vectorial Natural Earth 110m (d3-geo) │
        │  - Filtro interactivo por los 7 Frentes Estratégicos │
        │  - Dossier Forense Acoplado + Modal Pantalla Completa│
        │  - Gráficos Multiserie en Vivo (Recharts)            │
        │  - Terminal Unix (/dev/pts/syntergic_ids.log)        │
        └──────────────────────────────────────────────────────┘
```

### Etapa 1: Sensor de Ingesta Paralela y Geocodificación (`backend/live_osint.py`)
* **Ejecución Concurrente:** Al iniciar el servidor, cada 4 minutos de forma automática o cuando el operador pulsa **`SYNC 15 FUENTES EN VIVO`**, un `ThreadPoolExecutor` de 10 hilos consulta en paralelo las 15 APIs y canales RSS oficiales.
* **Resolución Geográfica Exacta (`WGS-84`):**
  1. **Coordenadas Satelitales / Sísmicas Nativas:** Para **USGS**, **NASA EONET** y **GDACS (ONU/UE)**, extrae directamente la latitud, longitud y profundidad/magnitud medidas por los instrumentos físicos.
  2. **Mapeo por Código de País `ISO-2`:** Para **Ransomware.live** y **abuse.ch Feodo C2**, traduce el código ISO de 2 letras del país afectado (`AR`, `BR`, `CL`, `CO`, `MX`, `US`, `DE`, `JP`, etc.) mediante la tabla `ISO2_TO_GEO` (más de 55 países) hacia el centro nacional de ciberdefensa (`CERT`) o punto neurálgico de intercambio de internet (`IXP`) correspondiente.
  3. **Geocodificación NLP (`GAZETTEER`):** Para boletines `CVE` y despachos geopolíticos/financieros, analiza el contenido contra el diccionario de sedes tecnológicas, capitales y estrechos marítimos. Si múltiples incidentes ocurren en la misma ciudad, aplica un micro-desplazamiento angular determinista (`_apply_jitter()`) para que ningún marcador quede oculto debajo de otro en el mapa.
* **Integridad Forense:** Genera un hash criptográfico **`SHA-256`** único sobre la captura técnica del evento y preserva la URL oficial original (`source_url`) para verificación directa.

### Etapa 2: Motor Logos — Cálculo Matemático de Entropía (`backend/tasks.py`)
Cada suceso recolectado es evaluado para producir **3 métricas normalizadas en el rango `[0.000, 1.000]`**:

1. **Fricción Social (`social_friction` — $SF$):** Cuantifica el grado de hostilidad, pánico social, extorsión activa, conflicto armado o impacto humano directo del evento.
2. **Inercia Estructural (`structural_inertia` — $SI$):** Cuantifica el nivel de fallo sistémico o degradación de infraestructura crítica (magnitud sísmica, severidad de explotación Zero-Day/Ransomware, impacto en CDN/BGP en caídas cloud, o nivel de alerta en GDACS/NOAA).
3. **Índice Omega (`omega_index` — $\Omega$):** Es la **carga térmica total (entropía)** del evento individual:
   $$\Omega = \text{clamp}_{[0.01, 0.99]}\left( 0.50 \cdot SF + 0.50 \cdot SI + \epsilon \right)$$

### Etapa 3: Zero-Trust Dispatcher y Máquina de Estados (`backend/main.py`)
El servidor mantiene una **ventana deslizante de las últimas 10 muestras (`omega_window`)** para calcular el **Promedio Móvil Global ($\bar{\Omega}$)** en `compute_threat_state()` y gobernar el estado general del sistema:

| Nivel de Amenaza | Promedio Móvil ($\bar{\Omega}$) | Directiva Automática del Sistema | Acción Operativa SOC |
| :---: | :---: | :--- | :--- |
| **`GREEN`** | `< 0.40` | `STATUS: GREEN \| STABLE SYNTERGIA \| NORMAL I/O` | Entropía basal normal. Enrutamiento pasivo a matriz fría y monitoreo estándar. |
| **`YELLOW`** | `0.40 - 0.70` | `STATUS: YELLOW \| RISING ENTROPY \| RATE LIMITING ACTIVE` | Entropía en ascenso. Activación de *Rate-Limiting* adaptativo y filtrado preventivo. |
| **`RED`** | `> 0.70` | `STATUS: RED \| GLOBAL KERNEL PANIC \| WU-WEI PROTOCOL ENGAGED / SANDBOXING ACTIVE` | Crisis sistémica crítica. Activación del **Protocolo Wu-Wei** (cuarentena de nodos en sandbox y alerta audiovisual). |

---

## 3. UTILIDAD OPERATIVA DE LA ETAPA 3 (¿PARA QUÉ SIRVE LA MÁQUINA DE ESTADOS?)

Si las **Etapas 1 y 2** son los "ojos y el cerebro analítico" que leen lo que ocurre en el planeta, la **Etapa 3 (`backend/main.py`) es el termostato y el centro de mando** que evita tener que leer 80 reportes individuales para saber si existe un riesgo sistémico real:

1. **Elimina la "Fatiga de Alertas" (Distingue un incidente aislado de una crisis sistémica):**
   * Sin la ventana de promedio móvil (`omega_window`), cualquier evento fuerte aislado haría que todo el sistema saltara a **ROJO** y 5 segundos después volviera a **VERDE** al entrar una noticia normal.
   * Con la Máquina de Estados, un incidente aislado aparece como un **punto rojo en el mapa** para que puedas investigarlo, pero el estado global solo sube a **`RED` (`GLOBAL KERNEL PANIC`)** cuando se produce una **acumulación sostenida de eventos críticos en múltiples frentes simultáneamente** ($\bar{\Omega} > 0.70$).
2. **Actúa como Interruptor Automático (*Circuit Breaker*) para Otros Sistemas:**
   * Al exponer un estado global unificado (`GREEN`, `YELLOW`, `RED`) en `GET /api/status` y por WebSocket, puedes conectarlo a automatizaciones externas:
     * En **`YELLOW`**: endurecer reglas de firewall/WAF, congelar despliegues automáticos (`CI/CD freeze`) o aumentar validaciones.
     * En **`RED`**: disparar alertas a Telegram/Slack/Discord, aislar subredes sensibles o pausar bots de trading/operaciones automatizadas ante un evento tipo "Cisne Negro".
3. **Protege tu IP y Actualiza la Interfaz en Milisegundos (`WebSocket Hub`):**
   * En vez de que el navegador consulte repetidamente las 15 APIs externas (lo que provocaría bloqueos por *Rate-Limit* en USGS, CISA o BBC), el Dispatcher centraliza la consulta en el backend, almacena hasta 200 eventos en memoria (`local_history_buffer`) y empuja cada actualización a tu navegador en **~10 ms** vía WebSockets.
4. **Cierra el Ciclo de Respuesta cuando Mitigas un Incidente (`Protocolo Wu-Wei`):**
   * Cuando pulsas **`AISLAR NODO (PROTOCOLO WU-WEI)`** sobre un incidente del mapa, la Etapa 3 (`POST /api/telemetry/mitigate`) registra que ese nodo ya fue contenido por el operador (`mitigated_by_soc = True`), reduce su entropía a $\Omega = 0.095$ (`GREEN`), enfría el promedio móvil global y añade el registro de auditoría en la cronología forense del evento.

---

## 4. LOS 7 FRENTES ESTRATÉGICOS Y LAS 15 FUENTES OFICIALES EN VIVO

El módulo [`backend/live_osint.py`](./backend/live_osint.py) clasifica cada evento en uno de los **7 Frentes Estratégicos**:

| ID del Frente | Nombre en el Dashboard | Fuentes Oficiales Conectadas en Tiempo Real | Qué Monitorea |
| :--- | :--- | :--- | :--- |
| **`CYBER_WARFARE`** | **Ciberdefensa & Ransomware** | 1. **Ransomware.live API** (`/v2/recentvictims`)<br>2. **abuse.ch Feodo Tracker** (`ipblocklist_recommended.json`)<br>3. **CISA KEV Catalog** (`cisa.gov`)<br>4. **The Hacker News RSS**<br>5. **SANS Internet Storm Center (ISC)** | Víctimas reales de ransomware del día (empresa, grupo atacante, sector y país), servidores Botnet C2 activos (`QakBot`, `Emotet`, `Pikabot`), vulnerabilidades Zero-Day explotadas y alertas de paquetes DShield. |
| **`INFRASTRUCTURE_CLOUD`** | **Infraestructura & Cloud** | 6. **Cloudflare Global Status API** (`/api/v2/incidents.json`)<br>7. **GitHub Cloud Status API** (`/api/v2/incidents.json`) | Caídas e incidentes reales en nodos CDN/Edge globales, enrutamiento BGP Anycast, DNS-over-TLS y servicios cloud críticos. |
| **`GEOPOLITICAL_CONFLICT`** | **Geopolítica & Conflictos** | 8. **BBC World News RSS**<br>9. **Al Jazeera English Global RSS**<br>10. **UN Security & Global News (ONU)**<br>11. **BBC Mundo (América Latina) RSS** | Conflictos armados, tensiones diplomáticas, seguridad marítima y eventos críticos con cobertura multipolar (Europa, Medio Oriente, Asia, África y **Latinoamérica**). |
| **`GEOPHYSICAL_CLIMATE`** | **Geofísica, Sismos & ONU** | 12. **GDACS (ONU + Comisión Europea GeoRSS)**<br>13. **USGS Earthquake API** (`4.5_day.geojson`)<br>14. **NASA EONET v3 API** (`eonet.gsfc.nasa.gov`) | Alertas multi-riesgo oficiales de la ONU/UE (`Red`/`Orange`/`Green`), terremotos globales $M \ge 4.5$, ciclones tropicales, erupciones volcánicas e incendios forestales con coordenadas satelitales exactas. |
| **`SPACE_WEATHER_GRID`** | **Clima Espacial & Red** | 15. **NOAA Space Weather Prediction Center (SWPC)** (`services.swpc.noaa.gov/products/alerts.json`) | Tormentas geomagnéticas, índice planetario $K_p$, flujo de electrones relativistas y alertas de impacto sobre satélites, GPS y redes eléctricas de alta latitud. |
| **`FINANCIAL_MACRO`** | **Mercados & Energía** | 16. **CNBC Global Economy & Markets RSS** | Disrupciones macroeconómicas, shocks de liquidez, tasas de interés, deuda soberana, energía y cadenas de suministro. |
| **`BIO_HUMANITARIAN`** | **Bioseguridad & OMS** | 17. **Organización Mundial de la Salud (WHO/OMS Official RSS)** | Brotes epidemiológicos oficiales, alertas sanitarias internacionales y emergencias biológicas/humanitarias. |

---

## 5. FUNCIONAMIENTO DETALLADO DEL FRONTEND (LOS 6 MÓDULOS DEL DASHBOARD)

La interfaz en `frontend/src/` está construida con **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **d3-geo**, **topojson-client**, **Recharts** y **Lucide React**:

### 1. Cabecera de Estado de Red (`NetworkStatusHeader.tsx`)
* Muestra el indicador gigante del **Nivel de Amenaza Global (`GREEN`, `YELLOW`, `RED`)** junto con la directiva de mitigación activa.
* Indica el estado del enlace WebSocket (`WS LINK: ONLINE`), la latencia real $R_{tt}$ en milisegundos, el número de nodos activos y el reloj `UTC` en tiempo real.
* Incluye el botón **`AUDIO ON / MUTED`** (sintetizador `Web Audio API` que emite alertas acústicas cuando el sistema escala a `YELLOW` o `RED`), el botón **`PAUSE / RESUME STREAM`** y el botón **`FORCE SPIKE`**.

### 2. Matriz Cuantitativa de Telemetría (`SystemMatrixStats.tsx`)
* Cuatro medidores numéricos de alta precisión con barras de progreso para:
  * **`CURRENT OMEGA (Ω)`:** Entropía del último evento procesado.
  * **`MOVING AVG (10-PT)`:** Promedio móvil que determina el estado global.
  * **`SOCIAL FRICTION (SF)`:** Índice de hostilidad/pánico actual.
  * **`STRUCTURAL INERTIA (SI)`:** Índice de impacto infraestructural actual.

### 3. Cartografía Global de Entropía y Dossier Forense Acoplado (`GlobalThreatMap.tsx`)
* **Mapa Vectorial Real (`Natural Earth 110m` + `d3-geo`):**
  * Renderiza con precisión cartográfica los **177 países soberanos**, fronteras internas, retícula esférica de meridianos/paralelos cada $10^\circ$ y enlaces troncales geodésicos submarinos.
  * Permite alternar en tiempo real entre proyección **Natural Earth I** y **WGS-84 Equirectangular Plana**, además de ofrecer controles de **Zoom (`+`/`-`) y Paneo (`Drag`)**.
  * Colorea dinámicamente el territorio de los países que registran incidentes activos según su nivel de amenaza (`RED`, `YELLOW`, `GREEN`).
* **Barra de Filtros por Severidad y por los 7 Frentes Estratégicos:**
  * Permite filtrar las balizas del mapa y las tarjetas inferiores por nivel de alerta (`RED`, `YELLOW`, `GREEN`) y por cualquiera de los **7 Frentes Estratégicos**, mostrando el conteo en vivo de nodos en cada frente.
  * Incluye el botón **`SYNC 15 FUENTES EN VIVO`** para forzar una actualización inmediata desde las APIs oficiales.
* **Dossier Forense Acoplado (Panel Derecho — 5 Columnas):**
  * Al hacer clic en cualquier baliza del mapa o tarjeta inferior, fija ese nodo y muestra instantáneamente:
    * Coordenadas GPS exactas (`lat, lng`), ciudad, país e instalación.
    * Protocolo técnico, ASN/Sector afectado y radio estimado de impacto en km.
    * Barras de descomposición de entropía ($\Omega$, $SF$, $SI$).
    * **Captura Técnica del Sensor (`raw_evidence`)** con botón para copiar al portapapeles, etiquetas de entidades involucradas y el botón **`VERIFICAR FUENTE EN VIVO ↗`** que abre la URL oficial del suceso en una pestaña nueva.
    * **Cronología Forense (`timeline`)** paso a paso.
    * Botón **`AISLAR NODO (PROTOCOLO WU-WEI)`** para mitigar el nodo en tiempo real, botón **`JSON`** para descargar el expediente forense y botón **`DETALLES`** para abrir el modal a pantalla completa.
* **Directorio Geográfico Inferior (Orden Fijo Oeste $\to$ Este):**
  * Muestra las tarjetas de todos los nodos activos ordenadas de forma fija por longitud geográfica (de Oeste a Este) para que las tarjetas nunca salten ni cambien de lugar mientras el usuario interactúa con ellas.

### 4. Modal de Expediente Forense en Pantalla Completa (`ForensicEvidenceModal.tsx`)
* Vista ampliada de auditoría forense con huella criptográfica `SHA-256`, enlace directo verificable a la fuente oficial, exportación del expediente en `.json` y ejecución del aislamiento Wu-Wei.

### 5. Gráfico Multiserie en Tiempo Real (`TelemetryGraphs.tsx`)
* Gráfico dinámico en `Recharts` que traza en vivo las 4 series temporales (`omega_index`, `moving_avg`, `social_friction`, `structural_inertia`), con líneas de umbral en $\Omega = 0.40$ y $\Omega = 0.70$ y selector de ventana histórica (`15`, `30` o `45` muestras).

### 6. Terminal de Inyecciones Mitigadas (`MitigatedInjectionsLog.tsx`) e Inyector SOC (`ManualInjectionPanel.tsx`)
* **Terminal `/dev/pts/syntergic_ids.log`:** Consola con estética Unix que lista cada evento recibido, su desglose `[SF | SI | Ω]` y la acción ejecutada. Cuenta con buscador `grep` en tiempo real, filtro por severidad y pausa de *auto-scroll* (`TAIL -F`). Hacer clic en cualquier línea del log selecciona ese nodo en el mapa global.
* **Inyector Táctico SOC:** Permite disparar escenarios de prueba o inyectar un titular personalizado seleccionando la ciudad/instalación objetivo para evaluar la respuesta del sistema.

---

## 6. EJECUCIÓN AUTÓNOMA EN LA NUBE (GITHUB ACTIONS + TELEGRAM ZERO-COST)

Al igual que el pipeline *Ghost Process*, este repositorio incluye un motor autónomo **100% gratuito en la nube** ([`backend/cloud_sentinel.py`](./backend/cloud_sentinel.py) y [`.github/workflows/syntergic_cloud_sentinel.yml`](./.github/workflows/syntergic_cloud_sentinel.yml)) que se ejecuta sobre **GitHub Actions** sin necesidad de pagar servidores 24/7:

### Cómo Funciona el Pipeline Cloud (`syntergic_cloud_sentinel.yml`)
1. **Job 1 — `sentinel` (Cada 4 horas: `0 */4 * * *` + Ejecución Manual):**
   * Escanea en paralelo las **15 fuentes oficiales en los 7 Frentes Estratégicos**.
   * Calcula el Promedio Móvil Global ($\bar{\Omega}$) y filtra los incidentes críticos (`RED` / $\Omega > 0.70$).
   * Utiliza `actions/cache@v4` (`backend/.cache/sentinel_seen_hashes.json`) para recordar las huellas `SHA-256` ya notificadas y **enviar a Telegram únicamente los picos críticos nuevos**, evitando alertas duplicadas.
2. **Job 2 — `digest` (Diario a las `10:00 UTC` + Ejecución Manual):**
   * Envía a Telegram el **Panorama Global Consolidado en 7 Frentes**, con el estado por frente estratégico (`CYBER`, `CLOUD`, `GEOPOL`, `GEOPHYS`, `SPACE`, `MACRO`, `BIO`), el conteo de nodos (`RED`/`YELLOW`/`GREEN`) y el Top 6 de focos de mayor entropía con enlaces verificables.

### Configurar tus Secrets en GitHub Actions
1. En tu repositorio de GitHub, ve a **Settings ➔ Secrets and variables ➔ Actions ➔ New repository secret**.
2. Registra estos 2 secretos:
   * `TELEGRAM_BOT_TOKEN`: El token de tu bot entregado por `@BotFather` (ej. `1234567890:AAH...`).
   * `TELEGRAM_CHAT_ID`: El ID de tu canal, grupo o chat personal de Telegram (ej. `-1001234567890`).
3. Para probarlo inmediatamente desde la nube, ve a la pestaña **Actions ➔ Syntergic EWS Cloud Sentinel & Telegram Alerting ➔ Run workflow**, elige `both` y presiona **Run workflow**.

### Probar el Cloud Sentinel desde tu Terminal Local
```powershell
# Modo Dry-Run (sin enviar a Telegram, imprime el reporte en consola):
python backend/cloud_sentinel.py --mode both --dry-run

# Envío real a Telegram (lee TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID desde tu archivo .env):
python backend/cloud_sentinel.py --mode both --force-notify
```

---

## 7. CÓMO CLONAR Y EJECUTAR EL PROYECTO (WINDOWS, LINUX, MACOS Y DOCKER)

Cualquier persona puede clonar este repositorio y levantarlo en pocos minutos. Los scripts de inicio **crean automáticamente el entorno virtual de Python (`venv`) e instalan las dependencias de `npm`** la primera vez que se ejecutan.

### Paso 1: Clonar el Repositorio y Configurar `.env`
```bash
git clone https://github.com/phobetor-ops/Syntergic-Telemetry-Dashboard.git
cd Syntergic-Telemetry-Dashboard
cp .env.example .env
# (Opcional) Edita .env con tu TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID
```

### Paso 2: Iniciar el Cluster Localmente

#### En Windows (PowerShell):
```powershell
# Instala dependencias automáticamente en el primer uso y levanta Backend (8000) + Frontend (3000):
.\start-cluster.ps1

# Para detener ambos servidores:
.\stop-cluster.ps1
```

#### En Linux / macOS (Bash):
```bash
chmod +x start-cluster.sh
./start-cluster.sh
```

#### Con Docker Compose (Multiplataforma):
```bash
docker compose up --build -d
```

### Accesos Locales:
* **Dashboard SOC (Frontend):** [http://localhost:3000](http://localhost:3000)
* **Servidor API & WebSockets (Backend):** [http://localhost:8000](http://localhost:8000)
* **Documentación Interactiva OpenAPI (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 8. REFERENCIA DE ENDPOINTS REST Y WEBSOCKETS

| Método | Ruta | Descripción |
| :---: | :--- | :--- |
| `GET` | `/health` | Estado de salud del servidor, conexión Redis, clientes WebSocket activos y total de eventos procesados. |
| `GET` | `/api/status` | Devuelve el estado global actual (`GREEN`, `YELLOW`, `RED`), $\Omega$ actual, promedio móvil $\bar{\Omega}$ y directiva activa. |
| `GET` | `/api/telemetry/hotspots` | Devuelve la lista completa de nodos globales activos (~80–90 nodos en vivo) con sus coordenadas `geo` y dossier `evidence`. |
| `GET` | `/api/telemetry/history?limit=100` | Devuelve el historial reciente de eventos procesados. |
| `POST` | `/api/telemetry/sync-live` | Fuerza una resincronización inmediata en paralelo contra las 15 fuentes oficiales de internet en los 7 Frentes Estratégicos. |
| `POST` | `/api/telemetry/telegram-dispatch` | Envía bajo demanda el reporte de los 7 Frentes Estratégicos (`?mode=digest` o `?mode=sentinel`) al canal de Telegram configurado. |
| `POST` | `/api/telemetry/inject` | Permite inyectar un evento manual o forzar un pico crítico (`force_spike: true`) en una ciudad/instalación específica. |
| `POST` | `/api/telemetry/mitigate` | Ejecuta el **Protocolo Wu-Wei de Aislamiento** sobre un evento/instalación (`event_id`, `facility`), reduciendo su entropía a `0.095` (`GREEN`). |
| `WS` | `/ws/telemetry` | Túnel WebSocket bidireccional que envía `INITIAL_SNAPSHOT` al conectar, `TELEMETRY_UPDATE` en cada evento y responde a `PING` / `TRIGGER_SPIKE`. |

---

## 9. ESTRUCTURA DEL PROYECTO

```text
Syntergic-Telemetry-Dashboard/
├── .github/
│   └── workflows/
│       └── syntergic_cloud_sentinel.yml # Pipeline autónomo gratuito en GitHub Actions (Cron 4h + Digest diario)
├── start-cluster.ps1                 # Auto-setup y lanzador para Windows PowerShell
├── stop-cluster.ps1                  # Script PowerShell para detener los servidores (puertos 8000 y 3000)
├── start-cluster.sh                  # Auto-setup y lanzador para Linux / macOS
├── docker-compose.yml                # Orquestación Docker (Redis, Backend, Celery, Frontend)
├── render.yaml                       # Blueprint para despliegue web gratuito en Render.com
├── .env.example                      # Plantilla de variables de entorno (Telegram Bot Token / Chat ID)
├── README.md                         # Documentación técnica y operativa completa
│
├── backend/
│   ├── main.py                       # Etapa 3: Zero-Trust Dispatcher, API REST, Mitigación Wu-Wei y WebSocket Hub
│   ├── live_osint.py                 # Etapa 1: Conector paralelo en vivo a 15 fuentes oficiales en 7 Frentes Estratégicos
│   ├── tasks.py                      # Etapa 2: Motor Logos (cálculo de SF, SI e Índice Omega) y tareas Celery
│   ├── cloud_sentinel.py             # Ejecutor autónomo Cloud/CLI con deduplicación SHA-256 y alertas Telegram
│   ├── telegram_notifier.py          # Cliente Telegram Bot API con chunking y formateo HTML de 7 Frentes
│   ├── mock_feeds.py                 # Pool híbrido con prioridad al catálogo en vivo y respaldo offline
│   ├── models.py                     # Esquemas Pydantic (TelemetryRecord, GeoLocation, ForensicEvidence, SystemState)
│   ├── config.py                     # Umbrales de entropía (0.40 / 0.70) y configuración de entorno
│   ├── celery_app.py                 # Configuración de Celery y Redis
│   └── requirements.txt              # Dependencias Python (FastAPI, Uvicorn, Celery, Redis, Requests, Pydantic)
│
└── frontend/
    ├── package.json                  # Next.js 14, React 18, d3-geo, topojson-client, world-atlas, Recharts, Lucide
    └── src/
        ├── data/
        │   └── world-110m.json       # Topología cartográfica oficial Natural Earth 110m (177 países)
        ├── types/
        │   └── telemetry.ts          # Interfaces TypeScript (TelemetryRecord, ForensicEvidence, StrategicFront)
        ├── hooks/
        │   └── useSyntergicSocket.ts # Hook de conexión WebSocket, audio Web-Synth, inyección y mitigación
        ├── components/
        │   ├── NetworkStatusHeader.tsx    # Cabecera de estado global, latencia RTT y controles maestros
        │   ├── SystemMatrixStats.tsx      # Medidores numéricos de Ω, Promedio Móvil, SF y SI
        │   ├── GlobalThreatMap.tsx        # Mapa mundial d3-geo, filtro de 7 frentes y Dossier Forense acoplado
        │   ├── ForensicEvidenceModal.tsx  # Expediente forense a pantalla completa y exportación JSON
        │   ├── TelemetryGraphs.tsx        # Gráfico temporal multiserie en vivo (Recharts)
        │   ├── MitigatedInjectionsLog.tsx # Consola Unix (/dev/pts/syntergic_ids.log) con búsqueda grep
        │   └── ManualInjectionPanel.tsx   # Inyector táctico SOC por ciudad/nodo
        └── app/
            ├── globals.css           # Estilos CRT/SOC y animaciones
            ├── layout.tsx            # Layout raíz
            └── page.tsx              # Vista principal del Syntergic Telemetry Dashboard
```
