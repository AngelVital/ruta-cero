import { openPhotoCapture } from '../components/PhotoCaptureOverlay.js';

/**
 * Pantalla 2: Inspección 360° - Verificación de Unidad
 */

export function renderInspection360Screen(state) {
  const checkItems = [
    { key: 'tires', title: '1. ESTADO DE LLANTAS', desc: 'Desgaste, presión y birlos', icon: 'tire_repair' },
    { key: 'fluids', title: '2. ACEITE DE MOTOR', desc: 'Aceite de motor, anticongelante y dirección', icon: 'oil_barrel' },
    { key: 'hydraulics', title: '3. LÍQUIDO REFRIGERANTE', desc: 'Mangueras de alta presión y pistones sin fugas', icon: 'device_thermostat' },
    { key: 'lights', title: '4. SISTEMA DE LUCES', desc: 'Luces, faros y reversa con alarma', icon: 'highlight' },
    { key: 'brakes', title: '5. SISTEMA DE FRENOS', desc: 'Frenos de aire, líquido de frenos y parking', icon: 'health_and_safety' },
    { key: 'wipers', title: '6. LIMPIAPARABRISAS', desc: 'Plumas y aspersores', icon: 'water_drop' },
    { key: 'mirrors', title: '7. ESPEJOS RETROVISORES', desc: 'Espejos y viseras', icon: 'visibility' },
    { key: 'safetyGear', title: '8. EQUIPO DE SEGURIDAD', desc: 'Chalecos, conos y botiquín', icon: 'security' },
    { key: 'extinguisher', title: '9. EXTINTOR DE INCENDIOS', desc: 'Extintor con vigencia', icon: 'fire_extinguisher' }
  ];

  return `
    <div class="screen-header-bar">
      <div class="screen-header-title">
        <span class="material-symbols-outlined" style="color: var(--color-primary);">fact_check</span>
        <span>INSPECCIÓN 360° DE UNIDAD</span>
      </div>
      <button type="button" class="btn-tactical btn-tactical-sm" id="btn-back-to-dispatch">
        REGRESAR
      </button>
    </div>

    <div style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
      <!-- Odometer and Unit Card -->
      <div class="card-tactical card-tactical-accent" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 12px;">
        <!-- Unit Info Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
          <div>
            <span class="font-label-sm" style="color: #64748b;">UNIDAD BAJO INSPECCIÓN</span>
            <div class="font-headline-sm" style="color: #0f172a;">${state.unit.id} • ${state.unit.plates}</div>
          </div>
          <span class="status-pill status-pill-optimal" style="font-size: 11px;">
            ${state.unit.status || 'OPERATIVO'}
          </span>
        </div>

        <!-- Odometer Control Container -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
            <label class="font-label-sm" for="input-odometer-value" style="color: #0f172a; font-weight: 800; display: flex; align-items: center; gap: 4px;">
              <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-primary);">speed</span>
              <span>ODÓMETRO INICIAL DE SALIDA</span>
            </label>
            <span class="font-label-sm" style="color: var(--color-primary); font-weight: 800;">VALOR EN TABLERO</span>
          </div>

          <!-- Stepper: [-10] [-1] [ Input KM ] [+1] [+10] -->
          <div style="display: flex; align-items: stretch; border: 2px solid #0f172a; background-color: #ffffff; box-shadow: var(--shadow-resting); min-height: 52px;">
            <!-- Left: -10 and -1 -->
            <button 
              type="button" 
              class="btn-tactical btn-odometer-delta" 
              data-delta="-10"
              title="Restar 10 kilómetros"
              style="min-height: 52px; width: 48px; padding: 0; font-size: 14px; font-weight: 800; border: none; border-right: 2px solid #0f172a; background-color: #f1f5f9; box-shadow: none;"
            >
              -10
            </button>
            <button 
              type="button" 
              class="btn-tactical btn-odometer-delta" 
              data-delta="-1"
              title="Restar 1 kilómetro"
              style="min-height: 52px; width: 44px; padding: 0; font-size: 16px; font-weight: 800; border: none; border-right: 2px solid #0f172a; background-color: #f8fafc; box-shadow: none;"
            >
              -1
            </button>

            <!-- Center: Odometer Input and KM indicator -->
            <div style="flex: 1; display: flex; align-items: center; justify-content: center; background-color: #ffffff; padding: 0 6px;">
              <input 
                type="number" 
                id="input-odometer-value" 
                value="${state.unit.odometer}"
                style="width: 100%; border: none; outline: none; background: transparent; text-align: center; font-family: var(--font-mono); font-size: 22px; font-weight: 800; color: #0f172a; -moz-appearance: textfield;"
              />
              <span style="font-family: var(--font-headline); font-size: 14px; font-weight: 800; color: #64748b; margin-left: 2px;">KM</span>
            </div>

            <!-- Right: +1 and +10 -->
            <button 
              type="button" 
              class="btn-tactical btn-odometer-delta" 
              data-delta="1"
              title="Sumar 1 kilómetro"
              style="min-height: 52px; width: 44px; padding: 0; font-size: 16px; font-weight: 800; border: none; border-left: 2px solid #0f172a; background-color: #f8fafc; box-shadow: none;"
            >
              +1
            </button>
            <button 
              type="button" 
              class="btn-tactical btn-odometer-delta" 
              data-delta="10"
              title="Sumar 10 kilómetros"
              style="min-height: 52px; width: 48px; padding: 0; font-size: 14px; font-weight: 800; border: none; border-left: 2px solid #0f172a; background-color: #f1f5f9; box-shadow: none;"
            >
              +10
            </button>
          </div>
        </div>

        <!-- Button directly below for Odometer Photographic Evidence -->
        <button type="button" class="btn-tactical btn-tactical-secondary" id="btn-odometer-photo" style="min-height: 48px; width: 100%;">
          <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-primary);">photo_camera</span>
          <span>FOTO EVIDENCIA DEL ODÓMETRO</span>
        </button>
      </div>

      <!-- Checklist Items -->
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${checkItems.map(item => {
    const currentVal = state.inspection360[item.key] ?? null;
    const comment = (state.inspectionComments && state.inspectionComments[item.key]) || '';
    const showComment = currentVal === 'REGULAR' || currentVal === 'MAL';
    const commentColor = currentVal === 'MAL' ? '#e11d48' : '#d97706';
    const commentBorder = currentVal === 'MAL' ? '#e11d48' : '#eab308';

    return `
            <div class="card-tactical" style="padding: 12px 14px;" data-item-card="${item.key}">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="display: flex; gap: 10px; align-items: center;">
                  <span class="material-symbols-outlined" style="color: ${currentVal === null ? '#94a3b8' : 'var(--color-primary)'}; font-size: 22px;">${item.icon}</span>
                  <div>
                    <h3 class="font-headline-sm" style="font-size: 16px; margin: 0;">${item.title}</h3>
                    <p class="font-body-sm" style="font-size: 13px; color: #64748b; margin: 0;">${item.desc}</p>
                  </div>
                </div>
                ${currentVal === null ? `<span class="font-label-sm" style="color: #94a3b8; font-size: 11px; white-space: nowrap;">SIN REVISAR</span>` : ''}
              </div>

              <!-- 3-Way Tactical Toggle -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 8px;">
                <button 
                  type="button" 
                  class="btn-tactical btn-tactical-sm ${currentVal === 'BIEN' ? 'active' : ''}" 
                  style="${currentVal === 'BIEN' ? 'background-color: #00a86b; color: #ffffff;' : ''}"
                  data-check="${item.key}" 
                  data-value="BIEN"
                >
                  <span class="material-symbols-outlined" style="font-size: 16px;">check_circle</span>
                  BIEN
                </button>
                <button 
                  type="button" 
                  class="btn-tactical btn-tactical-sm ${currentVal === 'REGULAR' ? 'active' : ''}" 
                  style="${currentVal === 'REGULAR' ? 'background-color: #eab308; color: #0f172a;' : ''}"
                  data-check="${item.key}" 
                  data-value="REGULAR"
                >
                  REGULAR
                </button>
                <button 
                  type="button" 
                  class="btn-tactical btn-tactical-sm ${currentVal === 'MAL' ? 'active' : ''}" 
                  style="${currentVal === 'MAL' ? 'background-color: #e11d48; color: #ffffff;' : ''}"
                  data-check="${item.key}" 
                  data-value="MAL"
                >
                  MAL
                </button>
              </div>

              <!-- Conditional Comment Box (Visible for REGULAR or MAL) -->
              ${showComment ? `
                <div class="inspection-comment-box" data-box-key="${item.key}" style="margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
                  <label class="font-label-sm" style="color: ${commentColor}; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                    <span class="material-symbols-outlined" style="font-size: 16px;">report_problem</span>
                    <span class="comment-label-text">OBSERVACIÓN / MOTIVO DE ESTADO ${currentVal}:</span>
                  </label>
                  <textarea 
                    class="input-tactical inspection-comment-input" 
                    data-comment-key="${item.key}"
                    placeholder="Escribe aquí las observaciones o anomalías encontradas..."
                    style="min-height: 56px; resize: vertical; padding: 8px 10px; font-size: 14px; font-weight: 500; border-color: ${commentBorder}; width: 100%;"
                  >${comment}</textarea>
                </div>
              ` : ''}
            </div>
          `;
  }).join('')}
      </div>

      <!-- Submit Inspection -->
      ${(() => {
        const inspectionKeys = ['tires', 'fluids', 'hydraulics', 'lights', 'brakes', 'wipers', 'mirrors', 'safetyGear', 'extinguisher'];
        const filled = inspectionKeys.filter(k => state.inspection360[k] !== null && state.inspection360[k] !== undefined).length;
        const total = inspectionKeys.length;
        const allFilled = filled === total;
        return `
          <button
            type="button"
            class="btn-tactical btn-tactical-primary"
            id="btn-confirm-inspection"
            ${!allFilled ? 'disabled' : ''}
            style="${!allFilled ? 'opacity: 0.45; cursor: not-allowed;' : ''}"
          >
            <span class="material-symbols-outlined" style="font-size: 22px;">verified</span>
            <span>${allFilled ? 'CONFIRMAR Y FIRMAR INSPECCIÓN' : `FALTAN ${total - filled} CAMPO${total - filled !== 1 ? 'S' : ''} POR REVISAR`}</span>
          </button>
        `;
      })()}
    </div>
  `;
}

