/**
 * Pantalla 1: Despacho • Inicio de Ruta
 */


function addHoursToTime(timeStr, hoursToAdd) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + hoursToAdd * 60;
  const resultHours = Math.floor(totalMinutes / 60) % 24;
  const resultMinutes = totalMinutes % 60;
  return `${String(resultHours).padStart(2, '0')}:${String(resultMinutes).padStart(2, '0')}`;
}

function renderAssignmentOptions(options, selectedId) {
  return options.map(option => `
    <option value="${option.id}" ${option.id === selectedId ? 'selected' : ''}>${option.label}</option>
  `).join('');
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
              <span class="material-symbols-outlined" style="font-size: 18px; color: ${state.fuelLevel.preset ? 'var(--color-primary)' : '#94a3b8'};">local_gas_station</span>
              <span class="font-label-sm" style="color: #64748b;">COMBUSTIBLE</span>
            </div>
            <span class="font-label-sm" style="color: var(--color-primary); font-weight: 800;">VER &gt;</span>
          </div>
          <div style="margin-top: 8px;">
            ${state.fuelLevel.preset ? `
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <span class="font-headline-sm">${state.fuelLevel.liters} L</span>
                <span class="font-label-sm" style="color: #64748b;">${Math.round(state.fuelLevel.liters / 250 * 100)}%</span>
              </div>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; height: 8px; margin-top: 6px;">
                ${[0, 25, 50, 75].map(threshold => {
                  const pct = state.fuelLevel.liters / 250 * 100;
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

        <div>
          <label class="font-label-sm" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>1. NO. DE UNIDAD (CAMIÓN)</span>
          </label>
          <select class="input-tactical" id="select-unit" style="font-weight: 700;">
            ${renderAssignmentOptions(state.dispatchOptions.units, state.assignment.unitId)}
          </select>
        </div>

        <div>
          <label class="font-label-sm" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>2. OPERADOR / CHOFER TITULAR</span>
          </label>
          <select class="input-tactical" id="select-driver" style="font-weight: 700;">
            ${renderAssignmentOptions(state.dispatchOptions.drivers, state.assignment.driverId)}
          </select>
        </div>

        <div>
          <label class="font-label-sm" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>3. AUXILIAR</span>
          </label>
          <select class="input-tactical" id="select-assistant" style="font-weight: 700;">
            ${renderAssignmentOptions(state.dispatchOptions.assistants, state.assignment.assistantId)}
          </select>
        </div>

        <!-- Ruta programada -->
        <div>
          <label class="font-label-sm" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>RUTA ASIGNADA</span>
            <span style="background-color: #359ade; color: #ffffff; padding: 2px 6px; font-size: 11px;">RUTA 01</span>
          </label>
          <div style="border: 2px solid #0f172a; padding: 12px; background-color: #eff4ff; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div class="font-headline-sm" style="color: #0f172a;">RUTA 01</div>
              <div class="font-label-sm" style="color: #64748b; margin-top: 2px;">
                ${state.route.totalStops} PARADAS A REALIZAR
              </div>
            </div>
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
  container.querySelector('#select-unit')?.addEventListener('change', (event) => {
    store.setDispatchAssignment('unitId', event.currentTarget.value, false);
  });

  container.querySelector('#select-driver')?.addEventListener('change', (event) => {
    store.setDispatchAssignment('driverId', event.currentTarget.value, false);
  });

  container.querySelector('#select-assistant')?.addEventListener('change', (event) => {
    store.setDispatchAssignment('assistantId', event.currentTarget.value, false);
  });

  container.querySelector('#btn-goto-fuel')?.addEventListener('click', () => {
    store.setScreen('fuel');
  });

  container.querySelector('#btn-goto-inspection')?.addEventListener('click', () => {
    store.setScreen('inspection');
  });

  container.querySelector('#btn-start-route')?.addEventListener('click', () => {
    if (!store.state.fuelLevel.preset) {
      store.showToast('Registra el nivel de combustible antes de iniciar la ruta.', 'info');
      return;
    }

    if (!store.state.inspection360.completed) {
      store.showToast('Completa la inspección 360° antes de iniciar la ruta.', 'info');
      return;
    }

    store.startRoute();
    store.showToast('¡Ruta iniciada! Dirígete al primer punto de recolección y escanea el código QR.', 'success');
    store.setScreen('map');
  });
}
