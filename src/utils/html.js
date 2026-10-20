export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const icon = (name, extraClass = '') => (
  `<span class="material-symbols-outlined${extraClass ? ` ${extraClass}` : ''}" aria-hidden="true">${name}</span>`
);
