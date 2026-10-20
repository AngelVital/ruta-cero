import { collectionPoints } from '../../data/collectionPoints.js';
import { buildRoutesCsv, filterRoutes, upsertRoute } from '../../domain/route.js';
import { createRouteId } from '../../services/routeConfiguration.js';
import { formatElapsedTime } from '../../utils/format.js';
import { escapeHtml, icon } from '../../utils/html.js';

function renderRouteRow(route, canDelete) {
  const progress = route.stopsTotal ? Math.round((route.stopsDone / route.stopsTotal) * 100) : 0;
  const syncClass = route.syncLabel === '1 evento pendiente' ? 'sync-pending' : 'sync-ok';
  const points = route.pointIds.map((pointId) => `<span class="admin-point-chip">${pointId}</span>`).join('');
  const isActive = route.status === 'active' && route.startedAt;
  const isCompleted = route.status === 'completed' && route.startedAt;
  const elapsedTime = isActive || isCompleted
    ? formatElapsedTime(route.startedAt, isCompleted && route.completedAt ? route.completedAt : Date.now())
    : 'Sin iniciar';
  return `
    <tr data-route-status="${route.status}">
      <td>
        <span class="admin-route-id">${route.id}</span>
        <span class="admin-route-zone">${escapeHtml(route.zone)}</span>
      </td>
      <td>
        <div class="admin-route-points">${points}</div>
        <span class="admin-cell-secondary">${route.pointIds.length} puntos asignados</span>
      </td>
      <td>
        <div class="admin-progress-label"><strong>${route.stopsDone}/${route.stopsTotal}</strong><span>${progress}%</span></div>
        <div class="admin-progress-track" role="progressbar" aria-label="Avance de ${route.id}" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
          <span style="width: ${progress}%"></span>
        </div>
      </td>
      <td><span class="admin-status status-${route.status}"><i></i>${route.statusLabel}</span></td>
      <td><span class="admin-cell-primary">${route.lastUpdate}</span><span class="admin-cell-secondary"${isActive ? ` data-route-elapsed data-route-started-at="${escapeHtml(route.startedAt)}"` : ''}>${elapsedTime}</span></td>
      <td><span class="admin-sync ${syncClass}"><i></i>${route.syncLabel}</span></td>
      <td class="admin-route-actions">
        <button type="button" class="admin-icon-button" data-route-action="edit" data-route-id="${route.id}" aria-label="Editar ${escapeHtml(route.id)}" title="Editar ruta">${icon('edit')}</button>
        <button type="button" class="admin-icon-button admin-icon-button-danger" data-route-action="delete" data-route-id="${route.id}" aria-label="Eliminar ${escapeHtml(route.id)}" title="Eliminar ruta" ${canDelete ? '' : 'disabled'}>${icon('delete')}</button>
      </td>
    </tr>
  `;
}

/**
 * @param routes rows to show (possibly filtered)
 * @param totalRoutes number of configured routes; the last remaining route cannot be deleted
 */
export function renderRouteTable(routes, totalRoutes = routes.length) {
  return routes.map((route) => renderRouteRow(route, totalRoutes > 1)).join('');
}

export function renderRouteEditorDialog() {
  return `
    <dialog class="admin-route-dialog" id="admin-route-dialog" aria-labelledby="admin-route-dialog-title">
      <form id="admin-route-form" class="admin-route-form">
        <header class="admin-route-dialog-header">
          <div><div class="admin-section-kicker">CONFIGURACIÓN DE RECORRIDO</div><h2 id="admin-route-dialog-title">Nueva ruta</h2></div>
          <button class="admin-icon-button" type="button" id="admin-route-dialog-close" aria-label="Cerrar">${icon('close')}</button>
        </header>
        <input type="hidden" name="routeId">
        <label class="admin-route-field">Nombre o zona de la ruta<input name="zone" type="text" maxlength="60" required placeholder="Ej. Centro Histórico"></label>
        <fieldset class="admin-route-point-list">
          <legend>Puntos incluidos</legend>
          ${collectionPoints.map((point) => `
            <label><input type="checkbox" name="routePoint" value="${point.id}"><span>${point.id}</span><span>${escapeHtml(point.name)}</span></label>
          `).join('')}
        </fieldset>
        <p class="admin-route-form-error" id="admin-route-form-error" role="alert"></p>
        <footer class="admin-route-dialog-actions">
          <button class="admin-button" type="button" id="admin-route-cancel">Cancelar</button>
          <button class="admin-button admin-button-dark" type="submit">Guardar ruta</button>
        </footer>
      </form>
    </dialog>
  `;
}

