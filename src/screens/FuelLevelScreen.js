/**
 * Pantalla 3: Registro de Combustible - Inspección Pre-operativa
 */

import { fuelPresets as presets, getFuelPercent, getFuelLevelClass } from '../data/fuel.js';

export function renderFuelLevelScreen(state) {
  const hasPreset = Boolean(state.fuelLevel.preset);

  return `
    <div class="screen-header-bar">
      <div class="screen-header-title">
        <span class="material-symbols-outlined">local_gas_station</span>
        <span>REGISTRO DE COMBUSTIBLE</span>
      </div>
      <button type="button" class="btn-tactical btn-tactical-sm" id="btn-fuel-back">
        REGRESAR
      </button>
    </div>

    <div class="screen-body">
      <!-- Volume Readout Card -->
      <div class="card-tactical card-tactical-accent fuel-readout-card">
        <span class="font-label-sm text-muted">NIVEL EN TANQUE SELECCIONADO</span>
        <div class="fuel-readout">
          <span id="fuel-preset-readout" class="font-headline-sm fuel-preset-name${hasPreset ? ' is-set' : ''}">
            ${state.fuelLevel.preset ?? 'SIN REGISTRAR'}
          </span>
        </div>

        <!-- Visual Tank Bar -->
        <div class="fuel-tank">
          <div id="fuel-level-bar" class="fuel-tank-level ${getFuelLevelClass(state.fuelLevel.liters)}" style="width: ${getFuelPercent(state.fuelLevel.liters).toFixed(0)}%;"></div>
        </div>
      </div>

      <!-- Tank Presets Grid -->
      <div class="fuel-presets">
        <span class="font-label-sm text-soft">NIVEL VISUAL RÁPIDO</span>
        ${presets.map((p) => {
          const isSelected = state.fuelLevel.preset === p.label;
          return `
            <button
              type="button"
              class="card-tactical btn-fuel-preset${isSelected ? ' is-selected' : ''}"
              data-preset="${p.label}"
              data-liters="${p.liters}"
            >
              <strong class="font-headline-sm fuel-preset-title">${p.label}</strong>
              <span class="material-symbols-outlined fuel-preset-check">
                ${isSelected ? 'check_circle' : 'radio_button_unchecked'}
              </span>
            </button>
          `;
        }).join('')}
      </div>

      <!-- Save Button -->
      <button type="button" class="btn-tactical btn-tactical-primary" id="btn-save-fuel">
        <span class="material-symbols-outlined icon-22">save</span>
        <span>GUARDAR NIVEL PREOPERATIVO</span>
      </button>
    </div>
  `;
}

export function attachFuelLevelEvents(container, store) {
  container.querySelector('#btn-fuel-back')?.addEventListener('click', () => {
    store.setScreen('dispatch');
  });

  const presetButtons = container.querySelectorAll('.btn-fuel-preset');
  presetButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const preset = e.currentTarget.getAttribute('data-preset');
      const liters = parseFloat(e.currentTarget.getAttribute('data-liters'));
      store.setFuelPreset(preset, liters, false);
      updateFuelSelection(container, preset, liters);
    });
  });

  container.querySelector('#btn-save-fuel')?.addEventListener('click', () => {
    store.showToast('Registro de combustible guardado en el servidor de flota.', 'success', 1500);
    store.setScreen('dispatch');
  });
}

function updateFuelSelection(container, preset, liters) {
  const presetReadout = container.querySelector('#fuel-preset-readout');
  const levelBar = container.querySelector('#fuel-level-bar');

  if (presetReadout) {
    presetReadout.textContent = preset;
    presetReadout.classList.add('is-set');
  }
  if (levelBar) {
    levelBar.style.width = `${getFuelPercent(liters).toFixed(0)}%`;
    levelBar.className = `fuel-tank-level ${getFuelLevelClass(liters)}`;
  }

  container.querySelectorAll('.btn-fuel-preset').forEach((button) => {
    const selected = button.getAttribute('data-preset') === preset;
    button.classList.toggle('is-selected', selected);
    const icon = button.querySelector('.fuel-preset-check');
    if (icon) icon.textContent = selected ? 'check_circle' : 'radio_button_unchecked';
  });
}
