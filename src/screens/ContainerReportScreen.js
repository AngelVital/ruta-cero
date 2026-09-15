/**
 * Pantalla 6: Reporte de Estado del Contenedor
 * Origen: Stitch Screen 02 (screen_2_b7d68936c6fa4cc8b691bcda0444b9cf)
 * Incluye barra de llenado dinámica y selección múltiple de materiales
 */

import { renderCapacityMeter } from '../components/CapacityMeter.js';
import { renderStepperControl, attachStepperEvents } from '../components/StepperControl.js';

const materialOptions = [
  { key: 'plastico', label: 'PLÁSTICO', color: '#0284c7', icon: 'recycling' },
  { key: 'carton', label: 'CARTÓN', color: '#d97706', icon: 'inventory_2' },
  { key: 'papel', label: 'PAPEL', color: '#4f46e5', icon: 'description' }
];

function getMaterialWeightMap(container) {
  if (container && container.materialWeights && typeof container.materialWeights === 'object') {
    return { ...container.materialWeights };
  }
  return {};
}

function getPhotoEvidence(container) {
  return container && container.photoEvidence && typeof container.photoEvidence === 'object'
    ? { ...container.photoEvidence }
    : {};
}

function getIncidentData(container) {
  return container && container.incidents && typeof container.incidents === 'object'
    ? { ...container.incidents }
    : {};
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderPhotoEvidenceSection(title, prefix, photoEvidence) {
  const photos = [
    { key: `${prefix}Exterior`, label: 'FOTO EXTERIOR', icon: 'photo_camera' },
    { key: `${prefix}Interior`, label: 'FOTO INTERIOR', icon: 'camera' }
  ];

  return `
    <div class="card-tactical photo-evidence-section" style="padding: 12px 14px;">
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
        <span class="material-symbols-outlined" style="font-size: 19px; color: var(--color-primary);">photo_library</span>
        <span class="font-label-sm" style="color: #0f172a; font-weight: 800;">${title}</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        ${photos.map((photo) => `
          <button type="button" class="btn-tactical btn-photo-evidence ${photoEvidence[photo.key] ? 'active' : ''}" data-photo-key="${photo.key}" style="min-height: 64px; padding: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;">
            <span class="material-symbols-outlined" style="font-size: 22px;">${photo.icon}</span>
            <span style="font-size: 11px; font-weight: 800; text-align: center;">${photo.label}</span>
            <span class="photo-evidence-status" style="font-size: 10px;">${photoEvidence[photo.key] ? 'CAPTURADA' : 'PENDIENTE'}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderMaterialWeightBars(selectedMaterials, materialWeights) {
  if (!selectedMaterials.length) {
    return '';
  }

  return `
    <div id="material-weights-panel" style="display: flex; flex-direction: column; gap: 10px; margin-top: 12px;">
      <div class="font-label-sm" style="color: #0f172a; font-weight: 800; display: flex; align-items: center; gap: 6px;">
        <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-primary);">scale</span>
        <span>PESO RECOLECTADO POR MATERIAL</span>
      </div>
      ${selectedMaterials.map((matKey) => {
        const mat = materialOptions.find(item => item.key === matKey) || materialOptions[0];
        const currentValue = Number(materialWeights[matKey]) || 0;

        return `
          <div class="card-tactical material-weight-bar" data-material="${matKey}" style="padding: 10px 12px; border-left: 6px solid ${mat.color}; display: flex; flex-direction: column; align-items: stretch; gap: 8px; background: #f8fafc;">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
              <span class="material-symbols-outlined" style="color: ${mat.color}; font-size: 22px;">${mat.icon}</span>
              <span class="font-headline-sm" style="font-size: 14px; letter-spacing: 0.04em; color: #0f172a;">${mat.label}</span>
            </div>
            <div style="width: 100%; min-width: 0; display: flex;">
              ${renderStepperControl({
                id: `weight-${matKey}`,
                value: currentValue,
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
      }).join('')}
    </div>
  `;
}

export function renderContainerReportScreen(state) {
  const container = state.stops.find(s => s.id === state.activeContainerId) || state.stops[3];

  let initialFill = container.fillLevel !== undefined ? container.fillLevel : 75;
  let initialKg = container.collectedKg || 0;

  // Selected materials (supports multiple)
  let selectedMaterials = Array.isArray(container.materials) && container.materials.length > 0
    ? [...container.materials]
    : [container.material || 'plastico'];

  const materialWeights = getMaterialWeightMap(container);
  const photoEvidence = getPhotoEvidence(container);
  const incidents = getIncidentData(container);
  const incidentComments = container.incidentComments || '';
  selectedMaterials.forEach((matKey) => {
    if (materialWeights[matKey] === undefined) {
      materialWeights[matKey] = 0;
    }
  });

  return `
    <div class="screen-header-bar">
      <div class="screen-header-title">
        <span class="material-symbols-outlined" style="color: var(--color-primary);">assignment</span>
        <span>REPORTE DE CONTENEDOR</span>
      </div>
      <button type="button" class="btn-tactical btn-tactical-sm" id="btn-report-back">
        MAPA
      </button>
    </div>

    <div style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
      <!-- Container Identification Header Card -->
      <div class="card-tactical card-tactical-accent" style="padding: 14px;">
        <h2 class="font-headline-lg" style="color: #0f172a; margin: 0;">${container.id} • ${container.code}</h2>
        <p class="font-body-sm" style="color: #475569; margin-top: 4px;">${container.address}</p>
      </div>

      ${renderPhotoEvidenceSection('EVIDENCIA INICIAL DEL CONTENEDOR', 'initial', photoEvidence)}

      <!-- Capacity Level Selector with Dynamic Bar Update -->
      <div class="card-tactical" style="padding: 14px; display: flex; flex-direction: column; gap: 10px;">
        <div id="capacity-meter-mount">
          ${renderCapacityMeter(initialFill)}
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;" id="capacity-presets-container">
          <button 
            type="button" 
            class="card-tactical btn-capacity-preset" 
            data-level="low"
            data-pct="20"
            style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; cursor: pointer; border: 2px solid ${initialFill <= 40 ? '#00a86b' : '#0f172a'}; background: ${initialFill <= 40 ? '#ecfdf5' : '#ffffff'}; box-shadow: ${initialFill <= 40 ? '3px 3px 0px #00a86b' : 'var(--shadow-resting)'};"
          >
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; background-color: #d1fae5; border: 2px solid #0f172a; display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="color: #00a86b; font-size: 20px;">battery_2_bar</span>
              </div>
              <div style="text-align: left;">
                <strong class="font-headline-sm" style="color: #00a86b; font-size: 16px;">BAJO (&lt; 20%)</strong>
                <div class="font-body-sm" style="color: #64748b; font-size: 12px;">No se requiere recolección</div>
              </div>
            </div>
            <span class="material-symbols-outlined capacity-check-icon" style="color: ${initialFill <= 40 ? '#00a86b' : '#cbd5e1'}; font-size: 22px;">
              ${initialFill <= 40 ? 'check_circle' : 'radio_button_unchecked'}
            </span>
          </button>

          <button 
            type="button" 
            class="card-tactical btn-capacity-preset" 
            data-level="medium"
            data-pct="55"
            style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; cursor: pointer; border: 2px solid ${initialFill > 40 && initialFill <= 75 ? '#d97706' : '#0f172a'}; background: ${initialFill > 40 && initialFill <= 75 ? '#fffbeb' : '#ffffff'}; box-shadow: ${initialFill > 40 && initialFill <= 75 ? '3px 3px 0px #d97706' : 'var(--shadow-resting)'};"
          >
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; background-color: #fef3c7; border: 2px solid #0f172a; display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="color: #d97706; font-size: 20px;">warning</span>
              </div>
              <div style="text-align: left;">
                <strong class="font-headline-sm" style="color: #d97706; font-size: 16px;">MEDIO (20% - 75%)</strong>
                <div class="font-body-sm" style="color: #64748b; font-size: 12px;">Recolección recomendada</div>
              </div>
            </div>
            <span class="material-symbols-outlined capacity-check-icon" style="color: ${initialFill > 40 && initialFill <= 75 ? '#d97706' : '#cbd5e1'}; font-size: 22px;">
              ${initialFill > 40 && initialFill <= 75 ? 'check_circle' : 'radio_button_unchecked'}
            </span>
          </button>

          <button 
            type="button" 
            class="card-tactical btn-capacity-preset" 
            data-level="critical"
            data-pct="90"
            style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; cursor: pointer; border: 2px solid ${initialFill > 75 ? '#e11d48' : '#0f172a'}; background: ${initialFill > 75 ? '#fef2f2' : '#ffffff'}; box-shadow: ${initialFill > 75 ? '3px 3px 0px #e11d48' : 'var(--shadow-resting)'};"
          >
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; background-color: #fee2e2; border: 2px solid #0f172a; display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="color: #e11d48; font-size: 20px;">priority_high</span>
              </div>
              <div style="text-align: left;">
                <strong class="font-headline-sm" style="color: #e11d48; font-size: 16px;">LLENO (&gt; 75%) • CRÍTICO</strong>
                <div class="font-body-sm" style="color: #64748b; font-size: 12px;">Recolección urgente</div>
              </div>
            </div>
            <span class="material-symbols-outlined capacity-check-icon" style="color: ${initialFill > 75 ? '#e11d48' : '#cbd5e1'}; font-size: 22px;">
              ${initialFill > 75 ? 'check_circle' : 'radio_button_unchecked'}
            </span>
          </button>
        </div>
      </div>

      <div class="card-tactical" style="padding: 12px 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <label class="font-label-sm" style="color: #0f172a; font-weight: 800; display: flex; align-items: center; gap: 4px;">
            <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-primary);">category</span>
            <span>CLASIFICACIÓN DE RESIDUO (MÚLTIPLE)</span>
          </label>
          <span id="material-count-badge" class="font-label-sm" style="background-color: var(--color-primary-container); color: #ffffff; padding: 2px 8px; border: 1px solid #0f172a; font-weight: 800;">
            ${selectedMaterials.length} SELECCIONADO${selectedMaterials.length === 1 ? '' : 'S'}
          </span>
        </div>
        <p class="font-body-sm" style="color: #64748b; font-size: 13px; margin-bottom: 10px;">
          Selecciona uno o varios tipos de residuo presentes en el contenedor:
        </p>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;" id="materials-container">
          ${materialOptions.map((mat) => {
            const isSelected = selectedMaterials.includes(mat.key);
            return `
              <button 
                type="button" 
                class="btn-tactical btn-material-choice ${isSelected ? 'active' : ''}" 
                data-material="${mat.key}"
                data-color="${mat.color}"
                data-icon="${mat.icon}"
                data-label="${mat.label}"
                style="min-height: 52px; padding: 8px 10px; display: flex; align-items: center; justify-content: center; gap: 6px; border: 2px solid ${isSelected ? '#0f172a' : '#cbd5e1'}; background-color: ${isSelected ? mat.color : '#ffffff'}; color: ${isSelected ? '#ffffff' : '#475569'}; box-shadow: ${isSelected ? '3px 3px 0px #0f172a' : 'none'}; cursor: pointer;"
              >
                <span class="material-symbols-outlined" style="font-size: 20px;">${mat.icon}</span>
                <span class="font-headline-sm" style="font-size: 15px;">${mat.label}</span>
              </button>
            `;
          }).join('')}
        </div>

        ${renderMaterialWeightBars(selectedMaterials, materialWeights)}
      </div>

      <div class="card-tactical" style="padding: 12px 14px;">
        <label class="font-label-sm" style="color: #475569; display: block; margin-bottom: 8px;">
          INCIDENCIAS / DAÑOS FÍSICOS AL CONTENEDOR
        </label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
            <input type="checkbox" class="incident-checkbox" data-incident="damaged" ${incidents.damaged ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #00a86b;">
            <span>Contenedor dañado</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
            <input type="checkbox" class="incident-checkbox" data-incident="graffiti" ${incidents.graffiti ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #00a86b;">
            <span>Grafiti / vandalismo</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
            <input type="checkbox" class="incident-checkbox" data-incident="outsideWaste" ${incidents.outsideWaste ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #00a86b;">
            <span>Residuos fuera del contenedor</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
            <input type="checkbox" class="incident-checkbox" data-incident="mixedWaste" ${incidents.mixedWaste ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #00a86b;">
            <span>Residuos mezclados</span>
          </label>
        </div>
        <label class="font-label-sm" for="incident-comments" style="color: #475569; display: block; margin-top: 12px; margin-bottom: 6px;">
          COMENTARIOS DE LA INCIDENCIA
        </label>
        <textarea id="incident-comments" rows="3" placeholder="Describe la incidencia o daño observado..." style="width: 100%; resize: vertical; padding: 10px; border: 2px solid #cbd5e1; font: inherit; color: #0f172a;">${escapeHtml(incidentComments)}</textarea>
      </div>

      ${renderPhotoEvidenceSection('EVIDENCIA DESPUÉS DE LA RECOLECCIÓN', 'final', photoEvidence)}

      <button type="button" class="btn-tactical btn-tactical-primary" id="btn-save-container-report">
        <span class="material-symbols-outlined" style="font-size: 22px;">check_circle</span>
        <span>GUARDAR REPORTE Y CONTINUAR</span>
      </button>
    </div>
  `;
}

export function attachContainerReportEvents(containerEl, store) {
  const stop = store.state.stops.find(s => s.id === store.state.activeContainerId);
  let currentFill = (stop && stop.fillLevel !== undefined) ? stop.fillLevel : 75;
  let currentKg = (stop && stop.collectedKg) ? stop.collectedKg : 480;

  let selectedMaterials = (stop && Array.isArray(stop.materials) && stop.materials.length > 0)
    ? [...stop.materials]
    : [(stop && stop.material) || 'plastico'];

  const materialWeights = (stop && stop.materialWeights && typeof stop.materialWeights === 'object')
    ? { ...stop.materialWeights }
    : {};
  const photoEvidence = getPhotoEvidence(stop);
  const incidents = getIncidentData(stop);
  let incidentComments = stop && stop.incidentComments ? stop.incidentComments : '';

  selectedMaterials.forEach((matKey) => {
    if (materialWeights[matKey] === undefined) {
      materialWeights[matKey] = 0;
    }
  });

  const syncTotalWeight = () => {
    currentKg = selectedMaterials.reduce((sum, matKey) => sum + (Number(materialWeights[matKey]) || 0), 0);
    const totalStepper = containerEl.querySelector('#weight-stepper .stepper-value');
    if (totalStepper) {
      totalStepper.textContent = currentKg;
    }
    if (stop) {
      stop.collectedKg = currentKg;
      stop.materialWeights = { ...materialWeights };
    }
  };

  containerEl.querySelector('#btn-report-back')?.addEventListener('click', () => {
    store.setScreen('map');
  });

  const stepperEl = containerEl.querySelector('#weight-stepper');
  if (stepperEl) {
    attachStepperEvents(stepperEl, (newVal) => {
      currentKg = newVal;
      if (stop) {
        stop.collectedKg = newVal;
      }
    });
  }

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
        syncTotalWeight();
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
  syncTotalWeight();

  materialButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const matKey = e.currentTarget.getAttribute('data-material');
      const matColor = e.currentTarget.getAttribute('data-color');

      if (selectedMaterials.includes(matKey)) {
        selectedMaterials = selectedMaterials.filter(m => m !== matKey);
        delete materialWeights[matKey];
        e.currentTarget.classList.remove('active');
        e.currentTarget.style.backgroundColor = '#ffffff';
        e.currentTarget.style.color = '#475569';
        e.currentTarget.style.borderColor = '#cbd5e1';
        e.currentTarget.style.boxShadow = 'none';
      } else {
        selectedMaterials.push(matKey);
        materialWeights[matKey] = materialWeights[matKey] || 0;
        e.currentTarget.classList.add('active');
        e.currentTarget.style.backgroundColor = matColor;
        e.currentTarget.style.color = '#ffffff';
        e.currentTarget.style.borderColor = '#0f172a';
        e.currentTarget.style.boxShadow = '3px 3px 0px #0f172a';
      }

      if (materialCountBadge) {
        materialCountBadge.textContent = `${selectedMaterials.length} SELECCIONADO${selectedMaterials.length === 1 ? '' : 'S'}`;
      }

      if (stop) {
        stop.materials = [...selectedMaterials];
        stop.material = selectedMaterials[0];
        stop.materialWeights = { ...materialWeights };
      }

      syncTotalWeight();

      if (materialWeightsPanel) {
        const materialRow = materialWeightsPanel.querySelector(`[data-material="${matKey}"]`);
        if (selectedMaterials.includes(matKey)) {
          if (!materialRow) {
            const mat = materialOptions.find(item => item.key === matKey) || materialOptions[0];
            materialWeightsPanel.insertAdjacentHTML(
              'beforeend', `
                <div class="card-tactical material-weight-bar" data-material="${matKey}" style="padding: 10px 12px; border-left: 6px solid ${mat.color}; display: flex; flex-direction: column; align-items: stretch; gap: 8px; background: #f8fafc;">
                  <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                    <span class="material-symbols-outlined" style="color: ${mat.color}; font-size: 22px;">${mat.icon}</span>
                    <span class="font-headline-sm" style="font-size: 14px; letter-spacing: 0.04em; color: #0f172a;">${mat.label}</span>
                  </div>
                  <div style="width: 100%; min-width: 0; display: flex;">
                    ${renderStepperControl({
                      id: `weight-${matKey}`,
                      value: Number(materialWeights[matKey]) || 0,
                      unit: 'KG',
                      step: 1,
                      min: 0,
                      max: 2000,
                      editable: true,
                      inputClass: 'material-weight-input'
                    })}
                  </div>
                </div>
              `
            );
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
      if (stop) {
        stop.incidents = { ...incidents };
      }
    });
  });

  containerEl.querySelector('#incident-comments')?.addEventListener('input', (event) => {
    incidentComments = event.currentTarget.value;
    if (stop) {
      stop.incidentComments = incidentComments;
    }
  });

  const presetButtons = containerEl.querySelectorAll('.btn-capacity-preset');
  const meterMount = containerEl.querySelector('#capacity-meter-mount');

  function updateCapacitySelection(level, pct) {
    currentFill = pct;
    if (stop) {
      stop.fillLevel = pct;
    }

    if (meterMount) {
      meterMount.innerHTML = renderCapacityMeter(pct);
    }

    presetButtons.forEach((btn) => {
      const btnLevel = btn.getAttribute('data-level');
      const icon = btn.querySelector('.capacity-check-icon');
      const isSelected = btnLevel === level;

      if (isSelected) {
        if (level === 'low') {
          btn.style.borderColor = '#00a86b';
          btn.style.backgroundColor = '#ecfdf5';
          btn.style.boxShadow = '3px 3px 0px #00a86b';
          if (icon) {
            icon.textContent = 'check_circle';
            icon.style.color = '#00a86b';
          }
        } else if (level === 'medium') {
          btn.style.borderColor = '#d97706';
          btn.style.backgroundColor = '#fffbeb';
          btn.style.boxShadow = '3px 3px 0px #d97706';
          if (icon) {
            icon.textContent = 'check_circle';
            icon.style.color = '#d97706';
          }
        } else if (level === 'critical') {
          btn.style.borderColor = '#e11d48';
          btn.style.backgroundColor = '#fef2f2';
          btn.style.boxShadow = '3px 3px 0px #e11d48';
          if (icon) {
            icon.textContent = 'check_circle';
            icon.style.color = '#e11d48';
          }
        }
      } else {
        btn.style.borderColor = '#0f172a';
        btn.style.backgroundColor = '#ffffff';
        btn.style.boxShadow = 'var(--shadow-resting)';
        if (icon) {
          icon.textContent = 'radio_button_unchecked';
          icon.style.color = '#cbd5e1';
        }
      }
    });
  }

  presetButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const level = e.currentTarget.getAttribute('data-level');
      const pct = parseInt(e.currentTarget.getAttribute('data-pct'), 10);
      updateCapacitySelection(level, pct);
    });
  });

  containerEl.querySelectorAll('.btn-photo-evidence').forEach((button) => {
    button.addEventListener('click', (event) => {
      const photoKey = event.currentTarget.getAttribute('data-photo-key');
      if (!photoKey) {
        return;
      }

      photoEvidence[photoKey] = new Date().toISOString();
      if (stop) {
        stop.photoEvidence = { ...photoEvidence };
      }

      event.currentTarget.classList.add('active');
      const status = event.currentTarget.querySelector('.photo-evidence-status');
      if (status) {
        status.textContent = 'CAPTURADA';
      }
      store.showToast(`${photoKey.includes('initial') ? 'Evidencia inicial' : 'Evidencia final'} capturada`, 'info');
    });
  });

  containerEl.querySelector('#btn-save-container-report')?.addEventListener('click', () => {
    const requiredPhotos = ['initialExterior', 'initialInterior', 'finalExterior', 'finalInterior'];
    const missingPhotos = requiredPhotos.filter((photoKey) => !photoEvidence[photoKey]);
    if (missingPhotos.length > 0) {
      store.showToast('Captura las fotos exterior e interior del inicio y del final', 'info');
      return;
    }

    const materialTotals = { ...materialWeights };
    const finalKg = selectedMaterials.reduce((sum, matKey) => sum + (Number(materialTotals[matKey]) || 0), 0);

    if (stop) {
      stop.materials = [...selectedMaterials];
      stop.material = selectedMaterials[0];
      stop.materialWeights = { ...materialTotals };
      stop.collectedKg = finalKg;
      stop.incidents = { ...incidents };
      stop.incidentComments = incidentComments;
    }

    store.showToast(`¡Contenedor ${store.state.activeContainerId} registrado con éxito!`);

    store.completeContainerReport(store.state.activeContainerId, {
      fillLevel: currentFill,
      collectedKg: finalKg,
      materials: [...selectedMaterials],
      materialWeights: { ...materialTotals },
      photoEvidence: { ...photoEvidence },
      incidents: { ...incidents },
      incidentComments
    });

    store.setScreen('map');
  });
}
