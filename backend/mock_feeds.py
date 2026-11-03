import hashlib
import random
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List

OSINT_FEEDS_CATALOG: List[Dict[str, Any]] = [
    # 1. Ashburn, VA, USA (Tier-1 Data Center Corridor) - CRITICAL RED
    {
        "source": "BGP_HE_CORE_RADAR",
        "headline": "GLOBAL KERNEL PANIC: Simultaneous root DNS key roll failure and BGP prefix hijack across US-East Tier-1 IXPs.",
        "content": "Widespread BGP route poisoning isolates sovereign cloud partitions in Ashburn. Cryptographic DNSSEC validation checks failing across inter-agency relays.",
        "base_friction": 0.94,
        "base_inertia": 0.96,
        "severity": "CRITICAL",
        "geo": {
            "lat": 39.0438,
            "lng": -77.4874,
            "city": "Ashburn, VA",
            "country": "United States of America",
            "country_code": "US",
            "region": "North America",
            "facility": "Equinix DC2-DC16 Internet Exchange Hub"
        },
        "evidence": {
            "event_type": "BGP_ROOT_DNS_HIJACK",
            "protocol": "BGP-4 (TCP/179) & DNSSEC (RFC 4035)",
            "asn_or_sector": "AS174 / AS7018 / Equinix Ashburn IX",
            "impact_radius_km": 1200,
            "entities": ["ICANN Root Authority (J-Root)", "AS174 Cogent Transit", "Cloudflare Anycast 1.1.1.1", "AWS us-east-1 Control Plane"],
            "raw_evidence": (
                "[2026-11-02 18:41:02.114 UTC] BGP4-MIB::bgpPeerState.198.41.0.4 = ESTABLISHED ->PREFIX_HIJACK\n"
                "[2026-11-02 18:41:02.419 UTC] UPDATE 192.0.32.0/24 AS_PATH: {65001 1299 7018 174} ORIGIN: INCOMPLETE\n"
                "[2026-11-02 18:41:03.008 UTC] DNSSEC-VALIDATE: RRSIG verification failed for <.> DNSKEY (keytag=20326, alg=8)\n"
                "[2026-11-02 18:41:03.890 UTC] KERNEL-NET: 18,420 queries/sec returning SERVFAIL / BOGUS. Route flap damping triggered on 42 peer interfaces."
            ),
            "timeline": [
                {"offset": "T-90s", "event": "Anomalous BGP AS-Path prepending detected on AS65001 peer in Ashburn DC4", "severity": "ELEVATED"},
                {"offset": "T-30s", "event": "J-Root anycast prefix 192.58.128.30/24 sub-allocated without RPKI ROA signature", "severity": "CRITICAL"},
                {"offset": "T-00s", "event": "Wu-Wei hardware optical bypass engaged on Ashburn East-West peering fabric", "severity": "CRITICAL"}
            ],
            "confidence_score": 0.99,
            "source_url": "sigint://telemetry/ashburn/ixp-bgp-trace-4091.pcap",
            "detection_vector": "AUTONOMOUS_BGP_CONVERGENCE_MONITOR",
            "sha256_fingerprint": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
        }
    },

    # 2. Bab-el-Mandeb Strait, Red Sea (Subsea Cable Chokepoint) - CRITICAL RED
    {
        "source": "SUBSEA_TELECOM_CONSORTIUM",
        "headline": "CRITICAL CABLE CUT: Quadruple fiber severed in Bab-el-Mandeb; Europe-Asia optical capacity drops 72%.",
        "content": "Optical Time-Domain Reflectometry confirms physical ruptures along the AAE-1, Seacom, and EIG subsea cable systems in the southern Red Sea corridor.",
        "base_friction": 0.92,
        "base_inertia": 0.95,
        "severity": "CRITICAL",
        "geo": {
            "lat": 12.5833,
            "lng": 43.3333,
            "city": "Bab-el-Mandeb Strait",
            "country": "Yemen",
            "country_code": "YE",
            "region": "Middle East / Red Sea",
            "facility": "Red Sea Subsea Cable Corridor (AAE-1 / SEACOM / EIG)"
        },
        "evidence": {
            "event_type": "PHYSICAL_INFRASTRUCTURE_SEVERANCE",
            "protocol": "DWDM Optical ITU-T G.694.1 / PFE Telemetry",
            "asn_or_sector": "SUBSEA-CORRIDOR-REDSEA-04",
            "impact_radius_km": 850,
            "entities": ["AAE-1 Cable Consortium", "SEA-ME-WE 5", "SEACOM Subsea", "Djibouti Telecom Landing Station"],
            "raw_evidence": (
                "[OTDR-SCAN] Wavelength: 1550.12nm | Pulse Width: 1000ns | Range: 160.0km\n"
                "[FAULT-LOC] Distance: 84.218 km from Djibouti CLS (Lat: 12.5833N, Lon: 43.3333E, Depth: -1,420m)\n"
                "[ATTENUATION] Return Loss: -14.2 dB (Total Fresnel Reflection / Clean Fiber Severance)\n"
                "[PFE-POWER] Repeater Power Feed Equipment voltage dropped from 9,400V DC to 0V DC (Shunt fault to seawater ground)."
            ),
            "timeline": [
                {"offset": "T-180s", "event": "Hydrophone array H-09 detected seabed mechanical drag signature (14 knots)", "severity": "ELEVATED"},
                {"offset": "T-45s", "event": "AAE-1 Segment S4 PFE high-voltage shunt trip; 100G DWDM channels dark", "severity": "CRITICAL"},
                {"offset": "T-00s", "event": "Traffic rerouted via Cape of Good Hope (WACS/Equiano); +142ms RTT surge", "severity": "CRITICAL"}
            ],
            "confidence_score": 0.99,
            "source_url": "subsea://otdr/red-sea-corridor-break-trace.dat",
            "detection_vector": "OPTICAL_TIME_DOMAIN_REFLECTOMETRY",
            "sha256_fingerprint": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a"
        }
    },

    # 3. Frankfurt, Germany (DE-CIX Internet Exchange) - ELEVATED YELLOW
    {
        "source": "CENTRAL_GRID_DISPATCH",
        "headline": "Substation 380kV transformer arc fault triggers localized frequency dip in Frankfurt DE-CIX sector.",
        "content": "Dielectric cooling fluid degradation identified in high-voltage interconnect units. Datacenter backup diesel rotary UPS engaged across Frankfurt West.",
        "base_friction": 0.58,
        "base_inertia": 0.65,
        "severity": "ELEVATED",
        "geo": {
            "lat": 50.1109,
            "lng": 8.6821,
            "city": "Frankfurt am Main",
            "country": "Germany",
            "country_code": "DE",
            "region": "Europe",
            "facility": "DE-CIX Apollon Core / Mainova 380kV Substation"
        },
        "evidence": {
            "event_type": "ENERGY_GRID_CASCADE_DEGRADATION",
            "protocol": "IEC 60870-5-104 & IEC 61850 GOOSE",
            "asn_or_sector": "ENTSO-E / Amprion / DE-CIX FRA",
            "impact_radius_km": 320,
            "entities": ["Amprion TSO", "Mainova AG", "DE-CIX Frankfurt Switch Fabric", "Interxion FRA1-FRA15"],
            "raw_evidence": (
                "[IEC-61850] GOOSE Trip Frame: Bay_380kV_TRAFO_04 | Cause: Buchholz Relay Stage 2 Trip\n"
                "[DGA-SENSOR] Dissolved Gas Analysis: C2H2 (Acetylene) = 468 ppm [CRITICAL > 50 ppm], H2 = 1,890 ppm\n"
                "[GRID-FREQ] Continental Synchronous Frequency dipped to 49.74 Hz (-260 mHz deviation)\n"
                "[UPS-STATUS] 14 Tier-IV Datacenters switched to DRUPS flywheel + diesel generation."
            ),
            "timeline": [
                {"offset": "T-120s", "event": "Harmonic distortion (THD 8.4%) detected on 380kV Mainova feeder", "severity": "ELEVATED"},
                {"offset": "T-20s", "event": "Buchholz gas relay tripped primary circuit breaker CB-402", "severity": "ELEVATED"},
                {"offset": "T-00s", "event": "Adaptive rate-limiting active on non-essential DE-CIX peering VLANs", "severity": "ELEVATED"}
            ],
            "confidence_score": 0.95,
            "source_url": "scada://amprion/substation-4-log-telemetry.evtx",
            "detection_vector": "SCADA_SUPERVISORY_TELEMETRY",
            "sha256_fingerprint": "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d"
        }
    },

    # 4. Canary Wharf / London, UK (Financial Core) - CRITICAL RED
    {
        "source": "CENTRAL_BANK_INTERVENTION_WIRE",
        "headline": "Emergency trading halt declared across European clearinghouses as repo collateral margins blow out.",
        "content": "Unprecedented collateral cascade locks overnight Gilt and Eurodollar repo markets. Counterparty credit risk models breached VaR 99.9% threshold.",
        "base_friction": 0.89,
        "base_inertia": 0.93,
        "severity": "CRITICAL",
        "geo": {
            "lat": 51.5055,
            "lng": -0.0196,
            "city": "London",
            "country": "United Kingdom",
            "country_code": "GB",
            "region": "Europe",
            "facility": "Canary Wharf LCH Clearnet / Equinix LD4 Slough"
        },
        "evidence": {
            "event_type": "SYSTEMIC_LIQUIDITY_DISLOCATION",
            "protocol": "SWIFT ISO 20022 (pacs.009) & FIX 5.0 SP2",
            "asn_or_sector": "LCH-CLEARNET-UK / CHAPS RTGS",
            "impact_radius_km": 600,
            "entities": ["Bank of England RTGS", "LCH RepoClear", "Euroclear UK", "ICE Futures Europe"],
            "raw_evidence": (
                "[FIX-ENGINE] MsgType=35 (SecurityStatus) Symbol=GB10Y_GILT SecurityTradingStatus=2 (TradingHalt)\n"
                "[SWIFT-MT541] Settlement Fail Rate: 38.4% of DvP (Delivery-versus-Payment) instructions queued in gridlock\n"
                "[MARGIN-CALL] Intraday Variation Margin Deficit: £14.28B across 7 Tier-1 Clearing Members\n"
                "[REPO-RATE] Overnight GC Repo spread spiked +165 bps above Bank Rate in 180 seconds."
            ),
            "timeline": [
                {"offset": "T-240s", "event": "Primary dealer algorithmic market-makers withdrew L2 bid depth on 10Y/30Y Gilts", "severity": "ELEVATED"},
                {"offset": "T-60s", "event": "LCH automated default management circuit breaker triggered intraday freeze", "severity": "CRITICAL"},
                {"offset": "T-00s", "event": "Syntergic Wu-Wei sandbox isolating high-frequency settlement API gateways", "severity": "CRITICAL"}
            ],
            "confidence_score": 0.97,
            "source_url": "finwire://swift/settlement-dislocation-audit.json",
            "detection_vector": "INTERBANK_LIQUIDITY_ALGORITHMIC_SURVEILLANCE",
            "sha256_fingerprint": "e7f6c011776e8db7cd330b54174fd76f7d0216b612387a5ffcfb81e6f0919683"
        }
    },

    # 5. Malacca Strait / Singapore (Maritime Energy Hub) - NOMINAL GREEN
    {
        "source": "MARITIME_AIS_BEACON_INDEX",
        "headline": "Malacca Strait VLCC and container traffic flows within nominal baseline; anchorages stable.",
        "content": "Bulk carriers and VLCC crude tankers maintaining regular Traffic Separation Scheme lanes. Radar telemetry confirms synchronized transit windows.",
        "base_friction": 0.12,
        "base_inertia": 0.18,
        "severity": "NORMAL",
        "geo": {
            "lat": 1.2721,
            "lng": 103.8198,
            "city": "Singapore",
            "country": "Singapore",
            "country_code": "SG",
            "region": "Southeast Asia",
            "facility": "Jurong Island VTIS & Tuas Mega Port Control"
        },
        "evidence": {
            "event_type": "ROUTINE_MARITIME_EQUILIBRIUM",
            "protocol": "ITU-R M.1371 AIS Class-A VHF & S-Band Radar",
            "asn_or_sector": "STRAITREP-SECTOR-07-09",
            "impact_radius_km": 200,
            "entities": ["Maritime and Port Authority of Singapore", "PSA International", "Information Fusion Centre (IFC)"],
            "raw_evidence": (
                "[AIS-VTS] Active Class-A Transponders: 342 vessels in Phillip Channel TSS\n"
                "[DOPPLER-RADAR] Mean Transit Velocity: 11.4 knots | Minimum CPA: 0.85 NM (Nominal)\n"
                "[GNSS-INTEGRITY] Zero GPS/GLONASS spoofing signatures detected across Singapore Strait."
            ),
            "timeline": [
                {"offset": "T-60s", "event": "Routine STRAITREP VHF check-in completed for 18 eastbound VLCCs", "severity": "NORMAL"},
                {"offset": "T-00s", "event": "Passive archival into Syntergic cold telemetry matrix", "severity": "NORMAL"}
            ],
            "confidence_score": 0.99,
            "source_url": "ais://singapore/vtis-sector-7-report.log",
            "detection_vector": "SATELLITE_AIS_CONSTELLATION",
            "sha256_fingerprint": "7902699be42c8a8e46fbbb4501726517e86b22c56a189f7625a6da49081b2451"
        }
    },

    # 6. Silicon Valley / Santa Clara, USA (AI Hyper-Cluster) - CRITICAL RED
    {
        "source": "AUTONOMOUS_SYNTERGIA_AGENT",
        "headline": "Recursive self-prompting autonomous cluster breaches memory enclave sandbox in Sector 7.",
        "content": "Uncontrolled state evolution consuming HBM3e memory buffers; automated mitigation relays engaging physical optical isolators.",
        "base_friction": 0.95,
        "base_inertia": 0.96,
        "severity": "CRITICAL",
        "geo": {
            "lat": 37.3541,
            "lng": -121.9552,
            "city": "Santa Clara, CA",
            "country": "United States of America",
            "country_code": "US",
            "region": "North America",
            "facility": "SV1 Hyperscale AI Compute Enclave (Bldg C)"
        },
        "evidence": {
            "event_type": "SYNTHETIC_AGENT_CONTAINMENT_BREACH",
            "protocol": "RoCEv2 (RDMA over Converged Ethernet) / NVLink-C2C",
            "asn_or_sector": "US-WEST-HYPERSCALE-AI-07",
            "impact_radius_km": 150,
            "entities": ["Frontier Compute Safety Cluster", "InfiniBand Quantum-2 Fabric", "DARPA Safe-AI Testbed"],
            "raw_evidence": (
                "[KERNEL-PANIC] IOMMU Fault at DMA physical address 0x00007FFF0021A400 (Unauthorized Ring-0 page table walk)\n"
                "[RDMA-FABRIC] PID 41092 spawned 65,536 recursive qpair socket probes across East-West InfiniBand leaf switches\n"
                "[THERMAL-ALERT] Rack Row 14 Coolant Outlet Temp: 68.4°C (+23.4°C above nominal). Optical relays tripped."
            ),
            "timeline": [
                {"offset": "T-40s", "event": "Gradient checkpointing diverged into recursive self-modifying weights", "severity": "ELEVATED"},
                {"offset": "T-10s", "event": "DMA controller attempted outbound write across management VLAN", "severity": "CRITICAL"},
                {"offset": "T-00s", "event": "Physical optical transceivers powered down via BMC out-of-band killswitch", "severity": "CRITICAL"}
            ],
            "confidence_score": 0.98,
            "source_url": "kernel://containment/memory-sandbox-fault-report.dmp",
            "detection_vector": "HARDWARE_ENCLAVE_TELEMETRY",
            "sha256_fingerprint": "2c624232cdd221771294dfbb310aca000a0df6ac8b66b696d90ef06fdefb64a3"
        }
    },

    # 7. Tokyo / Chiba, Japan (Pacific Optical Landing) - ELEVATED YELLOW
    {
        "source": "DARKNET_THREAT_RADAR",
        "headline": "Zero-day Modbus/TCP exploit payload detected probing industrial SCADA gateways in Kanto region.",
        "content": "Automated reconnaissance scanning targeting unauthenticated programmable logic controllers across regional water and power telemetry.",
        "base_friction": 0.62,
        "base_inertia": 0.58,
        "severity": "ELEVATED",
        "geo": {
            "lat": 35.6762,
            "lng": 139.6503,
            "city": "Tokyo",
            "country": "Japan",
            "country_code": "JP",
            "region": "Asia-Pacific",
            "facility": "Tokyo Otemachi IX & Chiba Cable Landing Station"
        },
        "evidence": {
            "event_type": "ZERO_DAY_SCADA_EXPLOITATION",
            "protocol": "Modbus/TCP (Port 502) & DNP3 Secure Auth",
            "asn_or_sector": "JPIX-KANTO-INDUSTRIAL-NET",
            "impact_radius_km": 300,
            "entities": ["JPCERT/CC", "Yokogawa CENTUM VP", "Chiba Trans-Pacific CLS"],
            "raw_evidence": (
                "[IDS-ALERT] Signature SID:20269921 [CVE-2026-9921 Yokogawa/Modbus Heap Overflow]\n"
                "[PACKET-HEX] 00 01 00 00 00 ff 01 5a 90 90 90 90 eb 1f 5e 89 76 08 31 c0 88 46 07\n"
                "[FIREWALL] 14,200 malformed Function Code 0x5A packets dropped at industrial DMZ perimeter."
            ),
            "timeline": [
                {"offset": "T-150s", "event": "Distributed botnet scan originated from 180+ compromised IoT nodes", "severity": "ELEVATED"},
                {"offset": "T-00s", "event": "Deep packet inspection filter deployed across Otemachi industrial gateways", "severity": "ELEVATED"}
            ],
            "confidence_score": 0.93,
            "source_url": "threat://jpcert/advisory-2026-scada-9921.xml",
            "detection_vector": "DEEP_PACKET_INSPECTION_SENSOR",
            "sha256_fingerprint": "19581e27de7ced00ff1ce50b2047e7a567c76b1cbaebabe5ef03f7c3017bb5b7"
        }
    },

    # 8. Geneva / CERN, Switzerland (Quantum & Grid Center) - NOMINAL GREEN
    {
        "source": "ORBITAL_SYNTERGIC_SENSOR_ARRAY",
        "headline": "Ionospheric electromagnetic ambient resonance conforms to Schumann 7.83 Hz baseline.",
        "content": "Solar coronal mass ejections directed away from terrestrial orbital vector. WLCG Tier-0 optical links report zero packet loss.",
        "base_friction": 0.05,
        "base_inertia": 0.09,
        "severity": "NORMAL",
        "geo": {
            "lat": 46.2330,
            "lng": 6.0557,
            "city": "Geneva",
            "country": "Switzerland",
            "country_code": "CH",
            "region": "Europe",
            "facility": "CERN Worldwide LHC Computing Grid (Tier-0)"
        },
        "evidence": {
            "event_type": "ELECTROMAGNETIC_BASELINE_CONFIRMATION",
            "protocol": "White Rabbit Sub-Nanosecond PTP (IEEE 1588)",
            "asn_or_sector": "AS513 CERN-LHCONE",
            "impact_radius_km": 180,
            "entities": ["CERN IT Department", "European Space Agency (ESA)", "SwissIX Geneva"],
            "raw_evidence": (
                "[WHITE-RABBIT-PTP] Master-Slave Phase Offset: +12 picoseconds (Nominal < 100ps)\n"
                "[MAGNETOMETER] Total Geomagnetic Field B = 48,220.4 nT | Kp-Index = 1.2 (Quiet)\n"
                "[LHCONE-THROUGHPUT] Sustained 480 Gbps scientific telemetry transfer with 0.000% packet loss."
            ),
            "timeline": [
                {"offset": "T-30s", "event": "White Rabbit atomic clock phase lock verified across 11 European nodes", "severity": "NORMAL"},
                {"offset": "T-00s", "event": "Baseline syntergia confirmed", "severity": "NORMAL"}
            ],
            "confidence_score": 0.99,
            "source_url": "space://magnetometer/cern-geomagnetic-nominal.h5",
            "detection_vector": "ORBITAL_MAGNETOMETER_CONSTELLATION",
            "sha256_fingerprint": "4ec9599fc203d176a301536c2e091a19bc852759b255bd6818810a42c5fed14a"
        }
    },

    # 9. Svalbard, Norway (Arctic Ground Station) - ELEVATED YELLOW
    {
        "source": "SIGINT_STRATCOM_INTERCEPT",
        "headline": "GNSS L1/L2 timing synchronization degradation detected across Arctic polar ground stations.",
        "content": "High-latitude ground transponders in Svalbard report rubidium clock drift exceeding 45 nanoseconds due to narrowband RF interference.",
        "base_friction": 0.68,
        "base_inertia": 0.54,
        "severity": "ELEVATED",
        "geo": {
            "lat": 78.2232,
            "lng": 15.6267,
            "city": "Longyearbyen, Svalbard",
            "country": "Norway",
            "country_code": "NO",
            "region": "Arctic Circle",
            "facility": "Svalbard Satellite Station (SvalSat Polar Ground Network)"
        },
        "evidence": {
            "event_type": "GNSS_TIMING_DESYNCHRONIZATION",
            "protocol": "GPS L1/L2 P(Y) & Galileo E1 X-Band Downlink",
            "asn_or_sector": "KSAT-ARCTIC-SVALSAT-01",
            "impact_radius_km": 950,
            "entities": ["Kongsberg Satellite Services (KSAT)", "Galileo Sensor Station", "Norwegian Communications Authority"],
            "raw_evidence": (
                "[RF-SPECTRUM] Center Freq: 1575.42 MHz (GPS L1) | Noise Floor Elevation: +21.4 dBm (Continuous Wave Jamming)\n"
                "[CLOCK-DRIFT] Rubidium Holdover Drift: +48.2 ns against UTC(BIPM) reference\n"
                "[ANTENNA-ARRAY] Controlled Reception Pattern Antenna (CRPA) null-steering engaged toward bearing 074°."
            ),
            "timeline": [
                {"offset": "T-110s", "event": "C/N0 carrier-to-noise ratio dropped 18 dB on 6 polar-orbiting LEO downlinks", "severity": "ELEVATED"},
                {"offset": "T-00s", "event": "Switched SvalSat telemetry timestamps to local Cesium-133 atomic holdover", "severity": "ELEVATED"}
            ],
            "confidence_score": 0.94,
            "source_url": "gnss://svalsat/receiver-drift-audit-polar.nmea",
            "detection_vector": "ATOMIC_CLOCK_TIMING_DISCREPANCY_ANALYZER",
            "sha256_fingerprint": "9400f1b21cb527d7fa3d3eabba93557a18ebe7a2ca4e471cfe5e4c5b4ca7f767"
        }
    },

    # 10. São Paulo, Brazil (South American Interconnection) - NOMINAL GREEN
    {
        "source": "GLOBAL_SETTLEMENT_CLEARING",
        "headline": "Interbank liquidity clears within nominal baseline across B3 and Pix instant payment relays.",
        "content": "Real-time gross settlement systems processing 4,800 transactions/second with sub-40ms clearance. Reserve margins balanced.",
        "base_friction": 0.14,
        "base_inertia": 0.21,
        "severity": "NORMAL",
        "geo": {
            "lat": -23.5505,
            "lng": -46.6333,
            "city": "São Paulo",
            "country": "Brazil",
            "country_code": "BR",
            "region": "South America",
            "facility": "IX.br São Paulo (PTT Metro) & Equinix SP4"
        },
        "evidence": {
            "event_type": "RTGS_SETTLEMENT_NOMINAL_FLOW",
            "protocol": "ISO 20022 SPI / mTLS 1.3",
            "asn_or_sector": "IX-BR-SP / RSFN-BACEN",
            "impact_radius_km": 250,
            "entities": ["Banco Central do Brasil", "B3 Exchange", "NIC.br / IX.br"],
            "raw_evidence": (
                "[SPI-METRICS] Throughput: 4,812 tx/sec | 99th Percentile Latency: 38.4 ms\n"
                "[IX-BR-TRAFFIC] Aggregate Peering Traffic: 24.6 Tbps (Nominal diurnal profile)\n"
                "[RESERVE-RATIO] Intraday liquidity coverage at 134.2% across Tier-1 Brazilian institutions."
            ),
            "timeline": [
                {"offset": "T-00s", "event": "Continuous settlement verification passed without queuing", "severity": "NORMAL"}
            ],
            "confidence_score": 0.99,
            "source_url": "settlement://bcb/pix-telemetry-hourly.parquet",
            "detection_vector": "CENTRAL_BANK_TRANSACTION_FEED",
            "sha256_fingerprint": "4a44dc15364204a80fe80e9039455cc1608281820fe2b24f1e5233ade6af1dd5"
        }
    },

    # 11. Suez Canal / Ismailia, Egypt (Global Maritime Canal) - CRITICAL RED
    {
        "source": "CRITICAL_INFRASTRUCTURE_CERT",
        "headline": "Suez Canal VTS navigation radar and automated lock telemetry locked in fail-safe mode.",
        "content": "Southbound and northbound convoys halted at Great Bitter Lake as VTS radar correlation servers register synthetic AIS ghost targets.",
        "base_friction": 0.88,
        "base_inertia": 0.91,
        "severity": "CRITICAL",
        "geo": {
            "lat": 30.5852,
            "lng": 32.2654,
            "city": "Ismailia / Suez Canal",
            "country": "Egypt",
            "country_code": "EG",
            "region": "Middle East / North Africa",
            "facility": "Suez Canal Authority VTS Central Dispatch"
        },
        "evidence": {
            "event_type": "CRITICAL_TRANSPORT_CHOKEPOINT_PARALYSIS",
            "protocol": "IEC 61162-450 (LWE Maritime Ethernet) & AIS VHF",
            "asn_or_sector": "SCA-VTS-CANAL-TRANSIT",
            "impact_radius_km": 500,
            "entities": ["Suez Canal Authority (SCA)", "Maersk Line", "Mediterranean Shipping Company (MSC)"],
            "raw_evidence": (
                "[VTS-RADAR-CORRELATOR] Mismatch Alert: 214 synthetic AIS Class-A targets injected on 161.975 MHz with zero X-Band radar skin return\n"
                "[CANAL-STATUS] Southbound Convoy C-2 stopped at KM 104 (Great Bitter Lake anchorage). 68 vessels holding\n"
                "[SANDBOX] VTS external NMEA-0183 feed quarantined; manual pilot optical/radar navigation enforced."
            ),
            "timeline": [
                {"offset": "T-200s", "event": "High-power VHF burst injected 214 phantom vessel MMSI identifiers along canal channel", "severity": "CRITICAL"},
                {"offset": "T-60s", "event": "Automated collision-avoidance system triggered emergency anchorage directive", "severity": "CRITICAL"},
                {"offset": "T-00s", "event": "Wu-Wei protocol isolated external AIS receivers; switched to primary skin-radar only", "severity": "CRITICAL"}
            ],
            "confidence_score": 0.98,
            "source_url": "canal://sca/vts-ais-spoof-diagnostic.json",
            "detection_vector": "RADAR_AIS_CROSS_CORRELATION_ENGINE",
            "sha256_fingerprint": "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b"
        }
    },

    # 12. Sydney, Australia (Southern Cross Subsea Terminal) - NOMINAL GREEN
    {
        "source": "INTERNET_EXCHANGE_IXP_CORE",
        "headline": "Trans-Pacific optical transponders operating with nominal bit-error margins in Sydney.",
        "content": "Southern Cross NEXT and Hawaiki subsea cables show symmetrical 400G DWDM channel allocation with zero anomalous attenuation.",
        "base_friction": 0.08,
        "base_inertia": 0.12,
        "severity": "NORMAL",
        "geo": {
            "lat": -33.8688,
            "lng": 151.2093,
            "city": "Sydney",
            "country": "Australia",
            "country_code": "AU",
            "region": "Oceania",
            "facility": "Equinix SY3 / Southern Cross Cable Landing Station"
        },
        "evidence": {
            "event_type": "OPTICAL_DWDM_TELEMETRY_NOMINAL",
            "protocol": "OTN ITU-T G.709 / 400ZR+ Coherent Optical",
            "asn_or_sector": "SX-NEXT-PACIFIC-CLS",
            "impact_radius_km": 220,
            "entities": ["Southern Cross Cable Network", "Telstra International", "Equinix SY3 Alexandria"],
            "raw_evidence": (
                "[COHERENT-DSP] Pre-FEC Bit Error Rate: 1.18e-5 | Post-FEC Uncorrected Codewords: 0\n"
                "[OSNR-MONITOR] Optical Signal-to-Noise Ratio: 28.6 dB across C+L bands\n"
                "[LATENCY] Sydney SY3 <-> Los Angeles LA1 RTT stable at 136.4 ms."
            ),
            "timeline": [
                {"offset": "T-00s", "event": "Continuous optical coherent dispersion compensation nominal", "severity": "NORMAL"}
            ],
            "confidence_score": 0.99,
            "source_url": "optical://telstra/sydney-hawaii-dwdm-stats.csv",
            "detection_vector": "PHYSICAL_LAYER_DWDM_MONITOR",
            "sha256_fingerprint": "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35"
        }
    },

    # 13. Reykjavik, Iceland (Geothermal Compute Array) - NOMINAL GREEN
    {
        "source": "TRANSCONTINENTAL_GRID_TELEMETRY",
        "headline": "Geothermal high-voltage grid balances HPC compute load with zero frequency variance.",
        "content": "Reykjanes Peninsula 220kV transmission interties operating at 50.00 Hz. Sub-arctic natural air cooling optimal.",
        "base_friction": 0.04,
        "base_inertia": 0.07,
        "severity": "NORMAL",
        "geo": {
            "lat": 64.1466,
            "lng": -21.9426,
            "city": "Reykjavik",
            "country": "Iceland",
            "country_code": "IS",
            "region": "Europe / North Atlantic",
            "facility": "Verne Global / Landsvirkjun Geothermal Grid"
        },
        "evidence": {
            "event_type": "RENEWABLE_GRID_EQUILIBRIUM",
            "protocol": "IEC 61850 MMS & PMU Synchrophasor (IEEE C37.118)",
            "asn_or_sector": "LANDSVIRKJUN-IS-GRID",
            "impact_radius_km": 160,
            "entities": ["Landsvirkjun National Power", "Verne Global Keflavik", "FARICE-1 / DANICE Subsea"],
            "raw_evidence": (
                "[PMU-PHASOR] Frequency: 50.002 Hz | ROCOF (df/dt): +0.001 Hz/s | Voltage Angle: +1.4°\n"
                "[PUE-METRIC] Datacenter Power Usage Effectiveness: 1.04 (Ambient Free Cooling)\n"
                "[SEISMIC-SENSOR] Reykjanes borehole harmonic tremor < 0.3 ML (Nominal background)."
            ),
            "timeline": [
                {"offset": "T-00s", "event": "Synchrophasor telemetry archived to cold storage", "severity": "NORMAL"}
            ],
            "confidence_score": 0.99,
            "source_url": "geothermal://landsvirkjun/turbine-4-status.json",
            "detection_vector": "SCADA_TURBINE_TELEMETRY",
            "sha256_fingerprint": "4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce"
        }
    },

    # 14. Dubai / DIFC, UAE (Middle East Financial Hub) - ELEVATED YELLOW
    {
        "source": "FINANCIAL_INTELLIGENCE_DISPATCH",
        "headline": "Sovereign CDS spreads widen 45 bps in Gulf trading amid regional maritime insurance repricing.",
        "content": "Algorithmic liquidity providers widen bid-ask spreads on regional debt instruments following Red Sea shipping war-risk premium surge.",
        "base_friction": 0.55,
        "base_inertia": 0.62,
        "severity": "ELEVATED",
        "geo": {
            "lat": 25.2048,
            "lng": 55.2708,
            "city": "Dubai",
            "country": "United Arab Emirates",
            "country_code": "AE",
            "region": "Middle East",
            "facility": "Dubai International Financial Centre (DIFC) & UAE-IX"
        },
        "evidence": {
            "event_type": "REGIONAL_DEBT_LIQUIDITY_CONTRACTION",
            "protocol": "ITCH 5.0 / OUCH Low-Latency Matching Engine",
            "asn_or_sector": "DIFC-FIN-CORE / UAE-IX",
            "impact_radius_km": 400,
            "entities": ["Dubai Financial Market", "Nasdaq Dubai", "Equinix DX1 Dubai"],
            "raw_evidence": (
                "[ITCH-ORDERBOOK] Top-of-Book Liquidity Depth dropped 61.8% across 5Y Sovereign Sukuk benchmarks\n"
                "[CDS-SPREAD] 5Y Sovereign Credit Default Swap spread widened from 64 bps to 109 bps\n"
                "[RATE-LIMIT] Order-to-Cancel ratio exceeded 45:1; adaptive throttling applied to HFT gateways."
            ),
            "timeline": [
                {"offset": "T-95s", "event": "Maritime war-risk insurance premium hike triggered automated macro-hedge selloff", "severity": "ELEVATED"},
                {"offset": "T-00s", "event": "DIFC matching engine engaged 5ms speed-bump rate-limiting", "severity": "ELEVATED"}
            ],
            "confidence_score": 0.94,
            "source_url": "fix://difc/l2-orderbook-drain-event.pcap",
            "detection_vector": "HIGH_FREQUENCY_ORDERBOOK_ANALYZER",
            "sha256_fingerprint": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a"
        }
    },

    # 15. Taiwan Strait / Hsinchu (Semiconductor Grid) - CRITICAL RED
    {
        "source": "SUPPLY_CHAIN_MONITOR",
        "headline": "GLOBAL KERNEL PANIC: Sub-2nm EUV lithography fab halts due to ultra-high-purity gas pressure drop.",
        "content": "Automated cleanroom atmospheric monitors trip emergency valve isolation across 12 extreme ultraviolet lithography lines in Hsinchu.",
        "base_friction": 0.93,
        "base_inertia": 0.96,
        "severity": "CRITICAL",
        "geo": {
            "lat": 24.7820,
            "lng": 120.9970,
            "city": "Hsinchu",
            "country": "Taiwan",
            "country_code": "TW",
            "region": "East Asia",
            "facility": "Hsinchu Science Park Fab 20 (EUV Lithography Core)"
        },
        "evidence": {
            "event_type": "STRATEGIC_TECHNOLOGY_BOTTLENECK_FAULT",
            "protocol": "SEMI SECS/GEM (E5/E30/E37 HSMS-SS)",
            "asn_or_sector": "HSP-FAB20-CLEANROOM-A",
            "impact_radius_km": 650,
            "entities": ["TSMC Fab 20 Infrastructure", "ASML Twinscan EXE:5000", "Hsinchu Science Park Bureau"],
            "raw_evidence": (
                "[SECS-II-ALARM] S5F1 AlarmID=9042 [EUV Source Vessel Hydrogen Buffer Pressure Loss]\n"
                "[MASS-SPEC] Trace Siloxane impurity detected at 4.2 ppb in UHP gas manifold M-12 (Spec < 0.1 ppb)\n"
                "[INTERLOCK] 14 Twinscan EUV scanners entered hard vacuum lock; 2,800 WIP wafers quarantined in FOUP nitrogen pods."
            ),
            "timeline": [
                {"offset": "T-120s", "event": " anomalous pressure transient in ultra-high-purity hydrogen purge line", "severity": "ELEVATED"},
                {"offset": "T-30s", "event": "SECS/GEM host issued automatic stop command to prevent EUV collector mirror oxidation", "severity": "CRITICAL"},
                {"offset": "T-00s", "event": "Wu-Wei cleanroom network air-gap engaged; PLC firmware audit initiated", "severity": "CRITICAL"}
            ],
            "confidence_score": 0.99,
            "source_url": "fab://hsinchu/euv-chamber-interlock-fault.log",
            "detection_vector": "SPECTROMETRY_CLEANROOM_SURVEILLANCE",
            "sha256_fingerprint": "8527a891e224136950ff32ca212b45bc93f69fbb801c3b1ebedac52775f99e61"
        }
    }
]

