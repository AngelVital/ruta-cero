/**
 * Oversized 52px Touch Stepper Control
 * Built for heavy industrial gloves and high physical stability
 */

export function renderStepperControl({ id, value, unit = '', step = 1, min = 0, max = 9999, editable = false, inputClass = '' }) {
  return `
    <div class="tactical-stepper" id="${id}" data-min="${min}" data-max="${max}" data-step="${step}">
      <button type="button" class="stepper-btn btn-stepper-decrement" aria-label="Decrementar">−</button>
      <div class="stepper-value-display">
        ${editable
          ? `<input type="number" class="stepper-value-input ${inputClass}" value="${value}" min="${min}" max="${max}" step="${step}" inputmode="numeric" aria-label="Kilos del material" style="width: 82px; min-width: 0; border: 0; background: transparent; outline: none; text-align: center; font: inherit; color: inherit;">`
          : `<span class="stepper-value">${value}</span>`}
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
  const inputEl = element.querySelector('.stepper-value-input');
  const step = parseFloat(element.getAttribute('data-step')) || 1;
  const min = parseFloat(element.getAttribute('data-min')) || 0;
  const max = parseFloat(element.getAttribute('data-max')) || 99999;

  const getCurrentValue = () => parseFloat(inputEl ? inputEl.value : valEl?.innerText) || 0;
  const setValue = (value) => {
    if (inputEl) {
      inputEl.value = value;
    }
    if (valEl) {
      valEl.innerText = value;
    }
  };

  dec?.addEventListener('click', () => {
    let current = getCurrentValue();
    let next = Math.max(min, +(current - step).toFixed(1));
    setValue(next);
    onChange && onChange(next);
  });

  inc?.addEventListener('click', () => {
    let current = getCurrentValue();
    let next = Math.min(max, +(current + step).toFixed(1));
    setValue(next);
    onChange && onChange(next);
  });
}
