/**
 * Pantalla 6: Reporte de Estado del Contenedor
 */

import { normalizeFillLevel, renderCapacityMeter } from '../components/CapacityMeter.js';
import { renderStepperControl, attachStepperEvents } from '../components/StepperControl.js';
import { queueFieldAction } from '../services/fieldSync.js';
import { openPhotoCapture } from '../components/PhotoCaptureOverlay.js';
import { reportPhotoOptions } from '../components/FieldPhotos.js';
import {
  getMissingReportPhotos,
  getTotalMaterialWeight,
  isContainerReportReady,
  validateContainerReport
} from '../domain/report.js';
import { escapeHtml } from '../utils/html.js';

// Each material's color comes from the .material-<key> class in field-screens.css.
const materialOptions = [
  { key: 'plastico', label: 'PLÁSTICO', icon: 'recycling' },
  { key: 'carton', label: 'CARTÓN', icon: 'inventory_2' },
  { key: 'papel', label: 'PAPEL', icon: 'description' }
];

/** In-progress report of a container (store.state.reportDrafts), with defaults and copies. */
function getReportDraft(state, containerId) {
  const draft = state.reportDrafts[containerId] || {};
  const materials = Array.isArray(draft.materials) ? [...draft.materials] : [];
  const materialWeights = { ...draft.materialWeights };
  materials.forEach((matKey) => {
    if (materialWeights[matKey] === undefined) materialWeights[matKey] = 0;
  });

  return {
    fillLevel: normalizeFillLevel(draft.fillLevel),
    materials,
    materialWeights,
    photoEvidence: { ...draft.photoEvidence },
    // JPEG data URLs keyed like photoEvidence (which keeps the capture times).
    photos: { ...draft.photos },
    incidents: { ...draft.incidents },
    incidentComments: draft.incidentComments || ''
  };
}

const capacityLevels = [
  { level: 'low', label: 'BAJO', desc: 'No se requiere recolección', icon: 'battery_2_bar' },
  { level: 'medium', label: 'MEDIO', desc: 'Recolección recomendada', icon: 'warning' },
  { level: 'full', label: 'LLENO', desc: 'Recolección urgente', icon: 'priority_high' }
];

const incidentOptions = [
  { key: 'damaged', label: 'Contenedor dañado' },
  { key: 'graffiti', label: 'Grafiti / vandalismo' },
  { key: 'outsideWaste', label: 'Residuos fuera del contenedor' },
  { key: 'mixedWaste', label: 'Residuos mezclados' }
];