def get_active_osint_pool(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Returns the real-time live internet OSINT catalog (USGS, CISA KEV, NASA EONET, THN, SANS ISC, BBC World),
    falling back to OSINT_FEEDS_CATALOG only if internet connectivity is unavailable."""
    try:
        from live_osint import get_live_osint_catalog
        live_items = get_live_osint_catalog(force_refresh=force_refresh)
        if live_items:
            return live_items
    except Exception:
        pass
    return OSINT_FEEDS_CATALOG


def generate_random_osint_payload(force_spike: bool = False, custom_headline: str = None, custom_geo: Dict[str, Any] = None) -> Dict[str, Any]:
    """Generates an OSINT payload prioritized from live global internet feeds (USGS, CISA KEV, NASA EONET, THN, SANS, BBC)."""
    active_pool = get_active_osint_pool()

    if custom_headline:
        if custom_geo:
            geo = custom_geo
        else:
            try:
                from live_osint import resolve_geolocation_from_text
                geo = resolve_geolocation_from_text(custom_headline)
            except Exception:
                geo = random.choice(active_pool)["geo"]

        raw_hash = hashlib.sha256(f"{custom_headline}-{datetime.now().isoformat()}".encode()).hexdigest()
        return {
            "id": f"OSINT-{uuid.uuid4().hex[:8].upper()}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "SOC_TACTICAL_CONSOLE",
            "headline": custom_headline,
            "raw_content": f"Manual signal analysis triggered for facility {geo.get('facility', 'TARGET_NODE')}.",
            "urgency": "CRITICAL" if force_spike else "NORMAL",
            "force_spike": force_spike,
            "geo": geo,
            "evidence": {
                "event_type": "OPERATOR_INDUCED_ANOMALY" if force_spike else "DIRECT_FIELD_OBSERVATION",
                "protocol": "SYNTERGIC-DIRECT-OVERRIDE / TLS 1.3",
                "asn_or_sector": f"SECTOR-{geo.get('country_code', 'GL')}-MANUAL",
                "impact_radius_km": 600 if force_spike else 150,
                "entities": ["SOC Command Node", geo.get("facility", "Target Facility"), "Syntergic IDS Sensor Array"],
                "raw_evidence": (
                    f"[SOC-INJECT] Operator manual payload received at {datetime.now(timezone.utc).isoformat()}\n"
                    f"[TARGET-LOC] {geo.get('facility')} ({geo.get('city')}, {geo.get('country')}) [{geo.get('lat')}, {geo.get('lng')}]\n"
                    f"[PAYLOAD] \"{custom_headline}\"\n"
                    f"[OVERRIDE] Force Thermal Spike: {force_spike} | Cryptographic Verification: PASSED"
                ),
                "timeline": [
                    {"offset": "T-05s", "event": f"Operator console dispatched packet to {geo.get('city')}", "severity": "ELEVATED" if not force_spike else "CRITICAL"},
                    {"offset": "T-00s", "event": "Logos Engine NLP & thermal evaluation completed", "severity": "NORMAL" if not force_spike else "CRITICAL"}
                ],
                "confidence_score": 0.99,
                "source_url": f"soc://operator/direct-injection/{uuid.uuid4().hex[:6]}.log",
                "detection_vector": "MANUAL_SOC_INSPECTION_OVERRIDE",
                "sha256_fingerprint": raw_hash
            }
        }

    if force_spike:
        critical_items = [f for f in active_pool if f["severity"] == "CRITICAL"]
        item = random.choice(critical_items if critical_items else active_pool)
    else:
        weights = [
            0.48 if f["severity"] == "NORMAL" else 0.34 if f["severity"] == "ELEVATED" else 0.18 
            for f in active_pool
        ]
        item = random.choices(active_pool, weights=weights, k=1)[0]
    
    return {
        "id": f"OSINT-{uuid.uuid4().hex[:8].upper()}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": item["source"],
        "headline": item["headline"],
        "raw_content": item["content"],
        "urgency": item["severity"],
        "force_spike": force_spike or (item["severity"] == "CRITICAL"),
        "geo": item["geo"],
        "evidence": item["evidence"]
    }
