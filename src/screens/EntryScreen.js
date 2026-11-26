import { escapeHtml, icon } from '../utils/html.js';

export function renderEntryScreen(message = '') {
  return `
    <main class="entry-screen">
      <aside class="entry-brand-band" aria-label="Ruta Cero">
        <div class="entry-brand">
          <span class="entry-brand-mark"><img src="/logo-light.svg" alt=""></span>
        </div>
        <svg class="entry-routes" aria-hidden="true">
          <!-- Coordinates are multiples of the band's 36px grid; the 0.5 offset centers strokes on its 1px lines -->
          <g transform="translate(0.5 0.5)">
            <path class="entry-route-base" d="M72 324 H288 V468 H504"/>
            <path class="entry-route-base" d="M252 612 H468 V792 H576"/>
            <path class="entry-route-base" d="M36 540 V792 H216 V972"/>
            <path class="entry-route-base" d="M396 324 V396 H540"/>
            <path class="entry-route-active" d="M36 396 H180 V540 H360 V720 H108 V864 H288"/>
            <path class="entry-route-flow" d="M36 396 H180 V540 H360 V720 H108 V864 H288"/>
            <circle class="entry-route-stop" cx="72" cy="324" r="3"/>
            <circle class="entry-route-stop" cx="504" cy="468" r="3"/>
            <circle class="entry-route-stop" cx="252" cy="612" r="3"/>
            <circle class="entry-route-stop" cx="468" cy="792" r="3"/>
            <circle class="entry-route-stop" cx="36" cy="540" r="3"/>
            <circle class="entry-route-stop" cx="216" cy="792" r="3"/>
            <circle class="entry-route-stop" cx="396" cy="324" r="3"/>
            <circle class="entry-route-stop is-active" cx="36" cy="396" r="3.5"/>
            <circle class="entry-route-stop is-active" cx="180" cy="540" r="3.5"/>
            <circle class="entry-route-stop is-active" cx="360" cy="720" r="3.5"/>
            <circle class="entry-route-stop is-active" cx="108" cy="864" r="3.5"/>
            <circle class="entry-route-end" cx="288" cy="864" r="6"/>
          </g>
        </svg>
        <div class="entry-brand-note">
          <span class="entry-brand-rule"></span>
          <span>RECOLECCIÓN URBANA<br>CONTROL DE OPERACIONES</span>
        </div>
        <div class="entry-band-index" aria-hidden="true">RC / 01</div>
      </aside>

      <section class="entry-main" aria-labelledby="entry-title">
        <div class="entry-main-content">
          <div class="entry-eyebrow"><span></span> ACCESO AL SISTEMA</div>
          <h1 id="entry-title">Iniciar sesión</h1>
          <p class="entry-subtitle" id="entry-subtitle">Entra con tu cuenta; el sistema abre el panel de campo o de administración según tu perfil.</p>

          <form id="entry-login-form" class="entry-login-form">
            <label for="entry-email">Correo electrónico</label>
            <input id="entry-email" name="email" type="email" autocomplete="username" required>
            <label for="entry-password">Contraseña</label>
            <input id="entry-password" name="password" type="password" autocomplete="current-password" required>
            <button class="entry-login-submit" id="entry-login-submit" type="submit"><span>Iniciar sesión</span>${icon('arrow_forward')}</button>
            <button class="entry-login-link" id="entry-show-password-form" type="button">Cambiar contraseña</button>
          </form>

          <form id="entry-password-form" class="entry-login-form" hidden>
            <label for="entry-password-email">Correo electrónico</label>
            <input id="entry-password-email" name="email" type="email" autocomplete="username" required>
            <label for="entry-current-password">Contraseña actual</label>
            <input id="entry-current-password" name="currentPassword" type="password" autocomplete="current-password" required>
            <label for="entry-new-password">Nueva contraseña</label>
            <input id="entry-new-password" name="newPassword" type="password" autocomplete="new-password" minlength="6" required>
            <label for="entry-confirm-password">Confirmar nueva contraseña</label>
            <input id="entry-confirm-password" name="confirmPassword" type="password" autocomplete="new-password" minlength="6" required>
            <button class="entry-login-submit" id="entry-password-submit" type="submit"><span>Guardar contraseña</span>${icon('check')}</button>
            <button class="entry-login-link" id="entry-show-login-form" type="button">Volver a iniciar sesión</button>
          </form>
          <p class="entry-login-message" id="entry-login-message" role="status" aria-live="polite">${escapeHtml(message)}</p>
        </div>
        <footer class="entry-footer"><span>RUTA CERO</span><span>ACCESO AL SISTEMA</span></footer>
      </section>
    </main>
  `;
}

