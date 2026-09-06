/**
 * USPS DFA Tracker - Facility Inspector Drawer
 * Handles slide-out drill-down inspection for selected RPDCs, LPCs, S&DCs, and Spokes.
 */

export class FacilityInspector {
  constructor(drawerId, closeBtnId, dataLoader, onSelectFacility) {
    this.drawer = document.getElementById(drawerId);
    this.closeBtn = document.getElementById(closeBtnId);
    this.loader = dataLoader;
    this.onSelect = onSelectFacility;

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
  }

  open(facility) {
    if (!this.drawer || !facility) return;

    const badgeClass = facility.type === 'RPDC' ? 'badge-rpdc' : (facility.type === 'LPC' ? 'badge-lpc' : (facility.type === 'S&DC' ? 'badge-sdc' : 'badge-spoke'));
    const statusClass = facility.status === 'Operational' ? 'operational' : (facility.status === 'In Progress' ? 'inprogress' : 'paused');

    let childSpokesHtml = '';
    if (facility.type === 'S&DC') {
      const spokes = this.loader.getSpokesForSdc(facility.facility_id);
      if (spokes.length) {
        childSpokesHtml = `
          <div>
            <h4 style="font-size: 0.82rem; font-weight: 700; color: var(--color-sdc); margin-bottom: 0.5rem; text-transform: uppercase;">
              📍 Consolidated Spoke Post Offices (${spokes.length})
            </h4>
            <div class="spoke-list-wrapper">
              <table class="spoke-table">
                <thead>
                  <tr>
                    <th>Spoke Station</th>
                    <th>Distance</th>
                    <th>Drive Time</th>
                    <th>Routes</th>
                  </tr>
                </thead>
                <tbody>
                  ${spokes.map(s => `
                    <tr style="cursor: pointer;" onclick="window.__dfaApp.selectFacilityById('${s.facility_id}')">
                      <td style="font-weight: 600; color: #fff;">${s.name}</td>
                      <td style="font-family: monospace;">${s.distance_to_sdc} mi</td>
                      <td style="font-family: monospace;">${s.drive_time_minutes} min</td>
                      <td style="font-family: monospace; color: var(--color-sdc); font-weight: bold;">${s.carrier_routes}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }
    } else if (facility.type === 'SPOKE' && facility.parent_hub) {
      const parentHub = this.loader.getFacilityById(facility.parent_hub);
      if (parentHub) {
        childSpokesHtml = `
          <div style="background: rgba(56, 189, 248, 0.06); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 0.85rem;">
            <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">Parent Sorting & Delivery Center:</div>
            <div style="font-size: 0.95rem; font-weight: bold; color: var(--color-rpdc); margin-top: 0.2rem; cursor: pointer;" onclick="window.__dfaApp.selectFacilityById('${parentHub.facility_id}')">
              🏢 ${parentHub.name} (${parentHub.city}, ${parentHub.state}) ↗
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;">
              Carriers commute <b>${facility.distance_to_sdc} miles (~${facility.drive_time_minutes} mins)</b> each morning from ${parentHub.name} to deliver this zone.
            </div>
          </div>
        `;
      }
    }

    this.drawer.querySelector('.drawer-body').innerHTML = `
      <div>
        <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.4rem;">
          <span class="badge-tier ${badgeClass}">${facility.type}</span>
          <span class="status-tag ${statusClass}">${facility.status}</span>
        </div>
        <h2 style="font-size: 1.25rem; font-weight: 700; color: #fff;">${facility.name}</h2>
        <p style="font-size: 0.82rem; color: var(--text-muted);">${facility.city}, ${facility.state} • ID: ${facility.facility_id}</p>
      </div>

      <div class="drawer-spec-grid">
        <div class="drawer-spec-card">
          <div class="drawer-spec-label">Facility Size</div>
          <div class="drawer-spec-val">${facility.square_footage ? (facility.square_footage).toLocaleString() + ' sq ft' : 'N/A'}</div>
        </div>
        <div class="drawer-spec-card">
          <div class="drawer-spec-label">Launch Wave</div>
          <div class="drawer-spec-val">${facility.launch_wave || 'Wave 1'}</div>
        </div>
        <div class="drawer-spec-card">
          <div class="drawer-spec-label">Carrier Routes</div>
          <div class="drawer-spec-val" style="color: var(--color-sdc);">${facility.carrier_routes || 0}</div>
        </div>
        <div class="drawer-spec-card">
          <div class="drawer-spec-label">EV Chargers</div>
          <div class="drawer-spec-val" style="color: #38bdf8;">${facility.ev_chargers || 0}</div>
        </div>
      </div>

      ${childSpokesHtml}

      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.85rem;">
        <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.25rem;">Operational Profile & OIG Notes:</div>
        <div style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.45;">
          ${facility.notes || 'Facility operating under standard Delivering for America modernization parameters.'}
        </div>
      </div>
    `;

    this.drawer.classList.add('open');
  }

  close() {
    if (!this.drawer) return;
    this.drawer.classList.remove('open');
  }
}
