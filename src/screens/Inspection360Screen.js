import { openPhotoCapture } from '../components/PhotoCaptureOverlay.js';
import { inspectionItems as checkItems } from '../data/inspectionItems.js';
import { getInspectionProgress, getInspectionStatusLabel, requiresInspectionComment } from '../domain/inspection.js';
import { escapeHtml } from '../utils/html.js';

/**
 * Pantalla 2: Inspección 360° - Verificación de Unidad
 */

const inspectionChoices = [
  { value: 'BIEN', icon: 'check_circle' },
  { value: 'REGULAR' },
  { value: 'MAL' }
];

/** Comment box shown for REGULAR or MAL; MAL uses the critical color. */
function renderCommentBox(key, value, comment) {
  return `
    <div class="inspection-comment-box${value === 'MAL' ? ' is-bad' : ''}" data-box-key="${key}">
      <label class="font-label-sm inspection-comment-label">
        <span class="material-symbols-outlined icon-16">report_problem</span>
        <span class="comment-label-text">OBSERVACIÓN / MOTIVO DE ESTADO ${value}:</span>
      </label>
      <textarea
        class="input-tactical inspection-comment-input"
        data-comment-key="${key}"
        placeholder="Escribe aquí las observaciones o anomalías encontradas..."
      >${escapeHtml(comment)}</textarea>
    </div>
  `;
}

export function renderInspection360Screen(state) {
  const odometerPhotoCaptured = Boolean(state.inspection360.odometerPhotoEvidence);
  const progress = getInspectionProgress(state.inspection360, state.inspectionComments);

  return `
    <div class="screen-header-bar">
      <div class="screen-header-title">
        <span class="material-symbols-outlined">fact_check</span>
        <span>INSPECCIÓN 360° DE UNIDAD</span>
      </div>
      <button type="button" class="btn-tactical btn-tactical-sm" id="btn-back-to-dispatch">
        REGRESAR
      </button>
    </div>

    <div class="screen-body">
      <!-- Unit Card -->
      <div class="card-tactical card-tactical-accent inspection-unit-card">
        <div class="inspection-unit-head">
          <div>
            <span class="font-label-sm text-muted">UNIDAD BAJO INSPECCIÓN</span>
            <div class="font-headline-sm text-ink">${escapeHtml(state.dispatchOptions.units.find((unit) => unit.id === state.assignment.unitId)?.label || 'SIN UNIDAD ASIGNADA')}</div>
          </div>
          <span class="status-pill status-pill-optimal status-pill-xs">
            OPERATIVO
          </span>
        </div>

        <!-- Odometer photographic evidence (the reading is taken from the photo) -->
        <button type="button" class="btn-tactical btn-tactical-secondary inspection-photo-btn${odometerPhotoCaptured ? ' active evidence-captured' : ''}" id="btn-odometer-photo" aria-pressed="${odometerPhotoCaptured ? 'true' : 'false'}">
          <span class="material-symbols-outlined icon-20${odometerPhotoCaptured ? '' : ' text-primary'}">${odometerPhotoCaptured ? 'check_circle' : 'photo_camera'}</span>
          <span id="odometer-photo-status" aria-live="polite">${odometerPhotoCaptured ? 'FOTO DEL ODÓMETRO CAPTURADA' : 'FOTO EVIDENCIA DEL ODÓMETRO'}</span>
        </button>
      </div>

      <!-- Checklist Items -->
      <div class="inspection-items">
        ${checkItems.map((item) => {
          const currentVal = state.inspection360[item.key] ?? null;
          const comment = state.inspectionComments?.[item.key] || '';

          return `
            <div class="card-tactical card-compact" data-item-card="${item.key}">
              <div class="inspection-item-head">
                <div class="inspection-item-title">
                  <span class="material-symbols-outlined icon-22 ${currentVal === null ? 'text-faint' : 'text-primary'}">${item.icon}</span>
                  <div>
                    <h3 class="font-headline-sm inspection-item-name">${item.title}</h3>
                    <p class="font-body-sm inspection-item-desc">${item.desc}</p>
                  </div>
                </div>
                ${currentVal === null ? '<span class="font-label-sm inspection-item-pending">SIN REVISAR</span>' : ''}
              </div>

              <!-- 3-Way Tactical Toggle -->
              <div class="inspection-toggle">
                ${inspectionChoices.map(({ value, icon }) => `
                  <button
                    type="button"
                    class="btn-tactical btn-tactical-sm inspection-choice${currentVal === value ? ' active' : ''}"
                    data-check="${item.key}"
                    data-value="${value}"
                  >
                    ${icon ? `<span class="material-symbols-outlined icon-16">${icon}</span>` : ''}
                    ${value}
                  </button>
                `).join('')}
              </div>

              <!-- Conditional Comment Box (Visible for REGULAR or MAL) -->
              ${requiresInspectionComment(currentVal) ? renderCommentBox(item.key, currentVal, comment) : ''}
            </div>
          `;
        }).join('')}
      </div>

      <!-- Submit Inspection -->
      <button
        type="button"
        class="btn-tactical btn-tactical-primary btn-gated"
        id="btn-confirm-inspection"
        ${progress.ready ? '' : 'disabled'}
      >
        <span class="material-symbols-outlined icon-22">verified</span>
        <span>${getInspectionStatusLabel(progress)}</span>
      </button>
    </div>
  `;
}

