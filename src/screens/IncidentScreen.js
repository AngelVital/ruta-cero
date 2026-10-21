/**
 * Pantalla: Reporte de incidencia en ruta (choque, accidente, avería…).
 * La ruta sigue activa; el reporte se envía al panel administrativo.
 */

import { fieldPhotoOptions, renderPhotoThumbnails } from '../components/FieldPhotos.js';
import { openPhotoCapture } from '../components/PhotoCaptureOverlay.js';
import {
  incidentSeverities,
  incidentTypes,
  maxIncidentPhotos,
  validateIncident
} from '../domain/fieldEvents.js';
import { queueFieldAction } from '../services/fieldSync.js';
import { getCurrentPosition } from '../utils/geolocation.js';
import { escapeHtml } from '../utils/html.js';

function getIncidentDraft(state) {
  const draft = state.formDrafts.incident;
  return {
    type: draft.type || null,
    severity: draft.severity || null,
    description: draft.description || '',
    photos: Array.isArray(draft.photos) ? draft.photos : []
  };
}

export function renderIncidentScreen(state) {
  const { type, severity, description, photos } = getIncidentDraft(state);
  const ready = !validateIncident({ type, severity, description, photos });

  return `
    <div class="screen-header-bar">
      <div class="screen-header-title">
        <span class="material-symbols-outlined">report</span>
        <span>REPORTAR INCIDENCIA</span>
      </div>
      <button type="button" class="btn-tactical btn-tactical-sm" id="btn-incident-back">MAPA</button>
    </div>

    <div class="screen-body">
      <div class="card-tactical card-compact">
        <span class="font-label-sm text-soft incidents-title">TIPO DE INCIDENCIA</span>
        <div class="field-choice-grid">
          ${incidentTypes.map((item) => `
            <button type="button" class="btn-tactical field-choice${type === item.key ? ' active' : ''}" data-incident-type="${item.key}" aria-pressed="${type === item.key}">
              <span class="material-symbols-outlined icon-22">${item.icon}</span>
              <span>${item.label.toUpperCase()}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="card-tactical card-compact">
        <span class="font-label-sm text-soft incidents-title">GRAVEDAD</span>
        <div class="field-severity-row">
          ${incidentSeverities.map((item) => `
            <button type="button" class="btn-tactical field-severity severity-${item.key}${severity === item.key ? ' active' : ''}" data-severity="${item.key}" aria-pressed="${severity === item.key}">
              ${item.label}
            </button>
          `).join('')}
        </div>
        <a class="btn-tactical btn-tactical-primary field-emergency-call" href="tel:911" ${severity === 'high' ? '' : 'hidden'}>
          <span class="material-symbols-outlined icon-20">call</span>
          <span>LLAMAR AL 911</span>
        </a>
      </div>

      <div class="card-tactical card-compact">
        <label class="font-label-sm text-soft incidents-title" for="incident-description">DESCRIPCIÓN</label>
        <textarea id="incident-description" class="incident-comments" rows="3" placeholder="¿Qué pasó? Vehículos involucrados, daños, lesionados...">${escapeHtml(description)}</textarea>
      </div>

      <div class="card-tactical card-compact">
        <div class="section-title">
          <span class="material-symbols-outlined icon-19 text-primary">photo_library</span>
          <span class="font-label-sm text-ink fw-800">EVIDENCIA (${photos.length}/${maxIncidentPhotos})</span>
        </div>
        ${renderPhotoThumbnails(photos)}
        <button type="button" class="btn-tactical btn-gated" id="btn-incident-photo" ${photos.length >= maxIncidentPhotos ? 'disabled' : ''}>
          <span class="material-symbols-outlined icon-20">photo_camera</span>
          <span>TOMAR FOTO</span>
        </button>
      </div>

      <p class="font-body-sm text-muted">La ubicación GPS y la hora se registran automáticamente. La ruta continúa activa.</p>

      <button type="button" class="btn-tactical btn-tactical-primary btn-gated" id="btn-save-incident" ${ready ? '' : 'disabled'}>
        <span class="material-symbols-outlined icon-22">send</span>
        <span>ENVIAR INCIDENCIA</span>
      </button>
    </div>
  `;
}

export function attachIncidentEvents(container, store) {
  const saveDraft = (patch, shouldNotify = false) => store.updateFormDraft('incident', patch, shouldNotify);
  const saveButton = container.querySelector('#btn-save-incident');
  const updateSaveButton = () => {
    saveButton.disabled = Boolean(validateIncident(getIncidentDraft(store.state)));
  };
  // Started now so the position is usually ready by the time the form is sent.
  const positionPromise = getCurrentPosition();

  container.querySelector('#btn-incident-back')?.addEventListener('click', () => {
    store.setScreen('map');
  });

  const selectIn = (selector, attribute, onSelect) => {
    container.querySelectorAll(selector).forEach((button) => {
      button.addEventListener('click', () => {
        container.querySelectorAll(selector).forEach((other) => {
          other.classList.toggle('active', other === button);
          other.setAttribute('aria-pressed', String(other === button));
        });
        onSelect(button.getAttribute(attribute));
        updateSaveButton();
      });
    });
  };

  selectIn('.field-choice', 'data-incident-type', (type) => saveDraft({ type }));
  selectIn('.field-severity', 'data-severity', (severity) => {
    saveDraft({ severity });
    container.querySelector('.field-emergency-call').hidden = severity !== 'high';
  });

  container.querySelector('#incident-description')?.addEventListener('input', (event) => {
    saveDraft({ description: event.currentTarget.value });
    updateSaveButton();
  });

  container.querySelector('#btn-incident-photo')?.addEventListener('click', () => {
    openPhotoCapture((photo) => {
      const { photos } = getIncidentDraft(store.state);
      saveDraft({ photos: [...photos, photo].slice(0, maxIncidentPhotos) }, true);
    }, (message) => store.showToast(message, 'info'), fieldPhotoOptions);
  });

  container.querySelectorAll('.field-photo-remove').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.getAttribute('data-photo-index'));
      saveDraft({ photos: getIncidentDraft(store.state).photos.filter((_, i) => i !== index) }, true);
    });
  });

  saveButton?.addEventListener('click', async () => {
    const draft = getIncidentDraft(store.state);
    const validationError = validateIncident(draft);
    if (validationError) {
      store.showToast(validationError, 'info');
      return;
    }

    saveButton.disabled = true;
    saveButton.querySelector('span:last-child').textContent = 'ENVIANDO...';
    const position = await positionPromise;
    const { route, activeContainerId } = store.state;

    try {
      const queued = await queueFieldAction('incident', {
        routeId: route.id,
        stopId: activeContainerId,
        type: draft.type,
        severity: draft.severity,
        description: draft.description.trim(),
        photos: draft.photos,
        latitude: position?.latitude ?? null,
        longitude: position?.longitude ?? null
      });
      store.clearFormDraft('incident');
      store.showToast(queued
        ? 'Incidencia enviada al centro de operaciones.'
        : 'Incidencia registrada en modo local.', queued ? 'success' : 'info');
      store.setScreen('map');
    } catch (error) {
      store.showToast(`No se pudo guardar la incidencia en el dispositivo: ${error.message}`, 'info', 8000);
      if (saveButton.isConnected) {
        saveButton.querySelector('span:last-child').textContent = 'ENVIAR INCIDENCIA';
        updateSaveButton();
      }
    }
  });
}
