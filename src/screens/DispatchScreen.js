/**
 * Pantalla 1: Despacho • Inicio de Ruta
 */
import { attachFieldSignOut, renderFieldOptionsMenu } from '../components/FieldOptionsMenu.js';
import { collectionPoints } from '../data/collectionPoints.js';
import { getFuelPercent, getFuelLevelClass } from '../data/fuel.js';
import { buildDispatchInspection, getInspectionProgress } from '../domain/inspection.js';
import { formatClockTime } from '../utils/format.js';
import { escapeHtml } from '../utils/html.js';
import { queueFieldAction } from '../services/fieldSync.js';
import {
  assignRouteToDate,
  getConfiguredRoutes,
  getOperationalDate,
  getScheduledRoute,
  saveConfiguredRoutes
} from '../services/routeConfiguration.js';

function addHoursToTime(timeStr, hoursToAdd) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + hoursToAdd * 60;
  const resultHours = Math.floor(totalMinutes / 60) % 24;
  const resultMinutes = totalMinutes % 60;
  return `${String(resultHours).padStart(2, '0')}:${String(resultMinutes).padStart(2, '0')}`;
}

// Lets the crew pick a route by the containers it visits, not just its zone.
function getPointNames(pointIds) {
  return pointIds
    .map((pointId) => collectionPoints.find((point) => point.id === pointId)?.name || pointId)
    .join(', ');
}

// Names are typed by admins, so they are escaped.
function renderAssignmentOptions(options, selectedId) {
  const placeholder = options.length ? 'Selecciona…' : 'Sin registros: pide a administración que los agregue';
  return `<option value="">${placeholder}</option>` + options.map(option => `
    <option value="${escapeHtml(option.id)}" ${option.id === selectedId ? 'selected' : ''}>${escapeHtml(option.label)}</option>
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
      <div class="header-actions">
        <div class="status-pill status-pill-optimal status-pill-xs">
          <span class="material-symbols-outlined">check_circle</span>
          PRE-OPERATIVO
        </div>
        ${renderFieldOptionsMenu()}
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
                <span class="font-headline-sm">${Math.round(fuelPercent)}%</span>
              </div>
            ` : `
              <span class="font-headline-sm text-faint">PENDIENTE</span>
            `}
            <div class="fuel-segments ${hasFuel ? getFuelLevelClass(state.fuelLevel.liters) : ''}">${fuelSegments}</div>
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
          ${state.route.id ? `
            <div class="font-label-sm field-caption">RUTA PROGRAMADA PARA HOY</div>
            <div class="input-tactical fw-700" aria-live="polite">
              ${escapeHtml(state.route.id)} · ${escapeHtml(state.route.name)}
            </div>
            <div class="font-label-sm text-muted dispatch-route-note">${state.route.totalStops} PARADAS A REALIZAR</div>
          ` : `
            <label class="font-label-sm dispatch-field-label" for="select-route">
              <span>4. RUTA (SIN PROGRAMACIÓN DE ADMINISTRACIÓN)</span>
            </label>
            <select class="input-tactical fw-700 dispatch-route-missing" id="select-route">
              ${renderAssignmentOptions(getConfiguredRoutes().map((route) => ({ id: route.id, label: `${route.id} · ${route.zone}: ${getPointNames(route.pointIds)}` })), null)}
            </select>
            <div class="font-label-sm text-muted dispatch-route-note">Administración no programó ruta para hoy. Elige una; quedará registrada como elegida en campo.</div>
          `}
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
        <button type="button" class="btn-tactical btn-tactical-primary dispatch-start" id="btn-start-route">
          <span class="material-symbols-outlined icon-24">play_arrow</span>
          <span>INICIAR RUTA Y MONITOREO</span>
        </button>
      </div>
    </div>
  `;
}

export function attachDispatchScreenEvents(container, store) {
  attachFieldSignOut(container, store);
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
    const { assignment, dispatchOptions } = store.state;
    const isListed = (options, id) => options.some((option) => option.id === id);
    // Only shown when the admin scheduled nothing for today.
    const claimedRouteId = container.querySelector('#select-route')?.value;
    if (!store.state.route.id && !claimedRouteId) {
      store.showToast('Elige la ruta que vas a realizar hoy.', 'info');
      return;
    }
    if (!isListed(dispatchOptions.units, assignment.unitId) || !isListed(dispatchOptions.drivers, assignment.driverId)) {
      store.showToast('Selecciona la unidad y el operador antes de iniciar la ruta.', 'info');
      return;
    }

    if (!store.state.fuelLevel.preset) {
      store.showToast('Registra el nivel de combustible antes de iniciar la ruta.', 'info');
      return;
    }

    if (!store.state.inspection360.completed) {
      store.showToast('Completa la inspección 360° antes de iniciar la ruta.', 'info');
      return;
    }

    if (claimedRouteId) {
      const today = getOperationalDate();
      saveConfiguredRoutes(assignRouteToDate(getConfiguredRoutes(), today, claimedRouteId));
      store.applyConfiguredRoute(getScheduledRoute(today), false);
    }
    const routeId = store.startRoute();
    if (!routeId) {
      store.showToast('No hay una ruta programada para hoy. Solicita a administración que programe una.', 'info');
      return;
    }
    event.currentTarget.disabled = true;
    try {
      // Queued first: the server must schedule the route before it accepts the start.
      if (claimedRouteId) await queueFieldAction('claim', { routeId });
      await queueFieldAction('inspection', buildDispatchInspection(store.state));
      await queueFieldAction('start', { routeId });
      store.showToast(`¡${routeId} iniciada! Dirígete al primer punto y escanea el código QR.`, 'success');
    } catch (error) {
      store.showToast(`Ruta iniciada en este dispositivo, pero no se pudo guardar para sincronizar: ${error.message}`, 'info', 8000);
    }
    store.setScreen('map');
  });
}
