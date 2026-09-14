/**
 * Oversized 52px Touch Stepper Control
 * Built for heavy industrial gloves and high physical stability
 */

export function renderStepperControl({ id, value, unit = '', step = 1, min = 0, max = 9999 }) {
  return `
    <div class="tactical-stepper" id="${id}" data-min="${min}" data-max="${max}" data-step="${step}">
      <button type="button" class="stepper-btn btn-stepper-decrement" aria-label="Decrementar">−</button>
      <div class="stepper-value-display">
        <span class="stepper-value">${value}</span>
        ${unit ? `<span style="font-size: 14px; margin-left: 4px; color: #64748b;">${unit}</span>` : ''}
      </div>
      <button type="button" class="stepper-btn btn-stepper-increment" aria-label="Incrementar">+</button>
    </div>
  `;
}

export function attachStepperEvents(element, onChange) {
  const dec = element.querySelector('.btn-stepper-decrement');
  const inc = element.querySelector('.btn-stepper-increment');
  const valEl = element.querySelector('.stepper-value');
  const step = parseFloat(element.getAttribute('data-step')) || 1;
  const min = parseFloat(element.getAttribute('data-min')) || 0;
  const max = parseFloat(element.getAttribute('data-max')) || 99999;

  dec?.addEventListener('click', () => {
    let current = parseFloat(valEl.innerText) || 0;
    let next = Math.max(min, +(current - step).toFixed(1));
    valEl.innerText = next;
    onChange && onChange(next);
  });

  inc?.addEventListener('click', () => {
    let current = parseFloat(valEl.innerText) || 0;
    let next = Math.min(max, +(current + step).toFixed(1));
    valEl.innerText = next;
    onChange && onChange(next);
  });
}
