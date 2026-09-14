
/**
 * Device Simulator & HUD Framework Shell
 * Provides rugged chassis wrapping and screen switching
 */

export function renderSimulatorToolbar(state) {
  return `
    <div class="simulator-toolbar">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="display: inline-block; width: 10px; height: 10px; background-color: #00a86b;"></span>
        <strong style="color: #ffffff;">RUTA CERO HUD</strong>
        <span style="color: #64748b; font-size: 11px;">(STITCH #13352991854495087010)</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <button type="button" class="simulator-toolbar-btn" id="btn-toggle-fullscreen">
          <span class="material-symbols-outlined" style="font-size: 16px;">
            ${state.fullscreenMode ? 'fullscreen_exit' : 'aspect_ratio'}
          </span>
          ${state.fullscreenMode ? 'MODO CELULAR' : 'PANTALLA COMPLETA'}
        </button>
      </div>
    </div>
  `;
}
