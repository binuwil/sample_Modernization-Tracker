/**
 * USPS DFA Tracker - Data Loader & Network Manager
 * Loads facilities, network graph connections, calculates metrics, handles CSV ingestion.
 */

export class DataLoader {
  constructor() {
    this.facilities = [];
    this.connections = [];
    this.isLoaded = false;
  }

  async loadInitialData() {
    try {
      const res = await fetch('data/facilities.json');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      this.facilities = data.facilities || [];
      this.connections = data.connections || [];
      this.isLoaded = true;
      return true;
    } catch (err) {
      console.error("Failed to load facilities.json:", err);
      return false;
    }
  }

  getFilteredFacilities(filters = {}) {
    let list = this.facilities;

    if (filters.type && filters.type !== 'ALL') {
      list = list.filter(f => f.type === filters.type);
    }

    if (filters.status && filters.status !== 'ALL') {
      list = list.filter(f => f.status === filters.status);
    }

    if (filters.wave && filters.wave !== 'ALL') {
      list = list.filter(f => f.launch_wave === filters.wave);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.city.toLowerCase().includes(q) ||
        f.state.toLowerCase().includes(q) ||
        f.facility_id.toLowerCase().includes(q)
      );
    }

    return list;
  }

  calculateKpis() {
    let totalRoutes = 0;
    let totalEvChargers = 0;
    let operationalCount = 0;
    let inProgressCount = 0;
    let pausedCount = 0;
    let totalSpokeDistance = 0;
    let spokeCountWithDist = 0;

    this.facilities.forEach(f => {
      totalRoutes += (f.carrier_routes || 0);
      totalEvChargers += (f.ev_chargers || 0);

      if (f.status === 'Operational') operationalCount++;
      else if (f.status === 'In Progress') inProgressCount++;
      else if (f.status === 'Paused') pausedCount++;

      if (f.distance_to_sdc) {
        totalSpokeDistance += f.distance_to_sdc;
        spokeCountWithDist++;
      }
    });

    const avgRadius = spokeCountWithDist > 0 ? (totalSpokeDistance / spokeCountWithDist).toFixed(1) : 0;

    return {
      totalFacilities: this.facilities.length,
      rpdcCount: this.facilities.filter(f => f.type === 'RPDC').length,
      lpcCount: this.facilities.filter(f => f.type === 'LPC').length,
      sdcCount: this.facilities.filter(f => f.type === 'S&DC').length,
      spokeCount: this.facilities.filter(f => f.type === 'SPOKE').length,
      totalRoutes,
      totalEvChargers,
      operationalCount,
      inProgressCount,
      pausedCount,
      avgRadius
    };
  }

  getFacilityById(id) {
    return this.facilities.find(f => f.facility_id === id) || null;
  }

  getConnectionsForFacility(id) {
    return this.connections.filter(c => c.from_id === id || c.to_id === id);
  }

  getSpokesForSdc(sdcId) {
    return this.facilities.filter(f => f.parent_hub === sdcId);
  }

  /**
   * Parse uploaded CSV file
   */
  ingestCsv(csvText) {
    try {
      const lines = csvText.trim().split(/\r?\n/);
      if (lines.length < 2) throw new Error("Empty CSV or missing headers");

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const newFacilities = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const values = [];
        let inQuotes = false;
        let cur = '';
        for (let c = 0; c < line.length; c++) {
          const char = line[c];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            values.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        values.push(cur.trim());

        const obj = {};
        headers.forEach((h, idx) => {
          let val = values[idx] !== undefined ? values[idx].replace(/^["']|["']$/g, '') : '';
          if (!isNaN(val) && val !== '') val = Number(val);
          obj[h] = val;
        });

        if (obj.facility_id && obj.name && obj.latitude && obj.longitude) {
          newFacilities.push(obj);
        }
      }

      if (!newFacilities.length) throw new Error("No valid facilities found in CSV");

      this.facilities = newFacilities;
      return { success: true, count: newFacilities.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  exportToCsv(filters = {}) {
    const list = this.getFilteredFacilities(filters);
    if (!list.length) return null;

    const fields = [
      "facility_id", "name", "type", "city", "state", "status", "launch_wave",
      "launch_date", "carrier_routes", "ev_chargers", "spoke_count", "square_footage"
    ];

    const header = fields.join(',');
    const rows = list.map(item => {
      return fields.map(f => {
        let v = item[f] !== undefined ? item[f] : '';
        if (typeof v === 'string' && v.includes(',')) v = `"${v}"`;
        return v;
      }).join(',');
    });

    return [header, ...rows].join('\n');
  }
}
