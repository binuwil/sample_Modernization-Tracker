/**
 * USPS DFA Tracker - Interactive Network Map Visualizer
 * High-performance Canvas renderer displaying multi-tier facility nodes and hub-and-spoke spider lines.
 */

export class NetworkMap {
  constructor(canvasId, tooltipId, onSelectFacility) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.tooltip = document.getElementById(tooltipId);
    this.onSelect = onSelectFacility;

    this.facilities = [];
    this.connections = [];
    this.selectedFacility = null;
    this.hoveredFacility = null;

    // Viewport transform
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };

    if (this.canvas) {
      this.setupEventListeners();
      this.resize();
    }
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.render();
  }

  setData(facilities, connections) {
    this.facilities = facilities || [];
    this.connections = connections || [];
    this.render();
  }

  setSelected(facility) {
    this.selectedFacility = facility;
    this.render();
  }

  zoomIn() {
    this.scale = Math.min(this.scale * 1.25, 4.0);
    this.render();
  }

  zoomOut() {
    this.scale = Math.max(this.scale / 1.25, 0.6);
    this.render();
  }

  resetZoom() {
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.render();
  }

  // Convert lat/lon to Canvas coordinate (Albers-like bounding box: Lon -126 to -66, Lat 24 to 50)
  project(lat, lon) {
    const w = this.canvas.width / window.devicePixelRatio;
    const h = this.canvas.height / window.devicePixelRatio;

    const padX = w * 0.08;
    const padY = h * 0.1;
    const plotW = w - (padX * 2);
    const plotH = h - (padY * 2);

    let x = ((lon - (-125)) / (125 - 66)) * plotW + padX;
    let y = ((50 - lat) / (50 - 24)) * plotH + padY;

    // Apply pan & zoom
    x = (x - w / 2) * this.scale + w / 2 + this.panX;
    y = (y - h / 2) * this.scale + h / 2 + this.panY;

    return { x, y };
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.panX = e.clientX - this.dragStart.x;
        this.panY = e.clientY - this.dragStart.y;
        this.render();
        return;
      }

      // Check hover
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let found = null;
      for (const f of this.facilities) {
        const pt = this.project(f.latitude, f.longitude);
        const radius = f.type === 'RPDC' ? 14 : (f.type === 'S&DC' ? 10 : 7);
        const dist = Math.hypot(pt.x - mouseX, pt.y - mouseY);
        if (dist <= radius) {
          found = f;
          break;
        }
      }

      if (found !== this.hoveredFacility) {
        this.hoveredFacility = found;
        if (found) {
          this.showTooltip(e, found);
        } else {
          this.hideTooltip();
        }
        this.render();
      } else if (found) {
        this.moveTooltip(e);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.hoveredFacility) {
        this.selectedFacility = this.hoveredFacility;
        if (this.onSelect) this.onSelect(this.hoveredFacility);
        this.render();
      }
    });
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Draw stylized US map outline reference grid
    this.drawBackgroundGrid(ctx, w, h);

    // Draw active Hub-and-Spoke Spider lines
    this.drawConnections(ctx);

    // Draw facility nodes by tier (Spokes -> LPCs -> S&DCs -> RPDCs)
    const tierOrder = ['SPOKE', 'LPC', 'S&DC', 'RPDC'];
    tierOrder.forEach(tier => {
      this.facilities.filter(f => f.type === tier).forEach(f => {
        this.drawNode(ctx, f);
      });
    });

    ctx.restore();
  }

  drawBackgroundGrid(ctx, w, h) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;

    // Grid lines
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  drawConnections(ctx) {
    if (!this.connections.length) return;

    // If an S&DC or RPDC is selected, highlight its connections
    const activeHubId = this.selectedFacility ? this.selectedFacility.facility_id : null;

    this.connections.forEach(conn => {
      const fromFac = this.facilities.find(f => f.facility_id === conn.from_id);
      const toFac = this.facilities.find(f => f.facility_id === conn.to_id);

      if (!fromFac || !toFac) return;

      const p1 = this.project(fromFac.latitude, fromFac.longitude);
      const p2 = this.project(toFac.latitude, toFac.longitude);

      const isConnectedToActive = activeHubId && (conn.from_id === activeHubId || conn.to_id === activeHubId);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);

      if (isConnectedToActive) {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
      } else {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
      }

      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  drawNode(ctx, f) {
    const pt = this.project(f.latitude, f.longitude);
    const isSelected = this.selectedFacility && this.selectedFacility.facility_id === f.facility_id;
    const isHovered = this.hoveredFacility && this.hoveredFacility.facility_id === f.facility_id;

    ctx.save();
    ctx.translate(pt.x, pt.y);

    if (f.type === 'RPDC') {
      // Mega Diamond
      const size = isSelected || isHovered ? 13 : 9;
      ctx.fillStyle = isSelected ? "#ffffff" : "#38bdf8";
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = isSelected ? 3 : 1.5;

      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Outer glow pulse
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

    } else if (f.type === 'LPC') {
      // Triangle
      const size = isSelected || isHovered ? 10 : 7;
      ctx.fillStyle = isSelected ? "#ffffff" : "#fbbf24";
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size, size);
      ctx.lineTo(-size, size);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

    } else if (f.type === 'S&DC') {
      // Circle
      const r = isSelected || isHovered ? 11 : 7;
      ctx.fillStyle = isSelected ? "#ffffff" : "#34d399";
      ctx.strokeStyle = "#059669";
      ctx.lineWidth = isSelected ? 3 : 1.5;

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(52, 211, 153, 0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

    } else {
      // SPOKE
      const r = isSelected ? 5 : 2.8;
      ctx.fillStyle = isSelected ? "#38bdf8" : "rgba(203, 213, 225, 0.6)";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  showTooltip(e, f) {
    if (!this.tooltip) return;
    const badgeClass = f.type === 'RPDC' ? 'badge-rpdc' : (f.type === 'LPC' ? 'badge-lpc' : (f.type === 'S&DC' ? 'badge-sdc' : 'badge-spoke'));

    this.tooltip.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
        <span class="badge-tier ${badgeClass}">${f.type}</span>
        <span style="font-size: 0.7rem; color: var(--text-dim);">${f.status}</span>
      </div>
      <div style="font-weight: bold; font-size: 0.85rem; color: #fff;">${f.name}</div>
      <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.4rem;">${f.city}, ${f.state}</div>
      
      ${f.type === 'S&DC' ? `
        <div style="font-size: 0.72rem; color: var(--text-primary); border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.35rem;">
          <div>📦 Carrier Routes: <b>${f.carrier_routes}</b></div>
          <div>📍 Consolidated Spokes: <b>${f.spoke_count} post offices</b></div>
          <div>⚡ EV Charging Stations: <b>${f.ev_chargers}</b></div>
        </div>
      ` : ''}

      ${f.type === 'SPOKE' ? `
        <div style="font-size: 0.72rem; color: var(--text-primary); border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.35rem;">
          <div>🚗 Distance to S&DC: <b>${f.distance_to_sdc} miles</b></div>
          <div>⏱️ Est. Stem Drive: <b>${f.drive_time_minutes} mins</b></div>
          <div>📬 Routes Moved: <b>${f.carrier_routes}</b></div>
        </div>
      ` : ''}

      ${f.type === 'RPDC' ? `
        <div style="font-size: 0.72rem; color: var(--text-primary); border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.35rem;">
          <div>📐 Square Footage: <b>${(f.square_footage || 0).toLocaleString()} sq ft</b></div>
          <div>🌊 Launch Wave: <b>${f.launch_wave}</b></div>
        </div>
      ` : ''}
    `;

    this.tooltip.classList.add('visible');
    this.moveTooltip(e);
  }

  moveTooltip(e) {
    if (!this.tooltip) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  hideTooltip() {
    if (!this.tooltip) return;
    this.tooltip.classList.remove('visible');
  }
}