/** Re-renders only the table rows for the current search and status filter. */
export function updateRouteRows(ctx) {
  const { container } = ctx;
  const rows = container.querySelector('#admin-route-rows');
  const search = container.querySelector('#route-search');
  const statusFilter = container.querySelector('#route-status-filter');
  const filteredRoutes = filterRoutes(ctx.routes, search?.value || '', statusFilter?.value || 'all');
  rows.innerHTML = renderRouteTable(filteredRoutes, ctx.routes.length);
  rows.hidden = filteredRoutes.length === 0;
  container.querySelector('#admin-route-empty').hidden = filteredRoutes.length > 0;
}

/** Search, filter, create/edit dialog, delete and CSV export. */
export function attachRouteTable(ctx, { saveRouteConfigurations }) {
  const { container } = ctx;
  const rows = container.querySelector('#admin-route-rows');
  const routeDialog = container.querySelector('#admin-route-dialog');
  const routeForm = container.querySelector('#admin-route-form');
  const routeFormError = container.querySelector('#admin-route-form-error');

  container.querySelector('#route-search')?.addEventListener('input', () => updateRouteRows(ctx));
  container.querySelector('#route-status-filter')?.addEventListener('change', () => updateRouteRows(ctx));

  const openRouteEditor = (route = null) => {
    routeForm.reset();
    routeForm.elements.routeId.value = route?.id || '';
    routeForm.elements.zone.value = route?.zone || '';
    routeForm.querySelectorAll('input[name="routePoint"]').forEach((checkbox) => {
      checkbox.checked = Boolean(route?.pointIds.includes(checkbox.value));
    });
    container.querySelector('#admin-route-dialog-title').textContent = route ? `Editar ${route.id}` : 'Nueva ruta';
    routeFormError.textContent = '';
    routeDialog.showModal();
  };

  container.querySelector('#admin-create-route')?.addEventListener('click', () => openRouteEditor());
  container.querySelector('#admin-route-dialog-close')?.addEventListener('click', () => routeDialog.close());
  container.querySelector('#admin-route-cancel')?.addEventListener('click', () => routeDialog.close());
  routeDialog?.addEventListener('click', (event) => {
    if (event.target === routeDialog) routeDialog.close();
  });

  routeForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(routeForm);
    const pointIds = formData.getAll('routePoint');
    if (pointIds.length === 0) {
      routeFormError.textContent = 'Selecciona al menos un punto para la ruta.';
      return;
    }

    const nextRoutes = upsertRoute(ctx.routes, {
      routeId: String(formData.get('routeId') || createRouteId(ctx.routes)),
      zone: String(formData.get('zone')).trim(),
      pointIds
    });

    const submitButton = routeForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    routeFormError.textContent = '';
    try {
      await saveRouteConfigurations(nextRoutes);
      routeDialog.close();
      ctx.saveRoutesLocally(nextRoutes);
      ctx.showRouteMessage('Ruta guardada y sincronizada con campo.');
    } catch (error) {
      routeFormError.textContent = `No se pudo sincronizar la ruta: ${error.message}`;
    } finally {
      submitButton.disabled = false;
    }
  });

  rows?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-route-action]');
    if (!button) return;

    const route = ctx.routes.find((item) => item.id === button.dataset.routeId);
    if (!route) return;

    if (button.dataset.routeAction === 'edit') {
      openRouteEditor(route);
      return;
    }

    if (button.dataset.routeAction === 'delete') {
      if (ctx.routes.length <= 1) return;
      if (!window.confirm(`¿Eliminar la ruta ${route.id} (${route.zone})?`)) return;
      const nextRoutes = ctx.routes.filter((item) => item.id !== route.id);
      button.disabled = true;
      try {
        await saveRouteConfigurations(nextRoutes);
        ctx.saveRoutesLocally(nextRoutes);
        ctx.showRouteMessage(`${route.id} fue eliminada.`);
      } catch (error) {
        ctx.showRouteMessage(`No se pudo eliminar la ruta: ${error.message}`, true);
        button.disabled = false;
      }
    }
  });

  container.querySelector('#btn-export-routes')?.addEventListener('click', () => {
    const file = new Blob(['﻿', buildRoutesCsv(ctx.routes)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'ruta-cero-rutas-demo.csv';
    downloadLink.click();
    URL.revokeObjectURL(url);
  });
}
