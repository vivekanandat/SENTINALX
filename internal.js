import { invoke } from "@tauri-apps/api/core";
// ═══════════════════════════════════════════════════════════════════════════
// SENTINALX - Internal Dashboard JavaScript
// Handles navigation, scanning simulation, and results display
// ═══════════════════════════════════════════════════════════════════════════

let LOG_BUFFER = [];
const MAX_LOGS = 500;

function isBackgroundLogsEnabled() {
  return document.getElementById("sx-background-logs")?.checked === true;
}
function forceLog(type, ...args) {
  addLog(type, ...args);
}
function formatLogMessage(args) {
  return args.map(arg => {
    if (typeof arg === "string") return arg;
    try {
      return JSON.stringify(arg, null, 2);
    } catch {
      return String(arg);
    }
  }).join(" ");
}

function addLog(type, ...args) {
  const time = new Date().toLocaleTimeString();
  const message = formatLogMessage(args);

  LOG_BUFFER.push({ time, type, message });
  if (LOG_BUFFER.length > MAX_LOGS) {
    LOG_BUFFER.shift();
  }

  if (isBackgroundLogsEnabled()) {
    renderLogs();
  }
}

function renderLogs() {
  const empty = document.getElementById("logs-empty");
  const contentWrap = document.getElementById("logs-results-content");
  const content = document.getElementById("logs-content");

  if (!contentWrap || !content) return;

  if (!LOG_BUFFER.length) {
    contentWrap.classList.add("hidden");
    content.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }

  if (empty) empty.classList.add("hidden");
  contentWrap.classList.remove("hidden");

  content.innerHTML = LOG_BUFFER.map(log => `
    <div class="sx-log-entry sx-log-${escapeHtml(log.type)}">
      <span class="sx-log-time">[${escapeHtml(log.time)}]</span>
      <span class="sx-log-type">${escapeHtml(log.type.toUpperCase())}</span>
      <span class="sx-log-message">${escapeHtml(log.message)}</span>
    </div>
  `).join("");
}
function clearLogs() {
  LOG_BUFFER = [];
  renderLogs();
}

