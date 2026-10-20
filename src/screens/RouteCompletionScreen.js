import { openPhotoCapture } from '../components/PhotoCaptureOverlay.js';
import { escapeHtml } from '../utils/html.js';

export function renderRouteCompletionScreen(state) {
  const hasPhoto = Boolean(state.route.dashboardPhoto);

  return `
    <div class="screen-header-bar">
      <div class="screen-header-title">
        <span class="material-symbols-outlined">flag</span>
        <span>CIERRE DE RUTA · ${escapeHtml(state.route.id)}</span>
      </div>
      <button type="button" class="btn-tactical btn-tactical-sm" id="btn-back-to-route-map">VOLVER AL MAPA</button>
    </div>

    <div class="screen-body">
      <section class="card-tactical card-tactical-accent completion-card">
        <span class="font-label-sm text-muted">ESTACIÓN DE REGRESO</span>
        <h2 class="font-headline-sm text-ink completion-station">${escapeHtml(state.stops.find((stop) => stop.type === 'return-station')?.code || 'ESTACIÓN DE REGRESO')}</h2>
        <p class="font-body-sm text-soft completion-address">${escapeHtml(state.stops.find((stop) => stop.type === 'return-station')?.address || '')}</p>
        <p class="font-body-sm text-soft">Confirma el regreso y captura la evidencia fotográfica del tablero para finalizar ${escapeHtml(state.route.id)} · ${escapeHtml(state.route.name)}.</p>
      </section>

      <button type="button" class="btn-tactical" id="btn-capture-route-photo" aria-pressed="${hasPhoto}">
        <span class="material-symbols-outlined">${hasPhoto ? 'check_circle' : 'photo_camera'}</span>
        <span>${hasPhoto ? 'EVIDENCIA CAPTURADA · TOMAR OTRA' : 'CAPTURAR EVIDENCIA DE REGRESO'}</span>
      </button>

      ${hasPhoto ? `
        <img src="${state.route.dashboardPhoto}" alt="Evidencia fotográfica de regreso a estación" class="completion-photo" />
      ` : ''}

      <button type="button" class="btn-tactical btn-tactical-primary" id="btn-confirm-route-completion" ${hasPhoto ? '' : 'disabled'}>
        <span class="material-symbols-outlined">task_alt</span>
        <span>FINALIZAR RUTA</span>
      </button>
    </div>
  `;
}

export function attachRouteCompletionEvents(container, store) {
  container.querySelector('#btn-back-to-route-map')?.addEventListener('click', () => {
    store.setScreen('map');
  });

  container.querySelector('#btn-capture-route-photo')?.addEventListener('click', () => {
    openPhotoCapture(
      (photoDataUrl) => store.setDashboardPhoto(photoDataUrl),
      (message) => store.showToast(message, 'info')
    );
  });

  container.querySelector('#btn-confirm-route-completion')?.addEventListener('click', async (event) => {
    const routeId = store.state.route.id;
    if (!store.completeRoute()) {
      store.showToast('Captura la evidencia de regreso antes de finalizar la ruta.', 'info');
      return;
    }

    store.setScreen('dispatch');
    try {
      const { markRouteCompleted } = await import('../services/supabase.js');
      await markRouteCompleted(routeId);
      store.showToast(`Ruta ${routeId} finalizada correctamente.`);
    } catch (error) {
      store.showToast(
        `La ruta ${routeId} se finalizó en este dispositivo, pero no se sincronizó: ${error.message}`,
        'info',
        8000
      );
    }
  });
}
