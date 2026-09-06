/**
 * USPS DFA Tracker - Main Application Controller
 * Coordinates filters, network canvas, charts, inspector drawer, and data ingestion.
 */

import { DataLoader } from './data_loader.js';
import { NetworkMap } from './network_map.js';
import { ChartRenderer } from './charts.js';
import { FacilityInspector } from './facility_inspector.js';

class DFATrackerApp {
  constructor() {
    this.loader = new DataLoader();
    this.charts = new ChartRenderer();
    this.map = null;
    this.inspector = null;

    this.filters = {
      type: 'ALL',
      status: 'ALL',
      wave: 'ALL',
      search: ''
    };

    this.activeTab = 'facilities';
  }

  async init() {
    console.log("Initializing DFA Network Modernization Tracker...");

    const loaded = await this.loader.loadInitialData();
    if (!loaded) {
      alert("Failed to load facilities dataset.");
      return;
    }

    this.map = new NetworkMap('networkCanvas', 'networkTooltip', (facility) => {
      this.handleSelectFacility(facility);
    });
    await this.map.init();

    this.inspector = new FacilityInspector('facilityDrawer', 'drawerCloseBtn', this.loader, (fac) => {
      this.handleSelectFacility(fac);
    });

    this.setupEventListeners();
    this.updateDashboard();
  }

  setupEventListeners() {
    // Type Filter
    const typeFilter = document.getElementById('typeFilter');
    typeFilter?.addEventListener('change', (e) => {
      this.filters.type = e.target.value;
      this.updateDashboard();
    });

    // Status Filter
    const statusFilter = document.getElementById('statusFilter');
    statusFilter?.addEventListener('change', (e) => {
      this.filters.status = e.target.value;
      this.updateDashboard();
    });

    // Wave Filter
    const waveFilter = document.getElementById('waveFilter');
    waveFilter?.addEventListener('change', (e) => {
      this.filters.wave = e.target.value;
      this.updateDashboard();
    });

    // Search
    const searchInput = document.getElementById('facilitySearch');
    searchInput?.addEventListener('input', (e) => {
      this.filters.search = e.target.value;
      this.updateDashboard();
    });

    // Map Quick-Search Bar with Autocomplete & Fly-To
    const mapSearchInput = document.getElementById('mapSearchInput');
    const mapSearchResults = document.getElementById('mapSearchResults');
    const clearMapSearchBtn = document.getElementById('clearMapSearchBtn');

    const handleMapSearch = (query) => {
      const q = query.trim().toLowerCase();
      if (!q) {
        if (mapSearchResults) mapSearchResults.style.display = 'none';
        if (clearMapSearchBtn) clearMapSearchBtn.style.display = 'none';
        return;
      }

      if (clearMapSearchBtn) clearMapSearchBtn.style.display = 'flex';

      const matches = this.loader.facilities.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.city.toLowerCase().includes(q) ||
        f.state.toLowerCase().includes(q) ||
        f.facility_id.toLowerCase().includes(q)
      ).slice(0, 8);

      if (!matches.length) {
        mapSearchResults.innerHTML = `
          <div style="padding: 0.75rem; color: var(--text-dim); text-align: center; font-size: 0.75rem;">
            No facilities found matching "${query}"
          </div>
        `;
        mapSearchResults.style.display = 'block';
        return;
      }

      mapSearchResults.innerHTML = matches.map(f => {
        const badgeClass = f.type === 'RPDC' ? 'badge-rpdc' : (f.type === 'LPC' ? 'badge-lpc' : (f.type === 'S&DC' ? 'badge-sdc' : 'badge-spoke'));
        return `
          <div class="map-search-item" data-id="${f.facility_id}">
            <div class="search-item-main">
              <span class="search-item-title">${f.name}</span>
              <span class="search-item-sub">${f.city}, ${f.state} • ${f.facility_id}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span class="badge-tier ${badgeClass}">${f.type}</span>
            </div>
          </div>
        `;
      }).join('');

      mapSearchResults.querySelectorAll('.map-search-item').forEach(item => {
        item.addEventListener('click', () => {
          const fid = item.getAttribute('data-id');
          const fac = this.loader.getFacilityById(fid);
          if (fac) {
            this.focusFacility(fac);
          }
        });
      });

      mapSearchResults.style.display = 'block';
    };

