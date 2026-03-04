// Current active scan type (for reference)
let activeScan = null;

// Show selected section
function showSection(sectionId) {
  // Update active button styling
  document.querySelectorAll('.sx-nav-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = Array.from(document.querySelectorAll('.sx-nav-btn'))
    .find(btn => btn.textContent.trim().toLowerCase().includes(sectionId));
  if (activeBtn) activeBtn.classList.add('active');

  // Show/hide sections
  document.querySelectorAll('.sx-section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
}

// Update status bar
function updateStatus(text, color = '#30d158') {
  document.getElementById('status-text').textContent = text;
  document.getElementById('status-dot').style.background = color;
}

// Simulate scan start (replace with real Tauri invoke later)
function startScan(type) {
  activeScan = type;
  updateStatus(`Scanning... (${type})`, '#ffaa00'); // yellow/orange

  // Fake delay to simulate work → replace with real async invoke
  setTimeout(() => {
    updateStatus('Scan Complete', '#30d158'); // green

    // Show results area
    const resultsContainer = document.getElementById(`${type}-results`);
    const emptyState = document.getElementById(`${type}-empty`);
    const contentArea = document.getElementById(`${type}-results-content`);

    if (emptyState) emptyState.classList.add('hidden');
    if (contentArea) contentArea.classList.remove('hidden');
    if (resultsContainer) resultsContainer.classList.add('visible');

    // For now just show placeholder message
    // → Later: parse real data from backend and populate table/chart here

  }, 1800); // 1.8 seconds fake delay
}

// Sidebar button handlers (you can also call startScan directly if desired)
function deviceScan() {
  showSection('device');
  // Optional: startScan('device');
}

function togglePortScan() {
  showSection('port');
  // Optional: startScan('port');
}

function toggleServiceScan() {
  showSection('service');
  // Optional: startScan('service');
}

function openLogs() {
  console.log("Opening logs...");
  // invoke('open_logs');  // ← uncomment when Tauri backend is ready
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  showSection('overview');
  updateStatus('System Ready', '#30d158');
});

function toggleSidebar() {
  const sidebar = document.querySelector('.sx-sidebar');
  const grid = document.querySelector('.sx-dashboard-grid'); // optional

  sidebar.classList.toggle('open');

  // Optional: add class to body/grid for extra styling if needed
  // document.body.classList.toggle('sidebar-open');
}