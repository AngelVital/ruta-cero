# Ruta Cero

HUD táctico para la operación de rutas de recolección inteligente de residuos urbanos. La aplicación simula una terminal móvil de cabina para consultar una ruta, realizar verificaciones preoperativas y registrar la recolección de contenedores.

## Arquitectura

- **Frontend:** JavaScript vanilla con módulos ES.
- **Build y servidor local:** Vite 6.
- **Entrada:** `index.html` carga `src/main.js`.
- **Renderizado:** `main.js` funciona como shell y router modular. Selecciona la pantalla activa, monta sus eventos y re-renderiza cuando cambia el estado.
- **Estado:** `src/state/store.js` contiene un store reactivo en memoria para la operación actual. La configuración de rutas se comparte mediante `public.route_configurations` en Supabase y se mantiene en caché local.
- **UI:**
  - `src/components/`: encabezado, navegación, simulador de dispositivo, medidores y controles.
  - `src/screens/`: vistas operativas y sus manejadores de interacción.
  - `src/styles/`: tokens, estilos generales y componentes HUD.
- **Diseño:** el sistema Field-Spec HUD está documentado en `design-system/DESIGN_SYSTEM.md`, con tokens reutilizables en `design-system/` y `src/styles/`.

## Pantallas y funcionamiento

La navegación permite cambiar entre estas vistas:

1. **Despacho:** inicio de ruta, unidad, operador, combustible e inspección preoperativa.
2. **Inspección 360°:** revisión de nueve puntos del vehículo y comentarios.
3. **Registro de combustible:** litros cargados, preset de carga y odómetro.
4. **Mapa de ruta:** seguimiento de las paradas y el avance de la ruta R-04.
5. **Escáner de código de barras:** usa la cámara para identificar contenedores por su ID.
6. **Reporte de contenedor:** nivel de llenado, materiales y kilos recolectados.

Las acciones actualizan el store central y provocan el re-render de la interfaz. Al completar un reporte, la parada se marca como completada y se activa automáticamente la siguiente parada pendiente.

> El avance operativo de la sesión se conserva en memoria. Las rutas creadas, sus puntos y la ruta asignada al campo se guardan en Supabase.

## Requisitos

- Node.js 18 o superior
- npm

## Instalación y ejecución

```bash
npm install
npm run dev
```

Vite iniciará el servidor en `http://localhost:5173`. La configuración permite acceder desde otros dispositivos de la red local.

> Para usar la cámara, abre la aplicación en `http://localhost:5173` en el mismo equipo. En un teléfono u otro equipo de la red, usa HTTPS; los navegadores bloquean la cámara en conexiones HTTP normales por IP y al abrir `index.html` directamente.

## Supabase para pruebas

1. Crea un proyecto en el plan gratuito de Supabase.
2. En el SQL Editor del proyecto, ejecuta el contenido de `supabase/schema.sql`.
3. Copia `.env.example` como `.env.local` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores del proyecto.
4. En **Authentication → Users**, crea una cuenta para el administrador y confirma el correo si el proyecto lo requiere.
5. En el SQL Editor, registra esa cuenta como administradora. Reemplaza el correo por el de la cuenta:

  ```sql
  insert into public.admin_users (user_id)
  select id from auth.users where email = 'admin@tu-dominio.com'
  on conflict (user_id) do nothing;
  ```

6. Reinicia Vite con `npm run dev`. Abre `http://localhost:5173/?mode=admin` e inicia sesión con esa cuenta. El panel carga los últimos 200 reportes de `public.container_reports`.

En **Rutas configuradas**, crea o edita rutas, selecciona los contenedores incluidos y pulsa **Usar en campo**. El recorrido seleccionado se muestra en despacho y en el mapa de campo; los cambios se distribuyen a los dispositivos conectados mediante Supabase Realtime. La tabla `public.route_configurations` y la función RPC que la actualiza se crean al ejecutar `supabase/schema.sql`.

La clave `anon`/publishable está diseñada para usarse en el cliente; nunca pongas la clave `service_role` en estas variables. Los reportes solo se pueden leer con una sesión cuya cuenta esté registrada en `admin_users`; la inserción de reportes anónimos sigue habilitada para pruebas. Las fotos se registran actualmente como datos de evidencia, no como archivos de imagen. Sin variables configuradas, la aplicación sigue funcionando en modo local.

## Despliegue en Vercel

En el proyecto de Vercel, abre **Settings → Environment Variables** y define `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores de **Project URL** y la clave publishable/anon del proyecto correcto de Supabase. Añádelas para cada entorno que uses (Production, Preview o Development) y vuelve a desplegar: Vite incorpora estas variables durante la compilación. No uses la clave `service_role` en el frontend.

Antes de guardar reportes, ejecuta `supabase/schema.sql` en el SQL Editor de ese mismo proyecto de Supabase. Si el guardado falla, el aviso de la aplicación muestra el código o mensaje devuelto por Supabase para distinguir errores de tabla, permisos y conexión.

## Comandos disponibles

```bash
npm run dev      # Servidor de desarrollo con recarga en caliente
npm run build    # Genera la versión optimizada en dist/
npm run preview  # Sirve localmente la compilación de producción
```

Para probar la compilación de producción:

```bash
npm run build
npm run preview
```

## Estructura principal

```text
.
├── design-system/       # Documentación y tokens del sistema visual
├── public/              # Assets públicos y capturas
├── src/
│   ├── components/      # Componentes reutilizables
│   ├── screens/         # Pantallas operativas
│   ├── state/           # Store reactivo central
│   ├── styles/          # Tokens y estilos HUD
│   └── main.js          # Entrada, router y ciclo de renderizado
├── index.html
├── package.json
└── vite.config.js
```

## Diseño visual

Field-Spec HUD prioriza legibilidad en cabina y uso con guantes: tipografías Barlow Condensed y Atkinson Hyperlegible Next, controles táctiles de al menos 48 px, bordes rectos, alto contraste y colores semánticos para plástico, cartón y papel.
