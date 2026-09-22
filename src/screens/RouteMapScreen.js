/**
 * Pantalla 4: HUD Táctico - Mapa de Ruta Programada R-04
 */

export function renderRouteMapScreen(state) {
  const activeStop = state.stops.find(s => s.id === state.activeContainerId)
    || state.stops.find(s => s.status === 'active')
    || state.stops[0];
  const destination = `${activeStop.latitude},${activeStop.longitude}`;
  const mapsUrl = `https://www.google.com/maps?q=${destination}&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

  return `
    <div class="route-google-map" aria-label="Ubicación de ${activeStop.id}">
      <iframe
        src="${mapsUrl}"
        title="Ubicación de ${activeStop.id}"
        loading="lazy"
        allowfullscreen
      ></iframe>
    </div>

    <div class="screen-header-bar">
      <div class="screen-header-title">
        <span class="material-symbols-outlined" style="color: var(--color-primary);">alt_route</span>
        <span>${activeStop.id} • ${activeStop.code}</span>
      </div>
      <div style="display: flex; gap: 6px;">
        <a class="btn-tactical btn-tactical-sm btn-tactical-primary" href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none;">
          <span class="material-symbols-outlined" style="font-size: 16px;">directions</span>
          <span>CÓMO LLEGAR</span>
        </a>
        <span class="status-pill status-pill-optimal" style="font-size: 11px;">
          ${state.route.completedCount}/${state.stops.length} HECHO
        </span>
      </div>
    </div>

    <!-- Live Telemetry HUD Bar -->
    <div style="background-color: #0f172a; color: #ffffff; padding: 10px 16px; border-bottom: 2px solid #00a86b; display: grid; grid-template-columns: repeat(3, 1fr); text-align: center;">
      <div>
        <span class="font-label-sm" style="color: #64748b; font-size: 11px; display: block;">SIGUIENTE PUNTO</span>
        <strong class="font-headline-sm" style="color: #38bdf8; font-size: 15px;">${activeStop.id}</strong>
      </div>
      <div style="border-left: 1px solid #1e293b; border-right: 1px solid #1e293b;">
        <span class="font-label-sm" style="color: #64748b; font-size: 11px; display: block;">VELOCIDAD</span>
        <strong class="font-headline-sm" style="color: #4ade80; font-size: 15px;">28 KM/H</strong>
      </div>
      <div>
        <span class="font-label-sm" style="color: #64748b; font-size: 11px; display: block;">TIEMPO APROX.</span>
        <strong class="font-headline-sm" style="color: #fbbf24; font-size: 15px;">4 MIN</strong>
      </div>
    </div>

    <!-- Interactive Tactical Map Canvas Area -->
    <div style="position: relative; height: 260px; background: #09121d; border-bottom: 3px solid #0f172a; overflow: hidden;">
      <!-- Grid Background -->
      <div style="position: absolute; inset: 0; background-image: linear-gradient(to right, rgba(0, 168, 107, 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 168, 107, 0.12) 1px, transparent 1px); background-size: 28px 28px;"></div>
      
      <!-- Vector Route Path SVG -->
      <svg style="position: absolute; inset: 0; width: 100%; height: 100%;" viewBox="0 0 390 260">
        <!-- Connecting Route Polyline -->
        <polyline 
          points="40,210 110,180 185,130 260,110 330,70" 
          fill="none" 
          stroke="#00a86b" 
          stroke-width="4" 
          stroke-dasharray="6,4"
        />
        <!-- Stop 1 (Completed) -->
        <circle cx="40" cy="210" r="10" fill="#00a86b" stroke="#ffffff" stroke-width="2" />
        <text x="40" y="235" fill="#94a3b8" font-size="11" font-family="Barlow Condensed" font-weight="bold" text-anchor="middle">CONT-01</text>
        
        <!-- Stop 2 (Completed) -->
        <circle cx="110" cy="180" r="10" fill="#00a86b" stroke="#ffffff" stroke-width="2" />
        <text x="110" y="205" fill="#94a3b8" font-size="11" font-family="Barlow Condensed" font-weight="bold" text-anchor="middle">CONT-02</text>
        
        <!-- Stop 3 (Active Target) -->
        <circle cx="185" cy="130" r="16" fill="none" stroke="#38bdf8" stroke-width="2">
          <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="185" cy="130" r="10" fill="#38bdf8" stroke="#ffffff" stroke-width="2" />
        <text x="185" y="112" fill="#38bdf8" font-size="12" font-family="Barlow Condensed" font-weight="bold" text-anchor="middle">CONT-03 (ACTIVO)</text>
        
        <!-- Stop 4 (Pending) -->
        <circle cx="260" cy="110" r="8" fill="#475569" stroke="#ffffff" stroke-width="2" />
        <text x="260" y="94" fill="#94a3b8" font-size="11" font-family="Barlow Condensed" font-weight="bold" text-anchor="middle">CONT-04</text>
        
        <!-- Stop 5 (Pending) -->
        <circle cx="330" cy="70" r="8" fill="#475569" stroke="#ffffff" stroke-width="2" />
        <text x="330" y="54" fill="#94a3b8" font-size="11" font-family="Barlow Condensed" font-weight="bold" text-anchor="middle">CONT-05</text>
      </svg>

      <!-- Tactical Map Overlay Controls -->
      <div style="position: absolute; right: 12px; bottom: 12px; display: flex; flex-direction: column; gap: 6px;">
        <button type="button" class="btn-tactical btn-tactical-sm btn-map-control" style="width: 38px; height: 38px; padding: 0;">+</button>
        <button type="button" class="btn-tactical btn-tactical-sm btn-map-control" style="width: 38px; height: 38px; padding: 0;">−</button>
        <button type="button" class="btn-tactical btn-tactical-sm btn-map-control" style="width: 38px; height: 38px; padding: 0;" title="Mi ubicación">
          <span class="material-symbols-outlined" style="font-size: 18px;">my_location</span>
        </button>
      </div>

      <!-- Live GPS Banner Inside Map -->
      <div style="position: absolute; left: 12px; top: 12px; background: rgba(15, 23, 42, 0.85); border: 1px solid #00a86b; color: #ffffff; padding: 4px 8px; font-family: var(--font-mono); font-size: 11px;">
        LAT 19.4326° N • LON -99.1332° W
      </div>
    </div>

    <!-- Scheduled Waypoint List Header & Filters -->
    <div style="padding: 12px 16px 6px 16px; background-color: #ffffff; border-bottom: 2px solid #0f172a; display: flex; justify-content: space-between; align-items: center;">
      <h2 class="font-headline-sm" style="margin: 0;">PUNTOS PROGRAMADOS (${state.stops.length})</h2>
    </div>

    <!-- Stops Scrollable Cards -->
    <div style="padding: 12px 16px 70px; display: flex; flex-direction: column; gap: 10px; background-color: #f1f5f9; flex: 1;">
      ${state.stops.map((stop, index) => {
        const isCompleted = stop.status === 'completed';
        const isActive = !isCompleted && stop.id === state.activeContainerId;
        
        let statusBadge = `<span class="status-pill" style="background-color: #94a3b8; color: #ffffff; font-size: 11px;">PENDIENTE</span>`;
        if (isCompleted) {
          statusBadge = `<span class="status-pill status-pill-optimal" style="font-size: 11px;"><span class="material-symbols-outlined" style="font-size: 14px;">check</span>COMPLETADO</span>`;
        } else if (isActive) {
          statusBadge = `<span class="status-pill status-pill-warning" style="font-size: 11px;"><span class="material-symbols-outlined" style="font-size: 14px;">near_me</span>EN CURSO</span>`;
        }

        return `
          <div 
            class="card-tactical stop-item-card" 
            style="cursor: pointer; ${stop.id === activeStop.id ? 'border-color: #0284c7; box-shadow: 4px 4px 0px #0284c7;' : ''}"
            data-container-id="${stop.id}"
          >
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
              <div style="display: flex; align-items: flex-start; gap: 8px; flex: 1; min-width: 0;">
                <span class="material-symbols-outlined" title="Ver ubicación en el mapa" aria-label="Ver ubicación en el mapa" style="color: #0284c7; font-size: 22px; flex-shrink: 0;">location_on</span>
                <span class="font-headline-sm" style="color: #0f172a; font-size: 17px;">[${String(index + 1).padStart(2, '0')}] ${stop.id} • ${stop.code}</span>
              </div>
              <div style="flex-shrink: 0;">${statusBadge}</div>
            </div>

            <div style="display: flex; justify-content: space-between; padding-top: 6px; border-top: 1px solid #e2e8f0; margin-top: 4px;">
            <p class="font-body-sm" style="color: #475569; font-size: 13px; margin-top: 2px;">${stop.address}</p>
              ${isCompleted ? `
                <button
                  type="button"
                  class="btn-tactical btn-tactical-sm btn-report-stop"
                  data-container-id="${stop.id}"
                  style="padding: 0 10px; height: 36px; font-size: 12px;"
                >
                  VER REPORTE
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function attachRouteMapEvents(container, store) {
  container.querySelectorAll('.stop-item-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const cid = card.getAttribute('data-container-id');
      if (cid) {
        store.selectContainer(cid);
        document.getElementById('screen-viewport-root')?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  container.querySelectorAll('.btn-report-stop').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const cid = button.getAttribute('data-container-id');
      if (cid) {
        store.selectContainer(cid);
        store.setScreen('report');
      }
    });
  });

  container.querySelectorAll('.btn-map-control').forEach(btn => {
    btn.addEventListener('click', () => {
      store.showToast('Actualizando telemetría y capas cartográficas GPS', 'info');
    });
  });
}