function renderPhotoEvidenceSection(title, prefix, photoEvidence) {
  const photos = [
    { key: `${prefix}Exterior`, label: 'FOTO EXTERIOR', icon: 'photo_camera' },
    { key: `${prefix}Interior`, label: 'FOTO INTERIOR', icon: 'camera' }
  ];

  return `
    <div class="card-tactical photo-evidence-section">
      <div class="section-title">
        <span class="material-symbols-outlined icon-19 text-primary">photo_library</span>
        <span class="font-label-sm text-ink fw-800">${title}</span>
      </div>
      <div class="photo-evidence-grid">
        ${photos.map((photo) => `
          <button type="button" class="btn-tactical btn-photo-evidence${photoEvidence[photo.key] ? ' active evidence-captured' : ''}" data-photo-key="${photo.key}" aria-pressed="${photoEvidence[photo.key] ? 'true' : 'false'}">
            <span class="material-symbols-outlined icon-22">${photo.icon}</span>
            <span class="photo-evidence-label">${photo.label}</span>
            <span class="photo-evidence-status">${photoEvidence[photo.key] ? 'EVIDENCIA CAPTURADA' : 'PENDIENTE'}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderMaterialWeightBar(matKey, value) {
  const mat = materialOptions.find(item => item.key === matKey) || materialOptions[0];
  return `
    <div class="card-tactical material-weight-bar material-${mat.key}" data-material="${matKey}">
      <div class="material-weight-head">
        <span class="material-symbols-outlined material-weight-icon">${mat.icon}</span>
        <span class="font-headline-sm material-weight-name">${mat.label}</span>
      </div>
      <div class="material-weight-stepper">
        ${renderStepperControl({
          id: `weight-${matKey}`,
          value,
          unit: 'KG',
          step: 1,
          min: 0,
          max: 2000,
          editable: true,
          inputClass: 'material-weight-input'
        })}
      </div>
    </div>
  `;
}

function renderMaterialWeightBars(selectedMaterials, materialWeights) {
  return `
    <div id="material-weights-panel" class="material-weights">
      <div class="font-label-sm text-ink fw-800 label-with-icon material-weights-title">
        <span class="material-symbols-outlined icon-18 text-primary">scale</span>
        <span>PESO RECOLECTADO POR MATERIAL</span>
      </div>
      ${selectedMaterials.map((matKey) => renderMaterialWeightBar(matKey, Number(materialWeights[matKey]) || 0)).join('')}
    </div>
  `;
}

function renderCapacityPreset({ level, label, desc, icon }, selectedLevel) {
  const isSelected = selectedLevel === level;
  return `
    <button type="button" class="card-tactical btn-capacity-preset${isSelected ? ' is-selected' : ''}" data-level="${level}">
      <div class="capacity-preset-main">
        <div class="capacity-preset-icon">
          <span class="material-symbols-outlined">${icon}</span>
        </div>
        <div class="capacity-preset-text">
          <strong class="font-headline-sm capacity-preset-name">${label}</strong>
          <div class="font-body-sm capacity-preset-desc">${desc}</div>
        </div>
      </div>
      <span class="material-symbols-outlined capacity-check-icon">
        ${isSelected ? 'check_circle' : 'radio_button_unchecked'}
      </span>
    </button>
  `;
}

export function renderContainerReportScreen(state) {
  const container = state.stops.find(s => s.id === state.activeContainerId) || state.stops[3];
  const {
    fillLevel: initialFill,
    materials: selectedMaterials,
    materialWeights,
    photoEvidence,
    incidents,
    incidentComments
  } = getReportDraft(state, container.id);
  const reportReady = isContainerReportReady(initialFill, selectedMaterials, materialWeights, photoEvidence);

  return `
    <div class="screen-header-bar">
      <div class="screen-header-title">
        <span class="material-symbols-outlined">assignment</span>
        <span>REPORTE DE CONTENEDOR</span>
      </div>
      <button type="button" class="btn-tactical btn-tactical-sm" id="btn-report-back">
        MAPA
      </button>
    </div>

    <div class="screen-body">
      <!-- Container Identification Header Card -->
      <div class="card-tactical card-tactical-accent report-header">
        <h2 class="font-headline-lg text-ink">${container.id} • ${container.code}</h2>
        <p class="font-body-sm text-soft report-address">${container.address}</p>
      </div>

      ${renderPhotoEvidenceSection('EVIDENCIA INICIAL DEL CONTENEDOR', 'initial', photoEvidence)}

      <!-- Capacity Level Selector with Dynamic Bar Update -->
      <div class="card-tactical report-capacity">
        <div id="capacity-meter-mount">
          ${renderCapacityMeter(initialFill)}
        </div>

        <div class="capacity-presets" id="capacity-presets-container">
          ${capacityLevels.map((level) => renderCapacityPreset(level, initialFill)).join('')}
        </div>
      </div>

      <div class="card-tactical card-compact">
        <div class="report-materials-head">
          <label class="font-label-sm text-ink fw-800 label-with-icon">
            <span class="material-symbols-outlined icon-18 text-primary">category</span>
            <span>CLASIFICACIÓN DE RESIDUO (MÚLTIPLE)</span>
          </label>
          <span id="material-count-badge" class="font-label-sm material-count-badge">
            ${selectedMaterials.length} SELECCIONADO${selectedMaterials.length === 1 ? '' : 'S'}
          </span>
        </div>
        <p class="font-body-sm report-materials-hint">
          Selecciona uno o varios tipos de residuo presentes en el contenedor:
        </p>

        <div class="material-choices" id="materials-container">
          ${materialOptions.map((mat) => `
            <button
              type="button"
              class="btn-tactical btn-material-choice material-${mat.key}${selectedMaterials.includes(mat.key) ? ' active' : ''}"
              data-material="${mat.key}"
            >
              <span class="material-symbols-outlined icon-20">${mat.icon}</span>
              <span class="font-headline-sm material-choice-label">${mat.label}</span>
            </button>
          `).join('')}
        </div>

        ${renderMaterialWeightBars(selectedMaterials, materialWeights)}
      </div>

      <div class="card-tactical card-compact">
        <span class="font-label-sm text-soft incidents-title">
          INCIDENCIAS / DAÑOS FÍSICOS AL CONTENEDOR
        </span>
        <div class="incident-grid">
          ${incidentOptions.map(({ key, label }) => `
            <label class="incident-option">
              <input type="checkbox" class="incident-checkbox" data-incident="${key}" ${incidents[key] ? 'checked' : ''}>
              <span>${label}</span>
            </label>
          `).join('')}
        </div>
        <label class="font-label-sm text-soft incident-comments-label" for="incident-comments">
          COMENTARIOS DE LA INCIDENCIA
        </label>
        <textarea id="incident-comments" class="incident-comments" rows="3" placeholder="Describe la incidencia o daño observado...">${escapeHtml(incidentComments)}</textarea>
      </div>

      ${renderPhotoEvidenceSection('EVIDENCIA DESPUÉS DE LA RECOLECCIÓN', 'final', photoEvidence)}

      <button type="button" class="btn-tactical btn-tactical-primary btn-gated" id="btn-save-container-report" ${reportReady ? '' : 'disabled'} aria-disabled="${reportReady ? 'false' : 'true'}">
        <span class="material-symbols-outlined icon-22">check_circle</span>
        <span>GUARDAR REPORTE Y CONTINUAR</span>
      </button>
    </div>
  `;
}

export function attachContainerReportEvents(containerEl, store) {
  // Local working copy of the draft; every change is also saved to the store so a
  // re-render (route refresh, camera overlay) shows the same data.
  const containerId = store.state.activeContainerId;
  const draft = getReportDraft(store.state, containerId);
  let currentFill = draft.fillLevel;
  let selectedMaterials = draft.materials;
  const { materialWeights, photoEvidence, incidents } = draft;
  let incidentComments = draft.incidentComments;
  const saveDraft = (patch) => store.updateReportDraft(containerId, patch);

  const saveButton = containerEl.querySelector('#btn-save-container-report');
  const updateSaveButtonState = () => {
    if (!saveButton) {
      return;
    }

    const reportReady = isContainerReportReady(currentFill, selectedMaterials, materialWeights, photoEvidence);
    saveButton.disabled = !reportReady;
    saveButton.setAttribute('aria-disabled', reportReady ? 'false' : 'true');
  };

  containerEl.querySelector('#btn-report-back')?.addEventListener('click', () => {
    store.setScreen('map');
  });

  const materialButtons = containerEl.querySelectorAll('.btn-material-choice');
  const materialCountBadge = containerEl.querySelector('#material-count-badge');
  const materialWeightsPanel = containerEl.querySelector('#material-weights-panel');

  function bindMaterialWeightControls() {
    const materialBars = containerEl.querySelectorAll('.material-weight-bar');
    materialBars.forEach((bar) => {
      const matKey = bar.getAttribute('data-material');
      const internalStepper = bar.querySelector('.tactical-stepper');
      const weightInput = bar.querySelector('.material-weight-input');

      if (!internalStepper || !matKey || internalStepper.dataset.bound === 'true') {
        return;
      }

      internalStepper.dataset.bound = 'true';
      const updateMaterialWeight = (newVal) => {
        const normalizedValue = Math.min(2000, Math.max(0, Math.floor(Number(newVal) || 0)));
        materialWeights[matKey] = normalizedValue;
        const stepperValue = internalStepper.querySelector('.stepper-value');
        if (stepperValue) {
          stepperValue.textContent = normalizedValue;
        }
        if (weightInput) {
          weightInput.value = normalizedValue;
        }
        saveDraft({ materialWeights: { ...materialWeights } });
        updateSaveButtonState();
      };

      attachStepperEvents(internalStepper, (newVal) => {
        updateMaterialWeight(newVal);
      });

      weightInput?.addEventListener('input', (event) => {
        event.currentTarget.value = event.currentTarget.value.replace(/[^0-9]/g, '');
        if (event.currentTarget.value !== '') {
          updateMaterialWeight(event.currentTarget.value);
        }
      });

      weightInput?.addEventListener('blur', (event) => {
        updateMaterialWeight(event.currentTarget.value);
      });
    });
  }

  bindMaterialWeightControls();
  updateSaveButtonState();

  materialButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const matKey = e.currentTarget.getAttribute('data-material');

      if (selectedMaterials.includes(matKey)) {
        selectedMaterials = selectedMaterials.filter(m => m !== matKey);
        delete materialWeights[matKey];
      } else {
        selectedMaterials.push(matKey);
        materialWeights[matKey] = materialWeights[matKey] || 0;
      }
      e.currentTarget.classList.toggle('active', selectedMaterials.includes(matKey));

      if (materialCountBadge) {
        materialCountBadge.textContent = `${selectedMaterials.length} SELECCIONADO${selectedMaterials.length === 1 ? '' : 'S'}`;
      }

      saveDraft({ materials: [...selectedMaterials], materialWeights: { ...materialWeights } });
      updateSaveButtonState();

      if (materialWeightsPanel) {
        const materialRow = materialWeightsPanel.querySelector(`[data-material="${matKey}"]`);
        if (selectedMaterials.includes(matKey)) {
          if (!materialRow) {
            materialWeightsPanel.insertAdjacentHTML('beforeend', renderMaterialWeightBar(matKey, Number(materialWeights[matKey]) || 0));
            bindMaterialWeightControls();
          }
        } else if (materialRow) {
          materialRow.remove();
        }
      }
    });
  });

  containerEl.querySelectorAll('.incident-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      const incidentKey = event.currentTarget.getAttribute('data-incident');
      if (!incidentKey) {
        return;
      }

      incidents[incidentKey] = event.currentTarget.checked;
      saveDraft({ incidents: { ...incidents } });
    });
  });

  containerEl.querySelector('#incident-comments')?.addEventListener('input', (event) => {
    incidentComments = event.currentTarget.value;
    saveDraft({ incidentComments });
  });

  const presetButtons = containerEl.querySelectorAll('.btn-capacity-preset');
  const meterMount = containerEl.querySelector('#capacity-meter-mount');

  function updateCapacitySelection(level) {
    currentFill = level;
    saveDraft({ fillLevel: level });

    if (meterMount) {
      meterMount.innerHTML = renderCapacityMeter(level);
    }

    presetButtons.forEach((btn) => {
      const isSelected = btn.getAttribute('data-level') === level;
      btn.classList.toggle('is-selected', isSelected);
      const icon = btn.querySelector('.capacity-check-icon');
      if (icon) icon.textContent = isSelected ? 'check_circle' : 'radio_button_unchecked';
    });

    updateSaveButtonState();
  }

  presetButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const level = e.currentTarget.getAttribute('data-level');
      updateCapacitySelection(level);
    });
  });

  containerEl.querySelectorAll('.btn-photo-evidence').forEach((button) => {
    button.addEventListener('click', (event) => {
      const photoKey = event.currentTarget.getAttribute('data-photo-key');
      if (!photoKey) {
        return;
      }

      const evidenceButton = event.currentTarget;

      openPhotoCapture((photo) => {
        const capturedAt = new Date().toISOString();
        // Patch only this photo from the stored draft: the screen may have re-rendered
        // while the camera was open, leaving this closure with older data.
        const storedDraft = getReportDraft(store.state, containerId);
        saveDraft({
          photoEvidence: { ...storedDraft.photoEvidence, [photoKey]: capturedAt },
          photos: { ...storedDraft.photos, [photoKey]: photo }
        });
        if (!evidenceButton.isConnected) {
          store.notify();
          return;
        }

        photoEvidence[photoKey] = capturedAt;

        evidenceButton.classList.add('active', 'evidence-captured');
        evidenceButton.setAttribute('aria-pressed', 'true');
        const status = evidenceButton.querySelector('.photo-evidence-status');
        if (status) {
          status.textContent = 'EVIDENCIA CAPTURADA';
        }
        updateSaveButtonState();
      }, (message) => store.showToast(message, 'info'), reportPhotoOptions);
    });
  });

  containerEl.querySelector('#btn-save-container-report')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const validationError = validateContainerReport(currentFill, selectedMaterials, materialWeights);
    if (validationError) {
      store.showToast(validationError, 'info');
      return;
    }

    const missingPhotos = getMissingReportPhotos(photoEvidence);
    if (missingPhotos.length > 0) {
      store.showToast('Captura las fotos exterior e interior del inicio y del final', 'info');
      return;
    }

    const materialTotals = { ...materialWeights };
    const finalKg = getTotalMaterialWeight(selectedMaterials, materialTotals);
    const reportData = {
      fillLevel: currentFill,
      collectedKg: finalKg,
      materials: [...selectedMaterials],
      materialWeights: { ...materialTotals },
      photoEvidence: { ...photoEvidence },
      photos: getReportDraft(store.state, containerId).photos,
      incidents: { ...incidents },
      incidentComments
    };

    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.querySelector('span:last-child').textContent = 'GUARDANDO...';

    try {
      // Saved on the device first; fieldSync sends it to Supabase when there is signal.
      const queued = await queueFieldAction('report', { routeId: store.state.route.id, containerId, report: reportData });
      store.completeContainerReport(containerId, reportData);
      store.showToast(queued
        ? `¡Reporte de ${containerId} guardado!`
        : `¡Reporte de ${containerId} registrado en modo local!`, queued ? 'success' : 'info');
      store.setScreen('map');
    } catch (error) {
      console.error('No se pudo guardar el reporte en el dispositivo:', error);
      store.showToast(`No se pudo guardar el reporte en el dispositivo: ${error.message}`, 'info', 8000);
      if (button.isConnected) {
        button.querySelector('span:last-child').textContent = 'GUARDAR REPORTE Y CONTINUAR';
        updateSaveButtonState();
      }
    }
  });
}
