/**
 * Pantalla 1: Despacho • Inicio de Ruta
 * Origen: Stitch Screen 05/06 (screen_5_2d6a8f48e46b4969859ced77c06260fd)
 */

/**
 * Suma horas a un string de tiempo en formato HH:MM
 */
function addHoursToTime(timeStr, hoursToAdd) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + hoursToAdd * 60;
  const resultHours = Math.floor(totalMinutes / 60) % 24;
  const resultMinutes = totalMinutes % 60;
  return `${String(resultHours).padStart(2, '0')}:${String(resultMinutes).padStart(2, '0')}`;
}

export function renderDispatchScreen(state) {

  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
  const arrivalTimeStr = addHoursToTime(timeStr, 4);

  return `
    <div class="screen-header-bar">
      <div class="screen-header-title">
        <span class="material-symbols-outlined" style="color: var(--color-primary);">local_shipping</span>
        <span>DESPACHO • INICIO DE RUTA</span>
      </div>
      <div class="status-pill status-pill-optimal" style="font-size: 11px;">
        <span class="material-symbols-outlined" style="font-size: 14px;">check_circle</span>
        PRE-OPERATIVO
      </div>
    </div>

    <div style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
      <!-- Rapid Diagnostic Badges -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div class="card-tactical" id="btn-goto-fuel" style="cursor: pointer; padding: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span class="material-symbols-outlined" style="font-size: 18px; color: ${state.fuelLog.preset ? 'var(--color-primary)' : '#94a3b8'};">local_gas_station</span>
              <span class="font-label-sm" style="color: #64748b;">COMBUSTIBLE</span>
            </div>
            <span class="font-label-sm" style="color: var(--color-primary); font-weight: 800;">VER &gt;</span>
          </div>
          <div style="margin-top: 8px;">
            ${state.fuelLog.preset ? `
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <span class="font-headline-sm">${state.fuelLog.liters} L</span>
                <span class="font-label-sm" style="color: #64748b;">${Math.round(state.fuelLog.liters / 250 * 100)}%</span>
              </div>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; height: 8px; margin-top: 6px;">
                ${[0, 25, 50, 75].map(threshold => {
                  const pct = state.fuelLog.liters / 250 * 100;
                  const filled = pct >= threshold + 1;
                  return `<div style="background-color: ${filled ? '#00a86b' : '#cbd5e1'}; border: 1px solid #0f172a;"></div>`;
                }).join('')}
              </div>
            ` : `
              <span class="font-headline-sm" style="color: #94a3b8;">PENDIENTE</span>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; height: 8px; margin-top: 6px;">
                <div style="background-color: #cbd5e1; border: 1px solid #0f172a;"></div>
                <div style="background-color: #cbd5e1; border: 1px solid #0f172a;"></div>
                <div style="background-color: #cbd5e1; border: 1px solid #0f172a;"></div>
                <div style="background-color: #cbd5e1; border: 1px solid #0f172a;"></div>
              </div>
            `}
          </div>
        </div>

        <div class="card-tactical" id="btn-goto-inspection" style="cursor: pointer; padding: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="font-label-sm" style="color: #64748b;">INSPECCIÓN 360°</span>
            <span class="material-symbols-outlined" style="font-size: 18px; color: ${state.inspection360.completed ? 'var(--color-primary)' : '#94a3b8'};">
              ${state.inspection360.completed ? 'verified' : 'pending'}
            </span>
          </div>
          <div style="margin-top: 8px;">
            ${(() => {
              const total = 9;
              const reviewed = Object.values(state.inspection360).filter(v => v !== null && v !== false && typeof v === 'string').length;
              return `
                <span class="font-headline-sm" style="color: ${state.inspection360.completed ? 'var(--color-primary)' : '#64748b'};">
                  ${state.inspection360.completed ? 'COMPLETO' : 'PENDIENTE'}
                </span>
                <p class="font-label-sm" style="color: #64748b; margin-top: 4px;">${reviewed} / ${total} PUNTOS REVISADOS</p>
              `;
            })()}
          </div>
        </div>
      </div>

      <!-- Main Assignment Form -->
      <div class="card-tactical" style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px;">
          <h2 class="font-headline-sm" style="color: #0f172a;">DATOS DE ASIGNACIÓN TÁCTICA</h2>
        </div>

        <!-- Field 1: Unidad -->
        <div>
          <label class="font-label-sm" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>1. NO. DE UNIDAD (CAMIÓN)</span>
          </label>
          <div style="position: relative;">
            <select class="input-tactical" id="select-unit" style="padding-left: 38px; font-weight: 700;">
              <option value="U-14" selected>U-14</option>
              <option value="U-08">U-08</option>
              <option value="U-03">U-03</option>
            </select>
            <span class="material-symbols-outlined" style="position: absolute; left: 10px; top: 12px; font-size: 20px; color: #0f172a;">rv_hookup</span>
          </div>
        </div>

        <!-- Field 2: Chofer Titular -->
        <div>
          <label class="font-label-sm" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>2. OPERADOR / CHOFER TITULAR</span>
          </label>
          <div style="position: relative;">
            <select class="input-tactical" id="select-driver" style="padding-left: 38px; font-weight: 700;">
              <option value="carlos">Carlos Mendoza</option>
              <option value="fernando">Fernando Garza</option>
              <option value="martin">Martín Valenzuela</option>
            </select>
            <span class="material-symbols-outlined" style="position: absolute; left: 10px; top: 12px; font-size: 20px; color: #0f172a;">badge</span>
          </div>
        </div>

        <!-- Field 3: Auxiliar -->
        <div>
          <label class="font-label-sm" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>3. AUXILIAR</span>
          </label>
          <div style="position: relative;">
            <select class="input-tactical" id="select-assistant" style="padding-left: 38px; font-weight: 700;">
              <option value="carlos">Carlos Mendoza</option>
              <option value="fernando">Fernando Garza</option>
              <option value="martin">Martín Valenzuela</option>
            </select>
            <span class="material-symbols-outlined" style="position: absolute; left: 10px; top: 12px; font-size: 20px; color: #0f172a;">badge</span>
          </div>
        </div>

        <!-- Field 3: Ruta Programada Card -->
        <div>
          <label class="font-label-sm" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>3. RUTA ASIGNADA</span>
            <span style="background-color: #359ade; color: #ffffff; padding: 2px 6px; font-size: 11px;">R-04 NORTE</span>
          </label>
          <div style="border: 2px solid #0f172a; padding: 12px; background-color: #eff4ff; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div class="font-headline-sm" style="color: #0f172a;">R-04: CENTRO HISTÓRICO</div>
              <div class="font-label-sm" style="color: #64748b; margin-top: 2px;">
                ${state.stops.length} PUNTOS DE RECOLECCIÓN PROGRAMADOS
              </div>
            </div>
            <button type="button" class="btn-tactical btn-tactical-sm" id="btn-view-map-preview">
              VER MAPA
            </button>
          </div>
        </div>

        <!-- Time Blocks -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label class="font-label-sm" style="color: #475569; margin-bottom: 4px; display: block;">HORA SALIDA</label>
            <div style="border: 2px solid #0f172a; padding: 10px; background-color: #ffffff; font-family: var(--font-headline); font-size: 18px; font-weight: 800; display: flex; justify-content: space-between;">
              <span>${timeStr}</span>
              <span class="material-symbols-outlined" style="font-size: 18px; color: #64748b;">schedule</span>
            </div>
          </div>
          <div>
            <label class="font-label-sm" style="color: #475569; margin-bottom: 4px; display: block;">LLEGADA EST.</label>
            <div style="border: 2px solid #0f172a; padding: 10px; background-color: #ffffff; font-family: var(--font-headline); font-size: 18px; font-weight: 800; display: flex; justify-content: space-between;">
              <span>${arrivalTimeStr}</span>
              <span class="material-symbols-outlined" style="font-size: 18px; color: #64748b;">schedule</span>
            </div>
          </div>
        </div>

        <!-- Master Dispatch Action -->
        <button type="button" class="btn-tactical btn-tactical-primary" id="btn-start-route" style="margin-top: 6px;">
          <span class="material-symbols-outlined" style="font-size: 24px;">play_arrow</span>
          <span>INICIAR RUTA Y MONITOREO</span>
        </button>
      </div>
    </div>
  `;
}

export function attachDispatchScreenEvents(container, store) {
  container.querySelector('#btn-goto-fuel')?.addEventListener('click', () => {
    store.setScreen('fuel');
  });

  container.querySelector('#btn-goto-inspection')?.addEventListener('click', () => {
    store.setScreen('inspection');
  });

  container.querySelector('#btn-view-map-preview')?.addEventListener('click', () => {
    store.setScreen('map');
  });

  container.querySelector('#btn-start-route')?.addEventListener('click', () => {
    store.showToast('¡Ruta R-04 iniciada! Telemetría y monitoreo GPS activos.');
    store.setScreen('map');
  });
}
