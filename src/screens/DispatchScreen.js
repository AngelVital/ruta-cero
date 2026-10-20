/**
 * Pantalla 1: Despacho • Inicio de Ruta
 */
import { getFuelPercent } from '../data/fuel.js';
import { getInspectionProgress } from '../domain/inspection.js';
import { formatClockTime } from '../utils/format.js';
import { escapeHtml } from '../utils/html.js';

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
  const timeStr = formatClockTime(now);
  const arrivalTimeStr = addHoursToTime(timeStr, 4);
  const hasFuel = Boolean(state.fuelLevel.preset);
  const fuelPercent = getFuelPercent(state.fuelLevel.liters);
  const inspectionDone = state.inspection360.completed;
  const { total, filled: reviewed } = getInspectionProgress(state.inspection360, state.inspectionComments);
  const fuelSegments = [0, 25, 50, 75].map((threshold) => (
    `<div class="fuel-segment${hasFuel && fuelPercent >= threshold + 1 ? ' is-filled' : ''}"></div>`
  )).join('');

  return `
    <div class="screen-header-bar">
      <div class="screen-header-title">
        <span class="material-symbols-outlined">local_shipping</span>
        <span>DESPACHO • INICIO DE RUTA</span>
      </div>
      <div class="status-pill status-pill-optimal status-pill-xs">
        <span class="material-symbols-outlined">check_circle</span>
        PRE-OPERATIVO
      </div>
    </div>

    <div class="screen-body">
      <!-- Rapid Diagnostic Badges -->
      <div class="dispatch-diagnostics">
        <div class="card-tactical dispatch-tile" id="btn-goto-fuel">
          <div class="dispatch-tile-head">
            <div class="dispatch-tile-title">
              <span class="material-symbols-outlined icon-18 ${hasFuel ? 'text-primary' : 'text-faint'}">local_gas_station</span>
              <span class="font-label-sm text-muted">COMBUSTIBLE</span>
            </div>
            <span class="font-label-sm text-primary fw-800">VER &gt;</span>
          </div>
          <div class="dispatch-tile-body">
            ${hasFuel ? `
              <div class="dispatch-fuel-readout">
                <span class="font-headline-sm">${state.fuelLevel.liters} L</span>
                <span class="font-label-sm text-muted">${Math.round(fuelPercent)}%</span>
              </div>
            ` : `
              <span class="font-headline-sm text-faint">PENDIENTE</span>
            `}
            <div class="fuel-segments">${fuelSegments}</div>
          </div>
        </div>

        <div class="card-tactical dispatch-tile" id="btn-goto-inspection">
          <div class="dispatch-tile-head">
            <span class="font-label-sm text-muted">INSPECCIÓN 360°</span>
            <span class="material-symbols-outlined icon-18 ${inspectionDone ? 'text-primary' : 'text-faint'}">
              ${inspectionDone ? 'verified' : 'pending'}
            </span>
          </div>
          <div class="dispatch-tile-body">
            <span class="font-headline-sm ${inspectionDone ? 'text-primary' : 'text-muted'}">
              ${inspectionDone ? 'COMPLETO' : 'PENDIENTE'}
            </span>
            <p class="font-label-sm text-muted dispatch-tile-note">${reviewed} / ${total} PUNTOS REVISADOS</p>
          </div>
        </div>
      </div>

      <!-- Main Assignment Form -->
      <div class="card-tactical dispatch-form">
        <div class="dispatch-form-head">
          <h2 class="font-headline-sm text-ink">DATOS DE ASIGNACIÓN TÁCTICA</h2>
        </div>

        <div>
          <label class="font-label-sm dispatch-field-label" for="select-unit">
            <span>1. NO. DE UNIDAD (CAMIÓN)</span>
          </label>
          <select class="input-tactical fw-700" id="select-unit">
            ${renderAssignmentOptions(state.dispatchOptions.units, state.assignment.unitId)}
          </select>
        </div>

        <div>
          <label class="font-label-sm dispatch-field-label" for="select-driver">
            <span>2. OPERADOR / CHOFER TITULAR</span>
          </label>
          <select class="input-tactical fw-700" id="select-driver">
            ${renderAssignmentOptions(state.dispatchOptions.drivers, state.assignment.driverId)}
          </select>
        </div>

        <div>
          <label class="font-label-sm dispatch-field-label" for="select-assistant">
            <span>3. AUXILIAR</span>
          </label>
          <select class="input-tactical fw-700" id="select-assistant">
            ${renderAssignmentOptions(state.dispatchOptions.assistants, state.assignment.assistantId)}
          </select>
        </div>

        <!-- Ruta programada -->
        <div>
          <div class="font-label-sm field-caption">RUTA PROGRAMADA PARA HOY</div>
          <div class="input-tactical fw-700${state.route.id ? '' : ' dispatch-route-missing'}" aria-live="polite">
            ${state.route.id ? `${escapeHtml(state.route.id)} · ${escapeHtml(state.route.name)}` : 'SIN RUTA PROGRAMADA'}
          </div>
          <div class="font-label-sm text-muted dispatch-route-note">
            ${state.route.id ? `${state.route.totalStops} PARADAS A REALIZAR` : 'Solicita a administración que programe una ruta para hoy.'}
          </div>
        </div>

        <!-- Time Blocks -->
        <div class="dispatch-times">
          <div>
            <span class="font-label-sm text-soft field-caption">HORA SALIDA</span>
            <div class="dispatch-time">
              <span>${timeStr}</span>
              <span class="material-symbols-outlined icon-18 text-muted">schedule</span>
            </div>
          </div>
          <div>
            <span class="font-label-sm text-soft field-caption">LLEGADA EST.</span>
            <div class="dispatch-time">
              <span>${arrivalTimeStr}</span>
              <span class="material-symbols-outlined icon-18 text-muted">schedule</span>
            </div>
          </div>
        </div>

        <!-- Master Dispatch Action -->
        <button type="button" class="btn-tactical btn-tactical-primary dispatch-start" id="btn-start-route" ${state.route.id ? '' : 'disabled'}>
          <span class="material-symbols-outlined icon-24">play_arrow</span>
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

  container.querySelector('#btn-start-route')?.addEventListener('click', async (event) => {
    if (!store.state.fuelLevel.preset) {
      store.showToast('Registra el nivel de combustible antes de iniciar la ruta.', 'info');
      return;
    }

    if (!store.state.inspection360.completed) {
      store.showToast('Completa la inspección 360° antes de iniciar la ruta.', 'info');
      return;
    }

    const routeId = store.startRoute();
    if (!routeId) {
      store.showToast('No hay una ruta programada para hoy. Solicita a administración que programe una.', 'info');
      return;
    }
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const { markRouteStarted } = await import('../services/supabase.js');
      await markRouteStarted(routeId);
      store.showToast(`¡${routeId} iniciada y sincronizada! Dirígete al primer punto y escanea el código QR.`, 'success');
    } catch (error) {
      store.showToast(`Ruta iniciada en este dispositivo, pero no se sincronizó: ${error.message}`, 'info', 8000);
    }
    store.setScreen('map');
  });
}
