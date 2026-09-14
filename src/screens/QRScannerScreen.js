/**
 * Pantalla 5: Escaneo de Código QR - Contenedor
 * Origen: Stitch Screen 07 (screen_7_aeeba493c04346d494f074a401d31d94)
 */

export function renderQRScannerScreen(state) {
  const currentContainer = state.stops.find(s => s.id === state.activeContainerId) || state.stops[3];

  return `
    <div class="screen-header-bar">
      <div class="screen-header-title">
        <span class="material-symbols-outlined" style="color: var(--color-primary);">qr_code_scanner</span>
        <span>ESCANEAR CÓDIGO QR</span>
      </div>
      <button type="button" class="btn-tactical btn-tactical-sm" id="btn-scanner-cancel">
        CANCELAR
      </button>
    </div>

    <div style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
      <!-- Camera Viewport with Tactical Reticle -->
      <div class="qr-scanner-viewport">
        <!-- Laser Scan Line -->
        <div class="qr-laser-beam"></div>

        <!-- Reticle -->
        <div class="qr-reticle">
          <div class="qr-corner tl"></div>
          <div class="qr-corner tr"></div>
          <div class="qr-corner bl"></div>
          <div class="qr-corner br"></div>

          <!-- Center Targeting Reticle -->
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0.3;">
            <span class="material-symbols-outlined" style="font-size: 48px; color: #ffffff;">filter_center_focus</span>
          </div>
        </div>

        <!-- Viewport Top Overlay -->
        <div style="position: absolute; top: 12px; left: 14px; right: 14px; display: flex; justify-content: space-between; align-items: center;">
          <div style="background: rgba(15, 23, 42, 0.85); color: #00a86b; padding: 4px 8px; border: 1px solid #00a86b; font-family: var(--font-mono); font-size: 11px;">
            SISTEMA ÓPTICO ACTIVO • 60 FPS
          </div>
          <button type="button" class="btn-tactical btn-tactical-sm" id="btn-toggle-flashlight" style="background: rgba(15, 23, 42, 0.85); color: #ffffff; width: 40px; height: 40px; padding: 0;" title="Linterna">
            <span class="material-symbols-outlined" style="font-size: 20px;">flashlight_on</span>
          </button>
        </div>

        <!-- Viewport Bottom Message -->
        <div style="position: absolute; bottom: 12px; text-align: center; color: #cbd5e1; font-family: var(--font-headline); font-size: 13px; letter-spacing: 0.05em;">
          APUNTE LA CÁMARA AL CÓDIGO QR EN EL LATERAL DEL CONTENEDOR
        </div>
      </div>

      <!-- Detected Container Banner -->
      <div class="card-tactical card-tactical-accent" style="padding: 14px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <span class="font-label-sm" style="color: #64748b;">CONTENEDOR DETECTADO / EN RETÍCULA</span>
            <div class="font-headline-sm" style="color: #0f172a; margin-top: 2px;">
              ${currentContainer.id} • ${currentContainer.code}
            </div>
            <p class="font-body-sm" style="color: #64748b; font-size: 13px; margin-top: 2px;">
              ${currentContainer.address}
            </p>
          </div>
          <span class="badge-material badge-material-${currentContainer.material}">
            ${currentContainer.material.toUpperCase()}
          </span>
        </div>

        <!-- Action Button -->
        <button type="button" class="btn-tactical btn-tactical-primary" id="btn-start-report-scanned" style="margin-top: 6px;">
          <span class="material-symbols-outlined" style="font-size: 22px;">assignment</span>
          <span>INICIAR REPORTE DE ESTADO</span>
        </button>
      </div>

      <!-- Manual ID Fallback Modal Trigger -->
      <div class="card-tactical" style="padding: 12px 14px;">
        <span class="font-label-sm" style="color: #475569; display: block; margin-bottom: 6px;">
          SELECCIÓN RÁPIDA O ENTRADA MANUAL
        </span>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${state.stops.slice(0, 5).map(s => `
            <button 
              type="button" 
              class="btn-tactical btn-tactical-sm btn-quick-select-container ${s.id === currentContainer.id ? 'active' : ''}" 
              data-id="${s.id}"
              style="padding: 4px 10px; font-size: 12px;"
            >
              ${s.id} (${s.code})
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

export function attachQRScannerEvents(container, store) {
  container.querySelector('#btn-scanner-cancel')?.addEventListener('click', () => {
    store.setScreen('map');
  });

  let flashlightOn = false;
  container.querySelector('#btn-toggle-flashlight')?.addEventListener('click', (e) => {
    flashlightOn = !flashlightOn;
    e.currentTarget.style.backgroundColor = flashlightOn ? '#00a86b' : 'rgba(15, 23, 42, 0.85)';
    store.showToast(flashlightOn ? 'Linterna táctica encendida' : 'Linterna apagada', 'info');
  });

  container.querySelector('#btn-start-report-scanned')?.addEventListener('click', () => {
    store.setScreen('report');
  });

  container.querySelectorAll('.btn-quick-select-container').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (id) {
        store.selectContainer(id);
        store.showToast(`Contenedor seleccionado: ${id}`);
      }
    });
  });
}
