import { escapeHtml, icon } from '../utils/html.js';

export function renderEntryScreen(message = '') {
  return `
    <main class="entry-screen">
      <aside class="entry-brand-band" aria-label="Ruta Cero">
        <a class="entry-brand" href="/" aria-label="Ruta Cero, inicio">
          <span class="entry-brand-mark"><img src="/logo-light.svg" alt=""></span>        </a>
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
          <p class="entry-subtitle">Entra con tu cuenta; el sistema abre el panel de campo o de administración según tu perfil.</p>

          <form id="entry-login-form" class="entry-login-form">
            <label for="entry-email">Correo electrónico</label>
            <input id="entry-email" name="email" type="email" autocomplete="username" required>
            <label for="entry-password">Contraseña</label>
            <input id="entry-password" name="password" type="password" autocomplete="current-password" required>
            <button class="entry-login-submit" id="entry-login-submit" type="submit"><span>Iniciar sesión</span>${icon('arrow_forward')}</button>
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
}
