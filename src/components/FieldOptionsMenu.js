/**
 * Menú de opciones del panel de campo: cerrar sesión sin terminar la ruta,
 * guardando el avance del día en el teléfono o borrándolo.
 */
import { getPendingSyncCount } from '../services/fieldSync.js';
import { fieldStateStorageKey } from '../state/store.js';

export function renderFieldOptionsMenu() {
  return `
    <details class="field-options">
      <summary class="btn-tactical btn-tactical-sm" aria-label="Opciones">
        <span class="material-symbols-outlined">more_vert</span>
      </summary>
      <div class="field-options-menu card-tactical">
        <details class="field-sign-out-options">
          <summary class="btn-tactical btn-tactical-sm">
            <span class="material-symbols-outlined">logout</span>
            <span>CERRAR SESIÓN</span>
          </summary>
          <div class="field-options-menu-list">
            <button type="button" class="btn-tactical btn-tactical-sm btn-field-sign-out">
              <span class="material-symbols-outlined">save</span>
              <span>GUARDAR AVANCE</span>
            </button>
            <button type="button" class="btn-tactical btn-tactical-sm btn-field-sign-out" data-discard-progress>
              <span class="material-symbols-outlined">delete</span>
              <span>BORRAR AVANCE</span>
            </button>
          </div>
        </details>
      </div>
    </details>
  `;
}

export function attachFieldSignOut(container, store) {
  container.querySelectorAll('.btn-field-sign-out').forEach((button) => {
    button.addEventListener('click', async () => {
      // Signing out first would leave the queue without an account that may send it.
      if (getPendingSyncCount() > 0) {
        store.showToast('Espera a que se envíen los registros pendientes antes de cerrar sesión.', 'info', 5000);
        return;
      }

      const discardProgress = button.hasAttribute('data-discard-progress');
      if (!window.confirm(discardProgress
        ? '¿Cerrar sesión y borrar el avance de la ruta guardado en este teléfono? No se puede deshacer.'
        : '¿Cerrar sesión? El avance de la ruta se queda guardado en este teléfono.')) return;

      button.disabled = true;
      try {
        const { signOut } = await import('../services/supabase.js');
        await signOut();
        if (discardProgress) window.localStorage.removeItem(fieldStateStorageKey);
        window.location.replace('/');
      } catch (error) {
        store.showToast(`No se pudo cerrar sesión (revisa la señal): ${error.message}`, 'info', 5000);
        button.disabled = false;
      }
    });
  });
}