function exportLogs() {
  if (!LOG_BUFFER.length) {
    showNotification("No logs to export", "error");
    return;
  }

  const text = LOG_BUFFER.map(log =>
    `[${log.time}] [${String(log.type).toUpperCase()}] ${log.message}`
  ).join("\n");

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `sentinalx-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  showNotification("Logs exported", "info");
}


function patchConsoleForLogs() {
  const original = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info ? console.info.bind(console) : console.log.bind(console),
    debug: console.debug ? console.debug.bind(console) : console.log.bind(console)
  };

  console.log = (...args) => {
    original.log(...args);
    if (isBackgroundLogsEnabled()) addLog("info", ...args);
  };

  console.warn = (...args) => {
    original.warn(...args);
    if (isBackgroundLogsEnabled()) addLog("warn", ...args);
  };

  console.error = (...args) => {
    original.error(...args);
    if (isBackgroundLogsEnabled()) addLog("error", ...args);
  };

  console.info = (...args) => {
    original.info(...args);
    if (isBackgroundLogsEnabled()) addLog("info", ...args);
  };

  console.debug = (...args) => {
    original.debug(...args);
    if (isBackgroundLogsEnabled()) addLog("debug", ...args);
  };

  window.addEventListener("error", (event) => {
    if (isBackgroundLogsEnabled()) addLog("error", event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (isBackgroundLogsEnabled()) addLog("error", "Unhandled promise rejection:", event.reason);
  });
}

// Current active scan type
let activeScan = null;
let OUI_MAP = new Map();
let OUI_RANGES = [];

function buildOuiLookup() {
  if (!window.OUI_DB || !Array.isArray(window.OUI_DB)) {
    console.error("OUI_DB not loaded");
    return;
  }

  OUI_MAP.clear();
  OUI_RANGES = [];

  for (const entry of window.OUI_DB) {
    const prefix = entry.prefix.toUpperCase();

    if (prefix.includes("/28")) {
      OUI_RANGES.push(entry);
    } else {
      OUI_MAP.set(prefix, entry.vendor);
    }
  }

  console.log("OUI loaded:", OUI_MAP.size, "exact,", OUI_RANGES.length, "ranges");
}

document.addEventListener('DOMContentLoaded', () => {
  patchConsoleForLogs();
  buildOuiLookup();
  initNavigation();
  updateStatus('System Ready', '#3fb950');
  if (isBackgroundLogsEnabled()) addLog("info", "System Ready");
const bgLogsToggle = document.getElementById("sx-background-logs");

if (bgLogsToggle) {
  bgLogsToggle.addEventListener("change", () => {
    if (bgLogsToggle.checked) {
      forceLog("info", "Background Logs enabled");
    } else {
      forceLog("warn", "Background Logs disabled");
    }

    renderLogs();
  });
}
});

// Initialize navigation buttons
function initNavigation() {
  const navButtons = document.querySelectorAll('.sx-nav-btn');
  
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      if (section) {
        showSection(section);
      }
    });
  });
}

function showSection(sectionId) {
  // Update active button styling
  document.querySelectorAll('.sx-nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.section === sectionId) {
      btn.classList.add('active');
    }
  });

  // Show/hide sections
  document.querySelectorAll('.sx-section').forEach(s => s.classList.remove('active'));
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Close sidebar on mobile after selection
  if (window.innerWidth <= 1024) {
    closeSidebar();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS BAR
// ═══════════════════════════════════════════════════════════════════════════

function updateStatus(text, color = '#3fb950') {
  const statusText = document.getElementById('status-text');
  const statusDot = document.getElementById('status-dot');
  
  if (statusText) statusText.textContent = text;
  if (statusDot) {
    statusDot.style.background = color;
    statusDot.style.boxShadow = `0 0 8px ${color}`;
  }
}
// vendor func
//
function getVendorFromMac(mac) {
  if (!mac || mac === "Unknown") return "Unknown Vendor";

  const clean = mac.toUpperCase();
  const parts = clean.split(":");

  if (parts.length < 3) return "Unknown Vendor";

  // fast exact match (first 3 bytes)
  const oui = parts.slice(0, 3).join(":");
  if (OUI_MAP.has(oui)) {
    return OUI_MAP.get(oui);
  }

  // handle /28 ranges
  if (parts.length >= 4) {
    for (const entry of OUI_RANGES) {
      const base = entry.prefix.split("/")[0];
      const baseParts = base.split(":");

      if (
        parts[0] === baseParts[0] &&
        parts[1] === baseParts[1] &&
        parts[2] === baseParts[2]
      ) {
        const macNibble = parseInt(parts[3][0], 16);
        const baseNibble = parseInt(baseParts[3][0], 16);

        if (macNibble === baseNibble) {
          return entry.vendor;
        }
      }
    }
  }

  return "Unknown Vendor";
}
// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR TOGGLE (Mobile)
// ═══════════════════════════════════════════════════════════════════════════

function toggleSidebar() {
  const sidebar = document.querySelector('.sx-sidebar');
  const backdrop = document.querySelector('.sx-backdrop');
  
  if (sidebar) {
    sidebar.classList.toggle('open');
    
    if (backdrop) {
      if (sidebar.classList.contains('open')) {
        backdrop.classList.add('visible');
      } else {
        backdrop.classList.remove('visible');
      }
    }
  }
}

async function lookupServiceSeverity(serviceText) {
  const query = normalizeServiceQuery(serviceText);

  if (!query) {
    return {
      severity: "unknown",
      score: "-",
      count: 0,
      topCves: [],
      notes: "No usable version string"
    };
  }

  try {
    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(query)}&resultsPerPage=10`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(`NVD HTTP ${res.status}`);
    }

    const data = await res.json();
    const vulns = Array.isArray(data.vulnerabilities) ? data.vulnerabilities : [];

    if (!vulns.length) {
      return {
        severity: "none",
        score: "-",
        count: 0,
        topCves: [],
        notes: "No matching CVEs in NVD"
      };
    }

    let bestScore = -1;
    let bestSeverity = "unknown";
    const topCves = [];

    for (const item of vulns) {
      const cve = item.cve || {};
      if (cve.id) topCves.push(cve.id);

      const metric = getBestCvssMetric(cve.metrics);
      if (metric && typeof metric.score === "number" && metric.score > bestScore) {
        bestScore = metric.score;
        bestSeverity = metric.severity;
      }
    }

    return {
      severity: bestSeverity || scoreToSeverity(bestScore),
      score: bestScore >= 0 ? String(bestScore) : "-",
      count: vulns.length,
      topCves: topCves.slice(0, 3),
      notes: query
    };
  } catch (err) {
    console.error("NVD lookup failed for:", serviceText, err);
    return {
      severity: "unknown",
      score: "-",
      count: 0,
      topCves: [],
      notes: "NVD lookup failed"
    };
  }
}

