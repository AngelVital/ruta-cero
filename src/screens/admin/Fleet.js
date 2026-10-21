import { escapeHtml, icon } from '../../utils/html.js';

const fleetKinds = [
  { kind: 'unit', title: 'Unidades', placeholder: 'Descripción, ej. Freightliner LPZ-2099', iconName: 'local_shipping' },
  { kind: 'driver', title: 'Operadores', placeholder: 'Nombre del operador', iconName: 'badge' },
  { kind: 'assistant', title: 'Auxiliares', placeholder: 'Nombre del auxiliar', iconName: 'group' }
];

const ofKind = (fleet, kind) => fleet.filter((resource) => resource.kind === kind);

function renderFleetList(fleet, kind) {
  const items = ofKind(fleet, kind);
  if (!items.length) return '<li class="admin-field-events-empty">Sin registros.</li>';

  return items.map(({ id, name }) => `
    <li>
      <span><span class="admin-route-id">${escapeHtml(id)}</span> ${escapeHtml(name)}</span>
      <button type="button" class="admin-report-open" data-fleet-delete="${escapeHtml(id)}" aria-label="Eliminar ${escapeHtml(name)}">${icon('delete')}</button>
    </li>
  `).join('');
}

/** Units, drivers and assistants the field app offers at dispatch. */
export function renderFleetSection(fleet, fleetError = '') {
  return `
    <section class="admin-section admin-fleet-section" id="fleet">
      <div class="admin-section-heading">
        <div><div class="admin-section-kicker">DISPONIBLES EN EL DESPACHO DE CAMPO</div><h2>Personal y unidades</h2></div>
      </div>
      <p class="admin-route-message${fleetError ? ' is-error' : ''}" id="admin-fleet-message" role="status" aria-live="polite">${escapeHtml(fleetError)}</p>
      <div class="admin-fleet-grid">
        ${fleetKinds.map(({ kind, title, placeholder, iconName }) => `
          <div class="admin-fleet-column" data-fleet-kind="${kind}">
            <h3>${icon(iconName)}<span>${title}</span><span class="admin-heading-count" data-fleet-count>${ofKind(fleet, kind).length}</span></h3>
            <form class="admin-fleet-form">
              <label class="admin-search"><span class="sr-only">${placeholder}</span><input name="name" required maxlength="60" autocomplete="off" placeholder="${placeholder}"></label>
              <button type="submit" class="admin-button admin-button-dark">${icon('add')}<span>Agregar</span></button>
            </form>
            <ul class="admin-fleet-list">${renderFleetList(fleet, kind)}</ul>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

export function attachFleet(ctx, { addFleetResource, archiveFleetResource }) {
  const section = ctx.container.querySelector('#fleet');
  if (!section) return;
  const message = section.querySelector('#admin-fleet-message');
  const showMessage = (text, isError = false) => {
    message.textContent = text;
    message.classList.toggle('is-error', isError);
  };
  const update = () => {
    section.querySelectorAll('[data-fleet-kind]').forEach((column) => {
      const { fleetKind } = column.dataset;
      column.querySelector('.admin-fleet-list').innerHTML = renderFleetList(ctx.fleet, fleetKind);
      column.querySelector('[data-fleet-count]').textContent = String(ofKind(ctx.fleet, fleetKind).length);
    });
  };

  section.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const kind = form.closest('[data-fleet-kind]').dataset.fleetKind;
    const name = form.elements.name.value.trim();
    if (!name) return;
    if (ofKind(ctx.fleet, kind).some((resource) => resource.name.toLowerCase() === name.toLowerCase())) {
      showMessage(`${name} ya está registrado.`, true);
      return;
    }

    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const created = await addFleetResource(kind, name);
      ctx.fleet = [...ctx.fleet, created].sort((a, b) => a.name.localeCompare(b.name));
      form.reset();
      update();
      showMessage(`${created.name} registrado con el id ${created.id}.`);
    } catch (error) {
      showMessage(`No se pudo guardar: ${error.message}`, true);
    } finally {
      button.disabled = false;
    }
  });

  section.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-fleet-delete]');
    if (!button) return;
    const resource = ctx.fleet.find((item) => item.id === button.dataset.fleetDelete);
    if (!resource) return;
    if (!window.confirm(`¿Eliminar ${resource.id} · ${resource.name}? Ya no aparecerá en el despacho de campo; sus reportes conservan el id.`)) return;

    button.disabled = true;
    try {
      await archiveFleetResource(resource.id);
      ctx.fleet = ctx.fleet.filter((item) => item.id !== resource.id);
      update();
      showMessage(`${resource.id} · ${resource.name} eliminado.`);
    } catch (error) {
      button.disabled = false;
      showMessage(`No se pudo eliminar: ${error.message}`, true);
    }
  });
}
