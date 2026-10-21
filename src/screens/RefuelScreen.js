/**
 * Pantalla: Registro de carga de combustible en gasolinera durante la ruta.
 * Distinta del nivel preoperativo (FuelLevelScreen): aquí se registra lo que se cargó.
 */

import { fieldPhotoOptions, renderPhotoThumbnails } from '../components/FieldPhotos.js';
import { openPhotoCapture } from '../components/PhotoCaptureOverlay.js';
import { normalizeFuelLoad, validateFuelLoad } from '../domain/fieldEvents.js';
import { queueFieldAction } from '../services/fieldSync.js';
import { getCurrentPosition } from '../utils/geolocation.js';
import { escapeHtml } from '../utils/html.js';

const numericFields = [
  { key: 'liters', label: 'LITROS CARGADOS', unit: 'L', placeholder: '0.0', inputmode: 'decimal', required: true },
  { key: 'amount', label: 'IMPORTE (OPCIONAL)', unit: '$', placeholder: '0.00', inputmode: 'decimal' },
  { key: 'odometerKm', label: 'ODÓMETRO (OPCIONAL)', unit: 'KM', placeholder: '0', inputmode: 'numeric' }
];

const getRefuelDraft = (state) => ({
  liters: '',
  amount: '',
  odometerKm: '',
  ticketPhoto: null,
  ...state.formDrafts.refuel
});

export function renderRefuelScreen(state) {
  const draft = getRefuelDraft(state);
  const ready = !validateFuelLoad(draft);

  return `
    <div class="screen-header-bar">
      <div class="screen-header-title">
        <span class="material-symbols-outlined">local_gas_station</span>
        <span>CARGA DE COMBUSTIBLE</span>
      </div>
      <button type="button" class="btn-tactical btn-tactical-sm" id="btn-refuel-back">MAPA</button>
    </div>

    <div class="screen-body">
      <div class="card-tactical card-compact field-number-fields">
        ${numericFields.map((field) => `
          <label class="field-number">
            <span class="font-label-sm text-soft">${field.label}</span>
            <span class="field-number-input">
              <input type="text" inputmode="${field.inputmode}" data-field="${field.key}" value="${escapeHtml(draft[field.key])}" placeholder="${field.placeholder}" autocomplete="off"${field.required ? ' required' : ''}>
              <span class="field-number-unit">${field.unit}</span>
            </span>
          </label>
        `).join('')}
      </div>

      <div class="card-tactical card-compact">
        <div class="section-title">
          <span class="material-symbols-outlined icon-19 text-primary">receipt_long</span>
          <span class="font-label-sm text-ink fw-800">FOTO DEL TICKET O DE LA BOMBA</span>
        </div>
        ${draft.ticketPhoto ? renderPhotoThumbnails([draft.ticketPhoto]) : ''}
        <button type="button" class="btn-tactical${draft.ticketPhoto ? ' evidence-captured' : ''}" id="btn-refuel-photo">
          <span class="material-symbols-outlined icon-20">${draft.ticketPhoto ? 'check_circle' : 'photo_camera'}</span>
          <span>${draft.ticketPhoto ? 'TOMAR OTRA FOTO' : 'TOMAR FOTO'}</span>
        </button>
      </div>

      <p class="font-body-sm text-muted">La ubicación GPS y la hora se registran automáticamente.</p>

      <button type="button" class="btn-tactical btn-tactical-primary btn-gated" id="btn-save-refuel" ${ready ? '' : 'disabled'}>
        <span class="material-symbols-outlined icon-22">save</span>
        <span>GUARDAR CARGA</span>
      </button>
    </div>
  `;
}

export function attachRefuelEvents(container, store) {
  const saveDraft = (patch, shouldNotify = false) => store.updateFormDraft('refuel', patch, shouldNotify);
  const saveButton = container.querySelector('#btn-save-refuel');
  const updateSaveButton = () => {
    saveButton.disabled = Boolean(validateFuelLoad(getRefuelDraft(store.state)));
  };
  const positionPromise = getCurrentPosition();

  container.querySelector('#btn-refuel-back')?.addEventListener('click', () => {
    store.setScreen('map');
  });

  container.querySelectorAll('[data-field]').forEach((input) => {
    input.addEventListener('input', () => {
      // Digits and one decimal point; a comma typed on Spanish keyboards counts as the point.
      input.value = input.value.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
      saveDraft({ [input.getAttribute('data-field')]: input.value });
      updateSaveButton();
    });
  });

  container.querySelector('#btn-refuel-photo')?.addEventListener('click', () => {
    openPhotoCapture(
      (ticketPhoto) => saveDraft({ ticketPhoto }, true),
      (message) => store.showToast(message, 'info'),
      fieldPhotoOptions
    );
  });

  container.querySelector('.field-photo-remove')?.addEventListener('click', () => {
    saveDraft({ ticketPhoto: null }, true);
  });

  saveButton?.addEventListener('click', async () => {
    const draft = getRefuelDraft(store.state);
    const validationError = validateFuelLoad(draft);
    if (validationError) {
      store.showToast(validationError, 'info');
      return;
    }

    saveButton.disabled = true;
    saveButton.querySelector('span:last-child').textContent = 'GUARDANDO...';
    const position = await positionPromise;
    const { route } = store.state;

    try {
      const queued = await queueFieldAction('refuel', {
        routeId: route.id,
        ...normalizeFuelLoad(draft),
        ticketPhoto: draft.ticketPhoto,
        latitude: position?.latitude ?? null,
        longitude: position?.longitude ?? null
      });
      store.clearFormDraft('refuel');
      store.showToast(queued
        ? 'Carga de combustible registrada.'
        : 'Carga de combustible registrada en modo local.', queued ? 'success' : 'info');
      store.setScreen('map');
    } catch (error) {
      store.showToast(`No se pudo guardar la carga en el dispositivo: ${error.message}`, 'info', 8000);
      if (saveButton.isConnected) {
        saveButton.querySelector('span:last-child').textContent = 'GUARDAR CARGA';
        updateSaveButton();
      }
    }
  });
}