export function attachInspection360Events(container, store) {
  container.querySelector('#btn-back-to-dispatch')?.addEventListener('click', () => {
    store.setScreen('dispatch');
  });

  // Odometer photo evidence
  container.querySelector('#btn-odometer-photo')?.addEventListener('click', (event) => {
    openPhotoCapture(
      () => {
        store.updateInspectionItem('odometerPhotoEvidence', true);
        store.showToast('Foto del odómetro tomada correctamente.', 'success');
      },
      (message) => store.showToast(message, 'info')
    );
  });

  const updateConfirmButton = () => {
    const confirmBtn = container.querySelector('#btn-confirm-inspection');
    if (!confirmBtn) return;

    const progress = getInspectionProgress(store.state.inspection360, store.state.inspectionComments);
    confirmBtn.disabled = !progress.ready;
    confirmBtn.querySelector('span:last-child').textContent = getInspectionStatusLabel(progress);
  };

  // Attach input listeners to any initially rendered comment textareas
  container.querySelectorAll('.inspection-comment-input').forEach(textarea => {
    textarea.addEventListener('input', (e) => {
      const k = e.currentTarget.getAttribute('data-comment-key');
      if (k) {
        store.updateInspectionComment(k, e.currentTarget.value);
        updateConfirmButton();
      }
    });
  });

  // Handle 3-way toggle clicks without showing toasts
  const toggleButtons = container.querySelectorAll('[data-check]');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const key = e.currentTarget.getAttribute('data-check');
      const val = e.currentTarget.getAttribute('data-value');

      // Saved without re-rendering: the card is updated in place below.
      store.updateInspectionItem(key, val, false);

      // Update button active styling in this card
      const card = e.currentTarget.closest('[data-item-card]');
      if (!card) return;

      card.querySelectorAll('[data-check]').forEach((b) => b.classList.toggle('active', b === e.currentTarget));

      // Handle comment box visibility & styling
      let commentBox = card.querySelector('.inspection-comment-box');

      if (val === 'BIEN') {
        if (commentBox) {
          commentBox.remove();
        }
      } else if (!commentBox) {
        const existingComment = store.state.inspectionComments?.[key] || '';
        card.insertAdjacentHTML('beforeend', renderCommentBox(key, val, existingComment));

        const textarea = card.querySelector('.inspection-comment-input');
        textarea?.addEventListener('input', (ev) => {
          store.updateInspectionComment(key, ev.currentTarget.value);
          updateConfirmButton();
        });
        textarea?.focus();
      } else {
        commentBox.classList.toggle('is-bad', val === 'MAL');
        const labelText = commentBox.querySelector('.comment-label-text');
        if (labelText) labelText.textContent = `OBSERVACIÓN / MOTIVO DE ESTADO ${val}:`;
      }

      // Actualiza el avance en el mismo clic, sin reconstruir la pantalla.
      updateConfirmButton();
    });
  });

  // Confirm inspection and save all comments
  container.querySelector('#btn-confirm-inspection')?.addEventListener('click', () => {
    const progress = getInspectionProgress(store.state.inspection360, store.state.inspectionComments);
    const missingCommentKey = progress.missingCommentKeys[0];
    if (!progress.ready) {
      container.querySelector(`[data-comment-key="${missingCommentKey}"]`)?.focus();
      return;
    }

    container.querySelectorAll('.inspection-comment-input').forEach(input => {
      const k = input.getAttribute('data-comment-key');
      if (k) store.updateInspectionComment(k, input.value.trim());
    });

    store.completeInspection();
    store.showToast('Inspección 360° completada con éxito. Unidad lista para despacho.', 'success', 1500);
    store.setScreen('dispatch');
  });
}
