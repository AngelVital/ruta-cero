import { fieldPhotoOptions, renderPhotoThumbnails } from '../components/FieldPhotos.js';
import { openPhotoCapture } from '../components/PhotoCaptureOverlay.js';
import { escapeHtml } from '../utils/html.js';
import { queueFieldAction } from '../services/fieldSync.js';
import { maxCompletionPhotos } from '../state/store.js';

export function renderRouteCompletionScreen(state) {
  const photos = state.route.completionPhotos || [];
  const canAddPhoto = photos.length < maxCompletionPhotos;

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
        <p class="font-body-sm text-soft">Confirma el regreso y captura de 1 a ${maxCompletionPhotos} fotos de evidencia para finalizar ${escapeHtml(state.route.id)} · ${escapeHtml(state.route.name)}.</p>
      </section>

      ${photos.length ? renderPhotoThumbnails(photos) : ''}

      <button type="button" class="btn-tactical${canAddPhoto ? '' : ' evidence-captured'}" id="btn-capture-route-photo" ${canAddPhoto ? '' : 'disabled'}>
        <span class="material-symbols-outlined">${canAddPhoto ? 'photo_camera' : 'check_circle'}</span>
        <span>${canAddPhoto ? `CAPTURAR EVIDENCIA (${photos.length} / ${maxCompletionPhotos})` : 'MÁXIMO DE FOTOS CAPTURADO'}</span>
      </button>

      <button type="button" class="btn-tactical btn-tactical-primary" id="btn-confirm-route-completion" ${photos.length ? '' : 'disabled'}>
        <span class="material-symbols-outlined">task_alt</span>
        <span>${photos.length ? 'FINALIZAR RUTA' : 'CAPTURA AL MENOS 1 FOTO'}</span>
      </button>
    </div>
  `;
}

export function attachRouteCompletionEvents(container, store) {
  const getPhotos = () => store.state.route.completionPhotos || [];

  container.querySelector('#btn-back-to-route-map')?.addEventListener('click', () => {
    store.setScreen('map');
  });

  container.querySelector('#btn-capture-route-photo')?.addEventListener('click', () => {
    openPhotoCapture(
      (photoDataUrl) => store.setCompletionPhotos([...getPhotos(), photoDataUrl]),
      (message) => store.showToast(message, 'info'),
      fieldPhotoOptions
    );
  });

  container.querySelectorAll('.field-photo-remove').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.getAttribute('data-photo-index'));
      store.setCompletionPhotos(getPhotos().filter((_, i) => i !== index));
    });
  });

  container.querySelector('#btn-confirm-route-completion')?.addEventListener('click', async (event) => {
    const routeId = store.state.route.id;
    const photos = getPhotos();
    if (!store.completeRoute()) {
      store.showToast('Captura al menos 1 foto de evidencia antes de finalizar la ruta.', 'info');
      return;
    }

    store.setScreen('route-summary');
    try {
      await queueFieldAction('closure', { routeId, photos });
      await queueFieldAction('complete', { routeId });
      store.showToast(`Ruta ${routeId} finalizada correctamente.`);
    } catch (error) {
      store.showToast(
        `La ruta ${routeId} se finalizó en este dispositivo, pero no se pudo guardar para sincronizar: ${error.message}`,
        'info',
        8000
      );
    }
  });
}
