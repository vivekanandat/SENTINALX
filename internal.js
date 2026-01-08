let activeScan = null;

function openLogs() {
  console.log("Opening logs...");
}

function deviceScan() {
  console.log("Running device scan...");
  hidePanel();
}

function togglePortScan() {
  activeScan = "port";
  showPanel(false);
}

function toggleServiceScan() {
  activeScan = "service";
  showPanel(true);
}

function showPanel(showPortField) {
  const panel = document.getElementById("scan-input-panel");
  const portField = document.getElementById("port-field");

  panel.classList.remove("hidden");

  if (showPortField) {
    portField.classList.remove("hidden");
  } else {
    portField.classList.add("hidden");
  }
}

function hidePanel() {
  document.getElementById("scan-input-panel").classList.add("hidden");
}

function runScan() {
  const ip = document.getElementById("target-ip").value.trim();
  const port = document.getElementById("target-port").value.trim();

  if (!ip) {
    alert("Target IP is required.");
    return;
  }

  if (activeScan === "port") {
    console.log(`Port scan started on ${ip}`);
  }

  if (activeScan === "service") {
    console.log(`Service scan started on ${ip}, port: ${port || "auto"}`);
  }

  hidePanel();
}