/**
 * @param panelFor  maps the account roles ({ admin, field }) to the panel it opens, or null
 * @param openPanel opens that panel
 */
export function attachEntryScreen(container, { panelFor, openPanel }) {
  const form = container.querySelector('#entry-login-form');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = container.querySelector('#entry-login-submit');
    const message = container.querySelector('#entry-login-message');
    button.disabled = true;
    message.classList.remove('is-success');
    message.textContent = 'Verificando acceso…';

    try {
      const { signIn, signOut, getCurrentUserRoles } = await import('../services/supabase.js');
      await signIn(form.elements.email.value.trim(), form.elements.password.value);
      const panel = panelFor(await getCurrentUserRoles());
      if (!panel) {
        await signOut();
        throw new Error('Esta cuenta no tiene acceso a este panel. Pide al administrador que la registre.');
      }
      openPanel(panel);
    } catch (error) {
      message.textContent = error?.code === 'invalid_credentials' ? 'Correo o contraseña incorrectos.' : error.message;
      button.disabled = false;
    }
  });

  const passwordForm = container.querySelector('#entry-password-form');
  const title = container.querySelector('#entry-title');
  const subtitle = container.querySelector('#entry-subtitle');
  const message = container.querySelector('#entry-login-message');
  const loginSubtitle = subtitle.textContent;

  const showForm = (changingPassword, text = '', isSuccess = false) => {
    form.hidden = changingPassword;
    passwordForm.hidden = !changingPassword;
    title.textContent = changingPassword ? 'Cambiar contraseña' : 'Iniciar sesión';
    subtitle.textContent = changingPassword
      ? 'Confirma tu contraseña actual y elige una nueva.'
      : loginSubtitle;
    message.textContent = text;
    message.classList.toggle('is-success', isSuccess);
  };

  container.querySelector('#entry-show-password-form').addEventListener('click', () => {
    passwordForm.elements.email.value = form.elements.email.value;
    showForm(true);
  });
  container.querySelector('#entry-show-login-form').addEventListener('click', () => showForm(false));

  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const { email, currentPassword, newPassword, confirmPassword } = passwordForm.elements;
    message.classList.remove('is-success');
    if (newPassword.value !== confirmPassword.value) {
      message.textContent = 'La nueva contraseña y su confirmación no coinciden.';
      return;
    }

    const button = container.querySelector('#entry-password-submit');
    button.disabled = true;
    message.textContent = 'Actualizando contraseña…';

    try {
      const { changePassword } = await import('../services/supabase.js');
      await changePassword(email.value.trim(), currentPassword.value, newPassword.value);
      form.elements.email.value = email.value.trim();
      form.elements.password.value = '';
      passwordForm.reset();
      showForm(false, 'Contraseña actualizada. Inicia sesión con la nueva.', true);
    } catch (error) {
      message.textContent = {
        invalid_credentials: 'Correo o contraseña actual incorrectos.',
        same_password: 'La nueva contraseña debe ser distinta de la actual.',
        weak_password: 'La nueva contraseña es demasiado débil; usa al menos 6 caracteres.'
      }[error?.code] || error.message;
    } finally {
      button.disabled = false;
    }
  });
}
