/**
 * Tactical HUD Top Status Bar
 * Displays battery, GPS signal, current unit ID, and synchronized time
 */

export function renderAppHeader(state) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

  return `
    <header class="hud-status-bar">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="telemetry-tag" style="display: inline-flex; align-items: center; gap: 4px;">
          <span style="width: 8px; height: 8px; background-color: #00a86b; display: inline-block;"></span>
          ${state.unit.id} • ${state.route.id}
        </span>
      </div>
      <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: #f8fafc;">
        ${timeStr} HRS
      </div>
      <div class="hud-status-bar-indicators">
        <span style="display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: #38bdf8;">
          <span class="material-symbols-outlined" style="font-size: 15px;">satellite_alt</span> GPS OK
        </span>
        <span style="display: inline-flex; align-items: center; gap: 2px; font-size: 11px; color: #4ade80;">
          <span class="material-symbols-outlined" style="font-size: 15px;">battery_charging_full</span> 94%
        </span>
      </div>
    </header>
  `;
}
