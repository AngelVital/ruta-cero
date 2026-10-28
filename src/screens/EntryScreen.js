import { escapeHtml, icon } from '../utils/html.js';

export function renderEntryScreen(message = '') {
  return `
    <main class="entry-screen">
      <aside class="entry-brand-band" aria-label="Ruta Cero">
        <a class="entry-brand" href="/" aria-label="Ruta Cero, inicio">
          <span class="entry-brand-mark"><img src="/logo-light.svg" alt=""></span>        </a>
        <svg class="entry-routes" viewBox="0 0 300 260" aria-hidden="true">
          <path class="entry-route-base" d="M20 60 H120 V140 H280"/>
          <path class="entry-route-base" d="M60 240 V180 H200 V40"/>
          <path class="entry-route-active" d="M20 200 H90 V100 H180 V220 H280"/>
          <path class="entry-route-flow" d="M20 200 H90 V100 H180 V220 H280"/>
          <circle class="entry-route-stop" cx="20" cy="60" r="5"/>
          <circle class="entry-route-stop" cx="280" cy="140" r="5"/>
          <circle class="entry-route-stop" cx="60" cy="240" r="5"/>
          <circle class="entry-route-stop" cx="200" cy="40" r="5"/>
          <circle class="entry-route-stop is-active" cx="20" cy="200" r="6"/>
          <circle class="entry-route-stop is-active" cx="90" cy="100" r="6"/>
          <circle class="entry-route-stop is-active" cx="180" cy="100" r="6"/>
          <circle class="entry-route-end" cx="280" cy="220" r="9"/>
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
