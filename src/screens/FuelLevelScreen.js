/**
 * Pantalla 3: Registro de Combustible - Inspección Pre-operativa
 */

export function renderFuelLevelScreen(state) {
  const presets = [
    { label: 'VACÍO (0-15%)', liters: 25.0, desc: 'Nivel Crítico < 35 L' },
    { label: 'RESERVA (25%)', liters: 62.5, desc: '62.5 Litros' },
    { label: 'MEDIO TANQUE (50%)', liters: 125.0, desc: '125.0 Litros' },
    { label: '3/4 TANQUE (75%)', liters: 187.5, desc: '187.5 Litros' },
    { label: 'LLENO (100%)', liters: 250.0, desc: '250.0 Litros Capacidad Total' }
  ];

  return `
    <div class="screen-header-bar">
      <div class="screen-header-title">
        <span class="material-symbols-outlined" style="color: var(--color-primary);">local_gas_station</span>
        <span>REGISTRO DE COMBUSTIBLE</span>
      </div>
      <button type="button" class="btn-tactical btn-tactical-sm" id="btn-fuel-back">
        REGRESAR
      </button>
    </div>

    <div style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
      <!-- Volume Readout Card -->
      <div class="card-tactical card-tactical-accent" style="padding: 16px;">
        <span class="font-label-sm" style="color: #64748b;">NIVEL EN TANQUE SELECCIONADO</span>
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin: 4px 0 10px 0;">
            <h2 id="fuel-liters-readout" class="font-display" style="color: ${state.fuelLevel.preset ? 'var(--color-primary)' : '#94a3b8'}; font-size: 42px; margin: 0;">
              ${state.fuelLevel.liters.toFixed(1)} <span style="font-size: 20px; color: #0f172a;">L</span>
            </h2>
            <span id="fuel-preset-readout" class="font-headline-sm" style="color: ${state.fuelLevel.preset ? '#0f172a' : '#94a3b8'};">
              ${state.fuelLevel.preset ?? 'SIN REGISTRAR'}
            </span>
        </div>

        <!-- Visual Tank Bar -->
        <div style="border: 2px solid #0f172a; height: 18px; background-color: #e2e8f0; display: flex;">
          <div id="fuel-level-bar" style="width: ${(state.fuelLevel.liters / 250 * 100).toFixed(0)}%; background-color: var(--color-primary-container); border-right: 2px solid #0f172a;"></div>
        </div>
      </div>

      <!-- Tank Presets Grid -->
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <label class="font-label-sm" style="color: #475569;">NIVEL VISUAL RÁPIDO</label>
        ${presets.map(p => {
    const isSelected = state.fuelLevel.preset === p.label;
    return `
            <button 
              type="button" 
              class="card-tactical btn-fuel-preset" 
              style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; text-align: left; padding: 10px 14px; ${isSelected ? 'border-color: #00a86b; background-color: #eff4ff;' : ''}"
              data-preset="${p.label}"
              data-liters="${p.liters}"
            >
              <div>
                <strong class="font-headline-sm" style="display: block; font-size: 16px;">${p.label}</strong>
                <span class="font-body-sm" style="color: #64748b; font-size: 13px;">${p.desc}</span>
              </div>
              <span class="material-symbols-outlined" style="color: ${isSelected ? '#00a86b' : '#cbd5e1'}; font-size: 22px;">
                ${isSelected ? 'check_circle' : 'radio_button_unchecked'}
              </span>
            </button>
          `;
  }).join('')}
      </div>

      <!-- Save Button -->
      <button type="button" class="btn-tactical btn-tactical-primary" id="btn-save-fuel">
        <span class="material-symbols-outlined" style="font-size: 22px;">save</span>
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
  const litersReadout = container.querySelector('#fuel-liters-readout');
  const presetReadout = container.querySelector('#fuel-preset-readout');
  const levelBar = container.querySelector('#fuel-level-bar');

  if (litersReadout) {
    litersReadout.firstChild.textContent = `${liters.toFixed(1)} `;
    litersReadout.style.color = 'var(--color-primary)';
  }
  if (presetReadout) {
    presetReadout.textContent = preset;
    presetReadout.style.color = '#0f172a';
  }
  if (levelBar) {
    levelBar.style.width = `${(liters / 250 * 100).toFixed(0)}%`;
  }

  container.querySelectorAll('.btn-fuel-preset').forEach((button) => {
    const selected = button.getAttribute('data-preset') === preset;
    button.style.borderColor = selected ? '#00a86b' : '';
    button.style.backgroundColor = selected ? '#eff4ff' : '';
    const icon = button.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.textContent = selected ? 'check_circle' : 'radio_button_unchecked';
      icon.style.color = selected ? '#00a86b' : '#cbd5e1';
    }
  });
}
