import { escapeHtml, icon } from '../../utils/html.js';

export function renderAdminLogin(message = '', showSignOut = false) {
  return `
    <main class="admin-auth-screen">
      <section class="admin-auth-panel" aria-labelledby="admin-auth-title">
        <div class="admin-auth-brand">
          <span class="admin-brand-mark">${icon('recycling')}</span>
          <span><strong>RUTA CERO</strong><small>CONTROL OPERATIVO</small></span>
        </div>
        <div class="admin-section-kicker">ACCESO RESTRINGIDO</div>
        <h1 id="admin-auth-title">Administración</h1>
        <p class="admin-auth-description">Inicia sesión con la cuenta autorizada para consultar los reportes.</p>
        <form id="admin-login-form" class="admin-auth-form">
          <label for="admin-email">Correo electrónico</label>
          <input id="admin-email" name="email" type="email" autocomplete="username" required>
          <label for="admin-password">Contraseña</label>
          <input id="admin-password" name="password" type="password" autocomplete="current-password" required>
          <button class="admin-button admin-button-dark" id="admin-login-submit" type="submit">Iniciar sesión</button>
        </form>
        <p class="admin-auth-message" id="admin-auth-message" role="status" aria-live="polite">${escapeHtml(message)}</p>
        ${showSignOut ? '<button class="admin-auth-signout" id="admin-auth-signout" type="button">Cerrar sesión actual</button>' : ''}
        <a class="admin-auth-back" href="/?mode=field">Volver a operaciones de campo</a>
      </section>
    </main>
  `;
}

/**
 * @param onSignIn  called after a successful sign-in
 * @param onSignOut called by "Cerrar sesión actual" (shown for accounts without admin access)
 */
export function attachAdminLogin(container, { signIn, onSignIn, signOut, onSignOut }) {
  const form = container.querySelector('#admin-login-form');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    const button = container.querySelector('#admin-login-submit');
    const message = container.querySelector('#admin-auth-message');
    button.disabled = true;
    message.textContent = 'Verificando acceso…';

    try {
      await signIn(email, password);
      await onSignIn();
    } catch (error) {
      message.textContent = error.message;
      button.disabled = false;
    }
  });

  container.querySelector('#admin-auth-signout')?.addEventListener('click', async () => {
    try {
      await signOut();
      onSignOut();
    } catch (error) {
      const message = container.querySelector('#admin-auth-message');
      if (message) message.textContent = error.message;
    }
  });
}
