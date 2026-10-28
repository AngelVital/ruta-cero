import { escapeHtml, icon } from '../utils/html.js';

export function renderEntryScreen(message = '') {
  return `
    <main class="entry-screen">
      <aside class="entry-brand-band" aria-label="Ruta Cero">
        <a class="entry-brand" href="/" aria-label="Ruta Cero, inicio">
          <span class="entry-brand-mark"><img src="/logo-light.svg" alt=""></span>        </a>
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
