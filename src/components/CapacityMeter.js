const fillLevelLabels = {
  low: 'BAJO',
  medium: 'MEDIO',
  full: 'LLENO'
};

export function normalizeFillLevel(value) {
  if (value === 'critical') return 'full';
  if (Object.hasOwn(fillLevelLabels, value)) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 75) return 'full';
    if (value > 50) return 'medium';
    return 'low';
  }
  return null;
}

export function getFillLevelLabel(value) {
  const level = normalizeFillLevel(value);
  return level ? fillLevelLabels[level] : 'SIN NIVEL';
}

export function renderCapacityMeter(value) {
  const level = normalizeFillLevel(value);
  const statusClass = level === 'full' ? 'critical' : level === 'medium' ? 'warning' : 'optimal';
  const filledBlocks = level ? ['low', 'medium', 'full'].indexOf(level) + 1 : 0;
  const blockClasses = Array.from({ length: 3 }, (_, index) => (
    index < filledBlocks ? `filled-${statusClass}` : ''
  ));

  return `
    <div class="capacity-meter-wrap">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
        <span class="font-label-sm" style="color: #475569;">NIVEL DEL CONTENEDOR</span>
        <span class="font-headline-sm" id="capacity-level-display" style="color: var(--color-cap-${statusClass}); font-weight: 800;">
          ${getFillLevelLabel(level)}
        </span>
      </div>

      <div class="capacity-blocks" id="capacity-meter-blocks">
        <div class="capacity-block ${blockClasses[0]}" data-block="1"></div>
        <div class="capacity-block ${blockClasses[1]}" data-block="2"></div>
        <div class="capacity-block ${blockClasses[2]}" data-block="3"></div>
      </div>

    </div>
  `;
}
