// ═══════════════════════════════════════════════════════════════════════════
// SENTINALX - Internal Dashboard JavaScript
// Handles navigation, scanning simulation, and results display
// ═══════════════════════════════════════════════════════════════════════════

// Current active scan type
let activeScan = null;

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

// Initialize navigation buttons
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  updateStatus('System Ready', '#3fb950');
});

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

function closeSidebar() {
  const sidebar = document.querySelector('.sx-sidebar');
  const backdrop = document.querySelector('.sx-backdrop');
  
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('visible');
}

// ═══════════════════════════════════════════════════════════════════════════
// SCANNING FUNCTIONALITY
// ═══════════════════════════════════════════════════════════════════════════

function startScan(type) {
  activeScan = type;
  
  // Get target IP based on scan type
  let targetIp = '';
  let targetPort = '';
  
  if (type === 'device') {
    targetIp = document.getElementById('target-ip-device')?.value?.trim();
  } else if (type === 'port') {
    targetIp = document.getElementById('target-ip-port')?.value?.trim();
    targetPort = document.getElementById('target-ports')?.value?.trim();
  } else if (type === 'service') {
    targetIp = document.getElementById('target-ip-service')?.value?.trim();
    targetPort = document.getElementById('target-port-service')?.value?.trim();
  }
  
  // Validate input
  if (!targetIp) {
    updateStatus('Please enter a target IP', '#f85149');
    showNotification('Please enter a target IP address', 'error');
    return;
  }
  
  // Update status to scanning
  updateStatus(`Scanning ${targetIp}...`, '#d29922');
  document.body.classList.add('scanning');
  
  // Show loading state in results area
  showLoadingState(type);
  
  // Simulate scan completion (replace with real Tauri invoke later)
  setTimeout(() => {
    document.body.classList.remove('scanning');
    updateStatus('Scan Complete', '#3fb950');
    
    // Generate and display sample results
    displayResults(type, targetIp, targetPort);
    
  }, 2000); // 2 second simulation
}

function showLoadingState(type) {
  const resultsContainer = document.getElementById(`${type}-results`);
  const emptyState = document.getElementById(`${type}-empty`);
  const contentArea = document.getElementById(`${type}-results-content`);
  
  if (emptyState) emptyState.classList.add('hidden');
  if (contentArea) {
    contentArea.classList.remove('hidden');
    contentArea.innerHTML = `
      <div class="sx-loading">
        <div class="sx-spinner"></div>
        <span>Scanning target...</span>
      </div>
    `;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULTS DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

function displayResults(type, targetIp, targetPort) {
  const contentArea = document.getElementById(`${type}-results-content`);
  
  if (!contentArea) return;
  
  if (type === 'device') {
    displayDeviceResults(contentArea, targetIp);
  } else if (type === 'port') {
    displayPortResults(contentArea, targetIp, targetPort);
  } else if (type === 'service') {
    displayServiceResults(contentArea, targetIp, targetPort);
  }
}

function displayDeviceResults(container, targetIp) {
  // Generate sample device data
  const sampleDevices = generateSampleDevices(targetIp);
  
  const gridHtml = `
    <div class="sx-device-grid">
      ${sampleDevices.map((device, index) => `
        <div class="sx-device-card" style="animation-delay: ${index * 0.1}s">
          <div class="sx-device-header">
            <div>
              <div class="sx-device-name">${device.hostname}</div>
              <div class="sx-device-ip">${device.ip}</div>
            </div>
            <span class="sx-device-status ${device.status}">${device.status}</span>
          </div>
          <div class="sx-device-details">
            <div class="sx-device-detail">
              <span class="sx-device-detail-label">MAC Address</span>
              <span class="sx-device-detail-value">${device.mac}</span>
            </div>
            <div class="sx-device-detail">
              <span class="sx-device-detail-label">Vendor</span>
              <span class="sx-device-detail-value">${device.vendor}</span>
            </div>
            <div class="sx-device-detail">
              <span class="sx-device-detail-label">Response</span>
              <span class="sx-device-detail-value">${device.response}ms</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  container.innerHTML = gridHtml;
}

function displayPortResults(container, targetIp, targetPorts) {
  // Generate sample port data
  const samplePorts = generateSamplePorts(targetPorts);
  const tbody = document.getElementById('port-table-body');
  
  if (tbody) {
    tbody.innerHTML = samplePorts.map((port, index) => `
      <tr style="animation-delay: ${index * 0.05}s">
        <td><strong>${port.port}</strong></td>
        <td>${port.protocol}</td>
        <td><span class="sx-port-status ${port.state}">${port.state}</span></td>
        <td>${port.service}</td>
        <td>${port.version}</td>
      </tr>
    `).join('');
  }
  
  container.innerHTML = container.innerHTML; // Keep table structure
}

function displayServiceResults(container, targetIp, targetPort) {
  // Generate sample service data
  const sampleServices = generateSampleServices();
  const tbody = document.getElementById('service-table-body');
  
  if (tbody) {
    tbody.innerHTML = sampleServices.map((service, index) => `
      <tr style="animation-delay: ${index * 0.05}s">
        <td><strong>${service.port}</strong></td>
        <td>${service.name}</td>
        <td>${service.version}</td>
        <td><span class="sx-severity ${service.severity}">${service.severity}</span></td>
        <td>${service.notes}</td>
      </tr>
    `).join('');
  }
  
  container.innerHTML = container.innerHTML;
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
      mac: 'AA:BB:CC:DD:EE:FF',
      vendor: 'Dell Inc.',
      status: 'online',
      response: 3
    },
    {
      ip: `${baseIp}.15`,
      hostname: 'LAPTOP-JK2M9P',
      mac: '11:22:33:44:55:66',
      vendor: 'HP',
      status: 'online',
      response: 8
    },
    {
      ip: `${baseIp}.42`,
      hostname: 'Server-Storage',
      mac: 'A1:B2:C3:D4:E5:F6',
      vendor: 'Synology',
      status: 'online',
      response: 2
    },
    {
      ip: `${baseIp}.88`,
      hostname: 'PRINTER-OFFICE',
      mac: '12:34:56:78:9A:BC',
      vendor: 'Brother',
      status: 'online',
      response: 5
    },
    {
      ip: `${baseIp}.120`,
      hostname: 'IoT-Camera-01',
      mac: 'DE:AD:BE:EF:00:01',
      vendor: 'Reolink',
      status: 'online',
      response: 12
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
    {
      port: '80',
      name: 'HTTP',
      version: 'Apache/2.4.46 (Ubuntu)',
      severity: 'medium',
      notes: 'HTTP service detected'
    },
    {
      port: '443',
      name: 'HTTPS',
      version: 'nginx 1.18.0',
      severity: 'low',
      notes: 'SSL/TLS enabled'
    },
    {
      port: '3306',
      name: 'MySQL',
      version: 'MariaDB 10.5.12',
      severity: 'high',
      notes: 'Database exposed - restrict access'
    },
    {
      port: '8080',
      name: 'HTTP-Proxy',
      version: 'Jetty 9.4.x',
      severity: 'medium',
      notes: 'Development server'
    }
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
  console.log('Opening logs...');
  showNotification('Logs panel coming soon', 'info');
  // invoke('open_logs'); // ← uncomment when Tauri backend is ready
}