export function attachInspection360Events(container, store) {
  container.querySelector('#btn-back-to-dispatch')?.addEventListener('click', () => {
    store.setScreen('dispatch');
  });

  // Odometer delta controls (-10, -1, +1, +10)
  const odoInput = container.querySelector('#input-odometer-value');
  container.querySelectorAll('.btn-odometer-delta').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const delta = parseInt(e.currentTarget.getAttribute('data-delta'), 10) || 0;
      let cur = parseInt(odoInput ? odoInput.value : store.state.unit.odometer, 10);
      if (isNaN(cur)) cur = store.state.unit.odometer || 0;
      const next = Math.max(0, cur + delta);
      if (odoInput) odoInput.value = next;
      store.updateOdometer(next);
    });
  });

  // Odometer direct input
  odoInput?.addEventListener('input', (e) => {
    const val = parseInt(e.currentTarget.value, 10);
    if (!isNaN(val)) {
      store.updateOdometer(val);
    }
  });

  // Odometer photo evidence
  container.querySelector('#btn-odometer-photo')?.addEventListener('click', () => {
    openPhotoCapture(
      () => store.showToast('Foto del odómetro capturada como evidencia', 'info'),
      (message) => store.showToast(message, 'info')
    );
  });

  // Attach input listeners to any initially rendered comment textareas
  container.querySelectorAll('.inspection-comment-input').forEach(textarea => {
    textarea.addEventListener('input', (e) => {
      const k = e.currentTarget.getAttribute('data-comment-key');
      if (k) store.updateInspectionComment(k, e.currentTarget.value);
    });
  });

  // Handle 3-way toggle clicks without showing toasts
  const toggleButtons = container.querySelectorAll('[data-check]');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const key = e.currentTarget.getAttribute('data-check');
      const val = e.currentTarget.getAttribute('data-value');

      // Update state in store directly (without toast notification)
      store.state.inspection360[key] = val;

      // Update button active styling in this card
      const card = e.currentTarget.closest('[data-item-card]');
      if (!card) return;

      const cardButtons = card.querySelectorAll('[data-check]');
      cardButtons.forEach(b => {
        b.classList.remove('active');
        b.style.backgroundColor = '';
        b.style.color = '';
      });

      e.currentTarget.classList.add('active');
      if (val === 'BIEN') {
        e.currentTarget.style.backgroundColor = '#00a86b';
        e.currentTarget.style.color = '#ffffff';
      } else if (val === 'REGULAR') {
        e.currentTarget.style.backgroundColor = '#eab308';
        e.currentTarget.style.color = '#0f172a';
      } else if (val === 'MAL') {
        e.currentTarget.style.backgroundColor = '#e11d48';
        e.currentTarget.style.color = '#ffffff';
      }

      // Handle comment box visibility & styling
      let commentBox = card.querySelector('.inspection-comment-box');

      if (val === 'BIEN') {
        if (commentBox) {
          commentBox.remove();
        }
      } else {
        const isMal = val === 'MAL';
        const color = isMal ? '#e11d48' : '#d97706';
        const borderColor = isMal ? '#e11d48' : '#eab308';

        if (!commentBox) {
          const existingComment = (store.state.inspectionComments && store.state.inspectionComments[key]) || '';
          const boxDiv = document.createElement('div');
          boxDiv.className = 'inspection-comment-box';
          boxDiv.setAttribute('data-box-key', key);
          boxDiv.style.cssText = 'margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 8px;';
          boxDiv.innerHTML = `
            <label class="font-label-sm" style="color: ${color}; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
              <span class="material-symbols-outlined" style="font-size: 16px;">report_problem</span>
              <span class="comment-label-text">OBSERVACIÓN / MOTIVO DE ESTADO ${val}:</span>
            </label>
            <textarea 
              class="input-tactical inspection-comment-input" 
              data-comment-key="${key}"
              placeholder="Escribe aquí las observaciones o anomalías encontradas..."
              style="min-height: 56px; resize: vertical; padding: 8px 10px; font-size: 14px; font-weight: 500; border-color: ${borderColor}; width: 100%;"
            >${existingComment}</textarea>
          `;
          card.appendChild(boxDiv);

          const textarea = boxDiv.querySelector('.inspection-comment-input');
          textarea?.addEventListener('input', (ev) => {
            store.updateInspectionComment(key, ev.currentTarget.value);
          });
          textarea?.focus();
        } else {
          const labelText = commentBox.querySelector('.comment-label-text');
          const label = commentBox.querySelector('label');
          const textarea = commentBox.querySelector('.inspection-comment-input');
          if (labelText) labelText.textContent = `OBSERVACIÓN / MOTIVO DE ESTADO ${val}:`;
          if (label) label.style.color = color;
          if (textarea) textarea.style.borderColor = borderColor;
        }
      }
    });

    // After each toggle, update the confirm button state without full re-render
    const inspectionKeys = ['tires', 'fluids', 'hydraulics', 'lights', 'brakes', 'wipers', 'mirrors', 'safetyGear', 'extinguisher'];
    const confirmBtn = container.querySelector('#btn-confirm-inspection');
    if (confirmBtn) {
      const filled = inspectionKeys.filter(k => store.state.inspection360[k] !== null && store.state.inspection360[k] !== undefined).length;
      const total = inspectionKeys.length;
      const allFilled = filled === total;
      confirmBtn.disabled = !allFilled;
      confirmBtn.style.opacity = allFilled ? '1' : '0.45';
      confirmBtn.style.cursor = allFilled ? '' : 'not-allowed';
      confirmBtn.querySelector('span:last-child').textContent = allFilled
        ? 'CONFIRMAR Y FIRMAR INSPECCIÓN'
        : `FALTAN ${total - filled} CAMPO${total - filled !== 1 ? 'S' : ''} POR REVISAR`;
    }
  });

  // Confirm inspection and save all comments
  container.querySelector('#btn-confirm-inspection')?.addEventListener('click', () => {
    const inspectionKeys = ['tires', 'fluids', 'hydraulics', 'lights', 'brakes', 'wipers', 'mirrors', 'safetyGear', 'extinguisher'];
    const allFilled = inspectionKeys.every(k => store.state.inspection360[k] !== null && store.state.inspection360[k] !== undefined);
    if (!allFilled) return;

    container.querySelectorAll('.inspection-comment-input').forEach(input => {
      const k = input.getAttribute('data-comment-key');
      if (k) store.updateInspectionComment(k, input.value.trim());
    });

    store.state.inspection360.completed = true;
    store.showToast('Inspección 360° completada con éxito. Unidad lista para despacho.');
    store.setScreen('dispatch');
  });
}