function getBestCvssMetric(metrics) {
  if (!metrics) return null;

  const candidates = [];

  for (const key of ["cvssMetricV40", "cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]) {
    const arr = metrics[key];
    if (!Array.isArray(arr)) continue;

    for (const m of arr) {
      const cvss = m.cvssData || {};
      const score = Number(cvss.baseScore);
      const severity =
        cvss.baseSeverity ||
        m.baseSeverity ||
        scoreToSeverity(score);

      if (!Number.isNaN(score)) {
        candidates.push({ score, severity });
      }
    }
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}
function getCvesForService(service) {
  const s = String(service || "").toLowerCase();

  // very rough local mapping
  // replace/add entries based on your own earlier data
  if (s.includes("openssh 10.2")) {
    return ["N/A"];
  }

  if (s.includes("openssh")) {
    return ["CVE-2024-6387"];
  }

  if (s === "http" || s.includes("apache")) {
    return ["N/A"];
  }

  if (s === "ftp") {
    return ["N/A"];
  }

  if (s === "telnet") {
    return ["N/A"];
  }

  if (s.includes("nginx")) {
    return ["N/A"];
  }

  return ["N/A"];
}
function scoreToSeverity(score) {
  if (typeof score !== "number" || Number.isNaN(score) || score < 0) return "unknown";
  if (score >= 9.0) return "critical";
  if (score >= 7.0) return "high";
  if (score >= 4.0) return "medium";
  if (score > 0.0) return "low";
  return "none";
}

function severityClass(sev) {
  const s = String(sev || "").toLowerCase();
  if (["critical", "high", "medium", "low"].includes(s)) return s;
  return "unknown";
}

function normalizeServiceQuery(serviceText) {
  const s = String(serviceText || "").trim();
  if (!s) return "";

  // keep product + version-ish tokens, drop noisy words if needed
  return s
    .replace(/\(protocol [^)]+\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}


function closeSidebar() {
  const sidebar = document.querySelector('.sx-sidebar');
  const backdrop = document.querySelector('.sx-backdrop');
  
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('visible');
}

// ═══════════════════════════════════════════════════════════════════════════
// SCANNING FUNCTIONALITY
// ═══════════════════════════════════════════════════════════════════════════


async function startScan(type) {
	console.log("startScan called with:", type);
  activeScan = type;

  let targetIp = "";
  let targetPort = "";

  if (type === "device") {
    targetIp = document.getElementById("target-ip-device")?.value?.trim();
  } else if (type === "port") {
    targetIp = document.getElementById("target-ip-port")?.value?.trim();
    targetPort = document.getElementById("target-ports")?.value?.trim();
  } else if (type === "service") {
    targetIp = document.getElementById("target-ip-service")?.value?.trim();
    targetPort = document.getElementById("target-port-service")?.value?.trim();
  }

  if (!targetIp) {
    updateStatus("Please enter a target IP", "#f85149");
    showNotification("Please enter a target IP address", "error");
    return;
  }

  updateStatus(`Scanning ${targetIp}...`, "#d29922");
  document.body.classList.add("scanning");

  try {
   const result = await invoke("run_scan", {
  scanType: type,
  ip: targetIp,
  port: targetPort || "",
	   
});
console.log("FULL RESULT:\n", result);
    updateStatus("Scan Complete", "#3fb950");
    await displayResults(type, targetIp, targetPort, result);
  } catch (err) {
    updateStatus("Scan Failed", "#f85149");
    showNotification(`Scan failed`, "error");
    console.error(err);
  } finally {
    document.body.classList.remove("scanning");
  }
}



// ═══════════════════════════════════════════════════════════════════════════
// RESULTS DISPLAY
// ═══════════════════════════════════════════════════════════════════════════
function displayResults(type, targetIp, targetPort, result) {
  console.log("displayResults:", type, result);

  const contentArea = document.getElementById(`${type}-results-content`);
  const emptyState = document.getElementById(`${type}-empty`);

  if (!contentArea) {
    console.error(`Missing ${type}-results-content`);
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");
  contentArea.classList.remove("hidden");

  try {
    if (type === "device") {
      displayDeviceResults(result, targetIp);
      return;
    }

    if (type === "port") {
      displayPortResults(result, targetIp, targetPort);
      return;
    }

    if (type === "service") {
      displayServiceResults(result, targetIp, targetPort);
      return;
    }
  } catch (err) {
    console.error(`Render failed for ${type}:`, err);
    contentArea.innerHTML = `<pre class="sx-raw-output">${escapeHtml(String(result || ""))}</pre>`;
  }
}

function bestVersion(service) {
  const s = String(service || "");

  const openSshMatch = s.match(/OpenSSH\s+[^\s)]+(?:\s+[^\)]*)?/i);
  if (openSshMatch) return openSshMatch[0];

  if (/protocol/i.test(s)) return s;

  return "-";
}

function displayPortResults(result, targetIp, targetPorts) {
  const body = document.getElementById("port-table-body");
  const contentArea = document.getElementById("port-results-content");
  if (!body || !contentArea) return;

  const ports = parsePortScanOutput(result);
  console.log("parsed ports:", ports);

  contentArea.classList.remove("hidden");

  if (!ports.length) {
    body.innerHTML = `
      <tr>
        <td colspan="5">No ports found.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = ports.map((port, index) => `
    <tr style="animation-delay: ${index * 0.05}s">
      <td><strong>${escapeHtml(port.port)}</strong></td>
      <td>${escapeHtml(port.protocol)}</td>
      <td><span class="sx-port-status ${escapeHtml(port.state)}">${escapeHtml(port.state)}</span></td>
      <td>${escapeHtml(port.service)}</td>
      <td>${escapeHtml(port.version)}</td>
    </tr>
  `).join("");
}

//custom service fingerprint
let CUSTOM_FINGERPRINTS = [];

function addCustomFingerprint() {
  const fpInput = document.getElementById("custom-fingerprint");

  if (!fpInput) return;

  const fp = fpInput.value.trim();

  if (!fp) {
    showNotification("Fingerprint is empty", "error");
    return;
  }

  // NEW VALIDATION
  if (!isValidFingerprint(fp)) {
    showNotification(
      "Invalid fingerprint format",
      "error"
    );

    addLog(
      "error",
      "Invalid fingerprint rejected:",
      fp
    );

    return;
  }

  CUSTOM_FINGERPRINTS.push(fp);

  addLog(
    "info",
    "Custom fingerprint added:",
    fp
  );

  fpInput.value = "";

  showNotification(
    "Fingerprint added",
    "success"
  );
}

function isValidFingerprint(fp) {
  if (!fp.startsWith("match ")) {
    return false;
  }

  // must contain regex section
  if (!fp.includes(" m|") || !fp.includes("|")) {
    return false;
  }

  // must contain product section
  if (!/p\/.+?\//.test(fp)) {
    return false;
  }

  // optional version field allowed
  // so don't enforce v/

  return true;
}
function displayServiceResults(result, targetIp, targetPort) {
  const body = document.getElementById("service-table-body");
  const contentArea = document.getElementById("service-results-content");
  if (!body || !contentArea) return;

  const parsed = parseServiceScanResults(result, targetIp, targetPort);
  const results = parsed.results;

  console.log("parsed services:", parsed);

  contentArea.classList.remove("hidden");

  if (!results.length) {
    body.innerHTML = `
      <tr>
        <td colspan="5">No services found.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = results.map((item, index) => `
    <tr style="animation-delay: ${index * 0.05}s">
      <td><strong>${escapeHtml(parsed.targetPort || "-")}</strong></td>
      <td>${escapeHtml(item.service)}</td>
      <td>${escapeHtml(bestVersion(item.service))}</td>
      <td><span class="sx-severity ${severityFromService(item.service)}">${severityFromService(item.service)}</span></td>
      <td>${escapeHtml(item.probes.join(", "))}</td>
    </tr>
  `).join("");
}

function guessService(port) {
  const map = {
    "21": "FTP",
    "22": "SSH",
    "23": "Telnet",
    "25": "SMTP",
    "53": "DNS",
    "80": "HTTP",
    "110": "POP3",
    "143": "IMAP",
    "443": "HTTPS",
    "445": "SMB",
    "3306": "MySQL",
    "3389": "RDP",
    "5432": "PostgreSQL",
    "6379": "Redis",
    "8080": "HTTP-Proxy",
    "27017": "MongoDB"
  };

  return map[String(port)] || "Unknown";
}

function severityFromService(service) {
  const s = String(service || "").toLowerCase();

  if (s.includes("telnet")) return "high";
  if (s.includes("ftp")) return "high";
  if (s.includes("ssh")) return "low";
  if (s.includes("http")) return "low";
  if (s.includes("https")) return "low";
  if (s.includes("dns")) return "low";

  return "medium";
}


function serviceNotes(service) {
  const s = String(service || "").toLowerCase();

  if (s.includes("ssh")) return "Secure shell access";
  if (s.includes("http")) return "Web service detected";
  if (s.includes("https")) return "Encrypted web service";
  if (s.includes("ftp")) return "File transfer service";
  if (s.includes("telnet")) return "Insecure remote access";

  return "Service detected";
}

function displayDeviceResults(result, selfIp) {
  const contentArea = document.getElementById("device-results-content");
  if (!contentArea) return;

  const devices = parseListenOutput(result, selfIp);
  console.log("parsed devices:", devices);

  if (!devices.length) {
    contentArea.innerHTML = `<div class="sx-empty-message">No devices found.</div>`;
    return;
  }

  contentArea.innerHTML = `
    <div class="sx-device-grid">
      ${devices.map((d, i) => `
        <div class="sx-device-card" style="animation-delay:${i * 0.05}s">
          <div class="sx-device-header">
            <div>
              <div class="sx-device-name">${escapeHtml(d.name)}</div>
              <div class="sx-device-ip">${escapeHtml(d.ip)}</div>
            </div>
            <span class="sx-device-status online">ONLINE</span>
          </div>

          <div class="sx-device-details">
            <div class="sx-device-detail">
              <span class="sx-device-detail-label">MAC Address</span>
              <span class="sx-device-detail-value">${escapeHtml(d.mac)}</span>
            </div>
            <div class="sx-device-detail">
              <span class="sx-device-detail-label">Vendor</span>
              <span class="sx-device-detail-value">${escapeHtml(d.vendor)}</span>
            </div>
            <div class="sx-device-detail">
              <span class="sx-device-detail-label">Response</span>
              <span class="sx-device-detail-value">${escapeHtml(d.response)}</span>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}


function parseServiceScanResults(rawOutput, targetIp, targetPort) {
  const lines = String(rawOutput || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const serviceMap = new Map();

  for (const line of lines) {
    const match = line.match(/^\[([^\]]+)\]\s*(.+)$/);
    if (!match) continue;

    const probe = match[1].trim();
    const service = match[2].trim();

    if (!service || service.toLowerCase() === "no match") continue;

    if (!serviceMap.has(service)) {
      serviceMap.set(service, []);
    }

    const probes = serviceMap.get(service);
    if (!probes.includes(probe)) {
      probes.push(probe);
    }
  }

  const results = Array.from(serviceMap.entries()).map(([service, probes]) => ({
    service,
    probes
  }));

  return {
    targetIp,
    targetPort,
    results
  };
}

function parsePortScanOutput(result) {
  const lines = String(result || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const rows = [];
  const seen = new Set();

  for (const line of lines) {
    let m;

    // 22/tcp open ssh OpenSSH 8.4
    m = line.match(/^(\d+)\/(tcp|udp)\s+(open|closed|filtered)\s+([^\s]+)(?:\s+(.+))?$/i);
    if (m) {
      const [, port, protocol, state, service, version] = m;
      const key = `${port}/${protocol.toUpperCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        rows.push({
          port,
          protocol: protocol.toUpperCase(),
          state: state.toLowerCase(),
          service,
          version: version || "-"
        });
      }
      continue;
    }

    // 22 open ssh OpenSSH 8.4
    m = line.match(/^(\d+)\s+(open|closed|filtered)\s+([^\s]+)(?:\s+(.+))?$/i);
    if (m) {
      const [, port, state, service, version] = m;
      const key = `${port}/TCP`;
      if (!seen.has(key)) {
        seen.add(key);
        rows.push({
          port,
          protocol: "TCP",
          state: state.toLowerCase(),
          service,
          version: version || "-"
        });
      }
      continue;
    }

    // [TCP OPEN] 10.86.174.219:22
    m = line.match(/^\[(TCP|UDP)\s+(OPEN|CLOSED|FILTERED)\]\s+\S+:(\d+)$/i);
    if (m) {
      const [, protocol, state, port] = m;
      const key = `${port}/${protocol.toUpperCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        rows.push({
          port,
          protocol: protocol.toUpperCase(),
          state: state.toLowerCase(),
          service: guessService(port),
          version: "-"
        });
      }
      continue;
    }

    // 8.8.8.8:443 [TCP]
    m = line.match(/^\S+:(\d+)\s+\[(TCP|UDP)\]$/i);
    if (m) {
      const [, port, protocol] = m;
      const key = `${port}/${protocol.toUpperCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        rows.push({
          port,
          protocol: protocol.toUpperCase(),
          state: "open",
          service: guessService(port),
          version: "-"
        });
      }
      continue;
    }

    // 8.8.8.8 [ICMP] -> ignore for port table
    m = line.match(/^\S+\s+\[ICMP\]$/i);
    if (m) {
      continue;
    }

    // port 22 open
    m = line.match(/^port\s+(\d+)\s+(open|closed|filtered)$/i);
    if (m) {
      const [, port, state] = m;
      const key = `${port}/TCP`;
      if (!seen.has(key)) {
        seen.add(key);
        rows.push({
          port,
          protocol: "TCP",
          state: state.toLowerCase(),
          service: guessService(port),
          version: "-"
        });
      }
    }
  }

  return rows.sort((a, b) => Number(a.port) - Number(b.port));
}




function parseListenOutput(result, selfIp) {
  const lines = String(result || "").split("\n");
  const map = new Map();

  for (const line of lines) {
    let m;

    m = line.match(/\[ARP Reply\] (\S+) is at ([0-9a-f:]+)/i);
    if (m) {
      const ip = m[1];
      const mac = m[2];

      const d = map.get(ip) || makeDevice(ip);
      d.mac = mac;
      d.vendor = getVendorFromMac(mac);

      const guessedName = guessDeviceName(ip);

      if (guessedName === "Router-Gateway") {
        d.name = "Router-Gateway";
      } else if (guessedName === "LAN Device") {
        d.name = d.vendor !== "Unknown Vendor" ? `${d.vendor} Device` : "LAN Device";
      } else {
        d.name = d.vendor !== "Unknown Vendor" ? `${d.vendor} Device` : "Unknown Device";
      }

      map.set(ip, d);
      continue;
    }

    m = line.match(/\[ICMP Reply\] (\S+)/);
    if (m) {
      const ip = m[1];
      const d = map.get(ip) || makeDevice(ip);
      d.response = "Alive";
      map.set(ip, d);
      continue;
    }

    m = line.match(/\[UDP Response\] (\S+)/);
    if (m) {
      const ip = m[1];
      const d = map.get(ip) || makeDevice(ip);
      d.response = "UDP Response";
      map.set(ip, d);
      continue;
    }
  }

  return [...map.values()]
    .filter(d => d.ip !== selfIp)
    .sort((a, b) => ipToNumber(a.ip) - ipToNumber(b.ip));
}
function makeDevice(ip) {
  const baseName = guessDeviceName(ip);

  return {
    name: baseName,
    ip,
    mac: "Unknown",
    vendor: "Unknown Vendor",
    response: "Detected"
  };
}

function makeEmptyDevice(ip) {
  return {
    name: guessDeviceName(ip),
    ip,
    mac: "Unknown",
    vendor: "Unknown Vendor",
    response: "Detected",
    status: "ONLINE",
    statusClass: "online"
  };
}

function guessDeviceName(ip) {
  const lastOctet = Number(ip.split(".").pop());

  if (lastOctet === 1) return "Router-Gateway";
  if (lastOctet >= 2 && lastOctet <= 20) return "LAN Device";
  return "Unknown Device";
}

function ipToNumber(ip) {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


// ═══════════════════════════════════════════════════════════════════════════
// SAMPLE DATA GENERATORS
// ═══════════════════════════════════════════════════════════════════════════

function generateSampleDevices(targetIp) {
  // Extract base IP
  const baseIp = targetIp.split('.').slice(0, 3).join('.');
  
  return [
    {
      ip: `${baseIp}.1`,
      hostname: 'Router-Gateway',
      mac: '00:1A:2B:3C:4D:5E',
      vendor: 'Cisco Systems',
      status: 'online',
      response: 1
    },
    {
      ip: `${baseIp}.10`,
      hostname: 'DESKTOP-M8K3A2',
      mac: 'e0:8f:4c:af:16:08',
      vendor: 'Intel Corporate',
      status: 'online',
      response: 3
    },
    {
      ip: `${baseIp}.15`,
      hostname: 'LAPTOP-JK2M9P',
      mac: 'c8:41:8a:10:b5:d1',
      vendor: 'HP',
      status: 'online',
      response: 8
    }
  ];
}

function generateSamplePorts(customPorts) {
  // Default common ports if none specified
  const ports = customPorts || '22,80,443,3389,8080,21,23,25,53,110,143,445,3306,5432,6379,27017';
  const portList = ports.split(',').map(p => p.trim());
  
  const portData = {
    '22': { service: 'SSH', protocol: 'TCP', version: 'OpenSSH 8.4' },
    '80': { service: 'HTTP', protocol: 'TCP', version: 'Apache/2.4.46' },
    '443': { service: 'HTTPS', protocol: 'TCP', version: 'nginx 1.18.0' },
    '3389': { service: 'RDP', protocol: 'TCP', version: 'Windows Terminal' },
    '8080': { service: 'HTTP-Proxy', protocol: 'TCP', version: 'Java HTTP Server' },
    '21': { service: 'FTP', protocol: 'TCP', version: 'vsftpd 3.0.3' },
    '23': { service: 'Telnet', protocol: 'TCP', version: '-' },
    '25': { service: 'SMTP', protocol: 'TCP', version: 'Postfix' },
    '53': { service: 'DNS', protocol: 'UDP/TCP', version: 'BIND 9.16' },
    '110': { service: 'POP3', protocol: 'TCP', version: 'Dovecot' },
    '143': { service: 'IMAP', protocol: 'TCP', version: 'Dovecot' },
    '445': { service: 'SMB', protocol: 'TCP', version: 'Samba 4.13' },
    '3306': { service: 'MySQL', protocol: 'TCP', version: 'MariaDB 10.5' },
    '5432': { service: 'PostgreSQL', protocol: 'TCP', version: 'PostgreSQL 13' },
    '6379': { service: 'Redis', protocol: 'TCP', version: 'Redis 6.0' },
    '27017': { service: 'MongoDB', protocol: 'TCP', version: 'MongoDB 5.0' }
  };
  
  // Random selection of ports to show as open
  const openPorts = portList.slice(0, Math.min(portList.length, 6)).map(p => {
    const portInfo = portData[p] || { service: 'Unknown', protocol: 'TCP', version: '-' };
    return {
      port: p,
      protocol: portInfo.protocol,
      state: Math.random() > 0.3 ? 'open' : 'closed',
      service: portInfo.service,
      version: portInfo.version
    };
  });
  
  return openPorts;
}

function generateSampleServices() {
  return [
    {
      port: '22',
      name: 'SSH',
      version: 'OpenSSH 8.4p1 Ubuntu',
      severity: 'low',
      notes: 'Secure shell access'
    },
   
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS (Simple implementation)
// ═══════════════════════════════════════════════════════════════════════════

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'error' ? 'rgba(248,81,73,0.9)' : 'rgba(63,185,80,0.9)'};
    color: white;
    border-radius: 8px;
    font-size: 0.875rem;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add slideIn/slideOut animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// ═══════════════════════════════════════════════════════════════════════════
// LOGS (Placeholder)
// ═══════════════════════════════════════════════════════════════════════════


function openLogs() {
  showSection("logs");
  renderLogs();
}
window.clearLogs = clearLogs;
window.exportLogs = exportLogs;
window.startScan = startScan;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.openLogs = openLogs;
window.addCustomFingerprint = addCustomFingerprint;