    mapSearchInput?.addEventListener('input', (e) => {
      handleMapSearch(e.target.value);
    });

    mapSearchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = mapSearchInput.value.trim().toLowerCase();
        const matches = this.loader.facilities.filter(f =>
          f.name.toLowerCase().includes(q) ||
          f.city.toLowerCase().includes(q) ||
          f.state.toLowerCase().includes(q) ||
          f.facility_id.toLowerCase().includes(q)
        );
        if (matches.length) {
          this.focusFacility(matches[0]);
        }
      } else if (e.key === 'Escape') {
        if (mapSearchResults) mapSearchResults.style.display = 'none';
      }
    });

    clearMapSearchBtn?.addEventListener('click', () => {
      if (mapSearchInput) mapSearchInput.value = '';
      if (mapSearchResults) mapSearchResults.style.display = 'none';
      if (clearMapSearchBtn) clearMapSearchBtn.style.display = 'none';
      this.map.setSelected(null);
      this.map.resetZoom();
      this.inspector.close();
    });

    // Close map search dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.map-search-wrapper')) {
        if (mapSearchResults) mapSearchResults.style.display = 'none';
      }
    });

    // Reset Filters
    const resetBtn = document.getElementById('resetFiltersBtn');
    resetBtn?.addEventListener('click', () => {
      this.resetFilters();
    });

    // Map Zoom Buttons
    document.getElementById('zoomInBtn')?.addEventListener('click', () => this.map.zoomIn());
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => this.map.zoomOut());
    document.getElementById('zoomResetBtn')?.addEventListener('click', () => this.map.resetZoom());

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });

    // Ingest Modal
    const openModalBtn = document.getElementById('openIngestModalBtn');
    const closeModalBtn = document.getElementById('closeIngestModalBtn');
    const modal = document.getElementById('ingestModal');

    openModalBtn?.addEventListener('click', () => modal?.classList.add('open'));
    closeModalBtn?.addEventListener('click', () => modal?.classList.remove('open'));
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });

    // File Dropzone
    const dropzone = document.getElementById('csvDropzone');
    const fileInput = document.getElementById('csvFileInput');

    dropzone?.addEventListener('click', () => fileInput?.click());
    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#38bdf8';
    });
    dropzone?.addEventListener('dragleave', () => dropzone.style.borderColor = 'rgba(255,255,255,0.2)');
    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'rgba(255,255,255,0.2)';
      if (e.dataTransfer.files.length) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput?.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.handleFileUpload(e.target.files[0]);
      }
    });

    // Export CSV
    document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
      this.exportData();
    });
  }

  handleSelectFacility(facility) {
    this.map.setSelected(facility);
    this.inspector.open(facility);
    this.charts.renderTransitionCurve('transitionChartContainer', facility.name);
  }

  focusFacility(facility) {
    if (!facility) return;
    const mapSearchInput = document.getElementById('mapSearchInput');
    if (mapSearchInput) mapSearchInput.value = facility.name;
    const mapSearchResults = document.getElementById('mapSearchResults');
    if (mapSearchResults) mapSearchResults.style.display = 'none';
    const clearBtn = document.getElementById('clearMapSearchBtn');
    if (clearBtn) clearBtn.style.display = 'flex';

    this.map.flyTo(facility.latitude, facility.longitude, 2.5);
    this.handleSelectFacility(facility);
  }

  selectFacilityById(id) {
    const fac = this.loader.getFacilityById(id);
    if (fac) {
      this.focusFacility(fac);
    }
  }

  resetFilters() {
    this.filters = { type: 'ALL', status: 'ALL', wave: 'ALL', search: '' };
    
    const tf = document.getElementById('typeFilter');
    if (tf) tf.value = 'ALL';
    const sf = document.getElementById('statusFilter');
    if (sf) sf.value = 'ALL';
    const wf = document.getElementById('waveFilter');
    if (wf) wf.value = 'ALL';
    const si = document.getElementById('facilitySearch');
    if (si) si.value = '';
    const msi = document.getElementById('mapSearchInput');
    if (msi) msi.value = '';
    const msr = document.getElementById('mapSearchResults');
    if (msr) msr.style.display = 'none';
    const clr = document.getElementById('clearMapSearchBtn');
    if (clr) clr.style.display = 'none';

    this.map.setSelected(null);
    this.map.resetZoom();
    this.inspector.close();
    this.updateDashboard();
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(c => {
      c.classList.toggle('active', c.id === `tabContent-${tabId}`);
    });
    this.renderActiveTab();
  }

  handleFileUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const res = this.loader.ingestCsv(text);
      if (res.success) {
        alert(`Successfully ingested ${res.count} facilities from ${file.name}!`);
        document.getElementById('ingestModal')?.classList.remove('open');
        this.updateDashboard();
      } else {
        alert(`Failed to ingest CSV: ${res.error}`);
      }
    };
    reader.readAsText(file);
  }

  exportData() {
    const csv = this.loader.exportToCsv(this.filters);
    if (!csv) {
      alert("No records to export.");
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dfa_facilities_export.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  updateDashboard() {
    const filtered = this.loader.getFilteredFacilities(this.filters);
    const kpis = this.loader.calculateKpis();

    // 1. Render KPIs
    document.getElementById('kpiTotalFacilities').textContent = kpis.totalFacilities;
    document.getElementById('kpiRoutes').textContent = kpis.totalRoutes.toLocaleString();
    document.getElementById('kpiEvChargers').textContent = kpis.totalEvChargers.toLocaleString();
    document.getElementById('kpiAvgRadius').textContent = `${kpis.avgRadius} mi`;
    document.getElementById('kpiOperational').textContent = `${kpis.operationalCount}`;

    // 2. Update Map
    this.map.setData(filtered, this.loader.connections);

    // 3. Render Widgets
    this.charts.renderTransitionCurve('transitionChartContainer');
    this.charts.renderStemTimeDistribution('stemTimeChartContainer', this.loader.facilities);

    // 4. Render Table
    this.renderActiveTab();
  }

  renderActiveTab() {
    if (this.activeTab === 'facilities') {
      this.renderTable();
    }
  }

  renderTable() {
    const tbody = document.getElementById('facilityTableBody');
    if (!tbody) return;

    const list = this.loader.getFilteredFacilities(this.filters);

    tbody.innerHTML = list.map(f => {
      const badgeClass = f.type === 'RPDC' ? 'badge-rpdc' : (f.type === 'LPC' ? 'badge-lpc' : (f.type === 'S&DC' ? 'badge-sdc' : 'badge-spoke'));
      const statusClass = f.status === 'Operational' ? 'operational' : (f.status === 'In Progress' ? 'inprogress' : 'paused');

      return `
        <tr onclick="window.__dfaApp.selectFacilityById('${f.facility_id}')">
          <td><span class="badge-tier ${badgeClass}">${f.type}</span></td>
          <td style="font-weight: bold; color: #fff;">${f.name}</td>
          <td>${f.city}</td>
          <td>${f.state}</td>
          <td><span class="status-tag ${statusClass}">${f.status}</span></td>
          <td style="font-size: 0.75rem; color: var(--text-dim);">${f.launch_wave || '-'}</td>
          <td style="font-family: monospace;">${f.carrier_routes || '-'}</td>
          <td style="font-family: monospace;">${f.ev_chargers || '-'}</td>
          <td style="font-size: 0.72rem; color: var(--text-dim); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${f.notes || '-'}
          </td>
        </tr>
      `;
    }).join('');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new DFATrackerApp();
  window.__dfaApp = app;
  app.init();
});
