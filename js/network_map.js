/**
 * USPS DFA Tracker - Interactive Network Map Visualizer
 * High-performance Canvas renderer displaying US state geographic boundaries,
 * multi-tier facility nodes, and dynamic hub-and-spoke spider connections.
 */

export class NetworkMap {
  constructor(canvasId, tooltipId, onSelectFacility) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.tooltip = document.getElementById(tooltipId);
    this.onSelect = onSelectFacility;

    this.facilities = [];
    this.connections = [];
    this.geoData = null;
    this.selectedFacility = null;
    this.hoveredFacility = null;

    // Viewport transform
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };

    // Standard Albers projection parameters for United States
    this.phi1 = (29.5 * Math.PI) / 180;
    this.phi2 = (45.5 * Math.PI) / 180;
    this.phi0 = (37.5 * Math.PI) / 180;
    this.lambda0 = (-96.0 * Math.PI) / 180;

    this.n = 0.5 * (Math.sin(this.phi1) + Math.sin(this.phi2));
    this.c = Math.cos(this.phi1) ** 2 + 2 * this.n * Math.sin(this.phi1);
    this.rho0 = Math.sqrt(this.c - 2 * this.n * Math.sin(this.phi0)) / this.n;

    if (this.canvas) {
      this.setupEventListeners();
      this.resize();
    }
  }

  async init() {
    try {
      const res = await fetch('data/us_states.json');
      if (res.ok) {
        this.geoData = await res.json();
        this.render();
      }
    } catch (e) {
      console.warn("Could not load us_states.json boundary data:", e);
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

  /**
   * Smoothly center and zoom the map directly onto a specific facility's coordinates.
   */
  flyTo(lat, lon, zoomScale = 2.5) {
    const phi = (lat * Math.PI) / 180;
    const lam = (lon * Math.PI) / 180;
    const theta = this.n * (lam - this.lambda0);
    let term = this.c - 2 * this.n * Math.sin(phi);
    if (term < 0) term = 0;
    const rho = Math.sqrt(term) / this.n;

    let normX = rho * Math.sin(theta);
    let normY = -(this.rho0 - rho * Math.cos(theta));

    if (lon < -130 && lat > 50) {
      normX = (normX - (-0.45)) * 0.35 - 0.28;
      normY = (normY - (-0.48)) * 0.35 + 0.16;
    } else if (lon < -150 && lat < 25) {
      normX = (normX - (-0.40)) * 0.8 - 0.16;
      normY = (normY - (0.15)) * 0.8 + 0.18;
    } else if (lat < 20 && lon > -70) {
      normX = (normX - (0.42)) * 0.8 + 0.28;
      normY = (normY - (0.28)) * 0.8 + 0.18;
    }

    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    const pad = 35;
    const scaleFactor = Math.min((w - pad * 2) / 0.74, (h - pad * 2) / 0.48);

    const baseX = w / 2 + (normX - (-0.0078)) * scaleFactor;
    const baseY = h / 2 + (normY - (-0.0208)) * scaleFactor;

    this.scale = zoomScale;
    this.panX = -(baseX - w / 2) * this.scale;
    this.panY = -(baseY - h / 2) * this.scale;

    this.render();
  }

  /**
   * Albers Equal-Area Conic projection for the United States with inset support.
   */
  project(lat, lon) {
    const phi = (lat * Math.PI) / 180;
    const lam = (lon * Math.PI) / 180;
    const theta = this.n * (lam - this.lambda0);
    let term = this.c - 2 * this.n * Math.sin(phi);
    if (term < 0) term = 0;
    const rho = Math.sqrt(term) / this.n;

    let normX = rho * Math.sin(theta);
    let normY = -(this.rho0 - rho * Math.cos(theta)); // Screen Y (north is negative Y)

    // Inset handling for Alaska, Hawaii, and Puerto Rico
    if (lon < -130 && lat > 50) {
      // Alaska
      normX = (normX - (-0.45)) * 0.35 - 0.28;
      normY = (normY - (-0.48)) * 0.35 + 0.16;
    } else if (lon < -150 && lat < 25) {
      // Hawaii
      normX = (normX - (-0.40)) * 0.8 - 0.16;
      normY = (normY - (0.15)) * 0.8 + 0.18;
    } else if (lat < 20 && lon > -70) {
      // Puerto Rico
      normX = (normX - (0.42)) * 0.8 + 0.28;
      normY = (normY - (0.28)) * 0.8 + 0.18;
    }

    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    const pad = 35;
    const scaleFactor = Math.min((w - pad * 2) / 0.74, (h - pad * 2) / 0.48);

    const baseX = w / 2 + (normX - (-0.0078)) * scaleFactor;
    const baseY = h / 2 + (normY - (-0.0208)) * scaleFactor;

    const finalX = (baseX - w / 2) * this.scale + w / 2 + this.panX;
    const finalY = (baseY - h / 2) * this.scale + h / 2 + this.panY;

    return { x: finalX, y: finalY };
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

    // 1. Draw subtle background coordinate grid
    this.drawBackgroundGrid(ctx, w, h);

    // 2. Draw official US State geographic boundaries and landmass fills
    this.drawStateBoundaries(ctx);

    // 3. Draw active Hub-and-Spoke Spider lines
    this.drawConnections(ctx);

    // 4. Draw facility nodes by tier (Spokes -> LPCs -> S&DCs -> RPDCs)
    const tierOrder = ['SPOKE', 'LPC', 'S&DC', 'RPDC'];
    tierOrder.forEach(tier => {
      this.facilities.filter(f => f.type === tier).forEach(f => {
        this.drawNode(ctx, f);
      });
    });

    ctx.restore();
  }

  drawBackgroundGrid(ctx, w, h) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
    ctx.lineWidth = 1;

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

  drawStateBoundaries(ctx) {
    if (!this.geoData || !this.geoData.features) return;

    ctx.save();

    // Fill each state with dark glassmorphism styling
    ctx.fillStyle = "rgba(18, 26, 44, 0.65)";
    ctx.strokeStyle = "rgba(71, 85, 105, 0.35)"; // subtle state border
    ctx.lineWidth = 1.0;

    this.geoData.features.forEach(feat => {
      const geom = feat.geometry;
      if (!geom) return;

      const polygons = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;

      polygons.forEach(poly => {
        poly.forEach(ring => {
          if (!ring.length) return;
          ctx.beginPath();
          ring.forEach((pt, idx) => {
            const coords = this.project(pt[1], pt[0]);
            if (idx === 0) ctx.moveTo(coords.x, coords.y);
            else ctx.lineTo(coords.x, coords.y);
          });
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
      });
    });

    ctx.restore();
  }

  drawConnections(ctx) {
    if (!this.connections.length) return;

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
        ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
      } else {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
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
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
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

    if (isSelected) {
      // Draw targeting radar ring
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw facility floating label pill
      ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      const text = `${f.name} (${f.city}, ${f.state})`;
      const textWidth = ctx.measureText(text).width;
      
      ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-textWidth / 2 - 8, -36, textWidth + 16, 20, 4);
      } else {
        ctx.rect(-textWidth / 2 - 8, -36, textWidth + 16, 20);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(text, 0, -22);
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
