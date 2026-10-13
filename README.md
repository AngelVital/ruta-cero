# Ruta Cero

Plataforma operativa para coordinar las rutas urbanas de recolección de residuos de Ruta Cero. Incluye una aplicación móvil de campo para preparar unidades, recorrer rutas y registrar recolecciones, además de un panel de administración para configurar recorridos y consultar reportes.

## Arquitectura

- **Frontend:** JavaScript vanilla con módulos ES.
- **Build y servidor local:** Vite 6.
- **Entrada:** `index.html` carga `src/main.js`.
- **Renderizado:** `main.js` funciona como shell y router modular. Selecciona la pantalla activa, monta sus eventos y re-renderiza cuando cambia el estado.
- **Estado:** `src/state/store.js` contiene un store reactivo en memoria para la operación actual. La configuración de rutas se comparte mediante `public.route_configurations` en Supabase y se mantiene en caché local.
- **UI:**
  - `src/components/`: encabezado, navegación, simulador de dispositivo, medidores y controles.
  - `src/screens/`: vistas operativas y sus manejadores de interacción.
  - `src/styles/`: tokens, estilos generales y componentes de interfaz.
- **Diseño:** el sistema visual Field-Spec está documentado en `design-system/DESIGN_SYSTEM.md`, con tokens reutilizables en `design-system/` y `src/styles/`.

## Flujo de campo

Abre `/?mode=field` o elige **Campo** en la pantalla inicial. El flujo sigue la ruta seleccionada por administración:

1. **Preparar la salida:** en Despacho se eligen unidad, operador, auxiliar y ruta. Antes de iniciar, registra el nivel de combustible y completa la inspección 360°.
2. **Registrar combustible:** selecciona uno de los niveles predefinidos y guarda el registro para volver a Despacho.
3. **Completar inspección:** revisa los nueve puntos del vehículo como Bien, Regular o Mal. Los estados Regular y Mal requieren comentario; también se debe capturar la evidencia fotográfica del odómetro. Al completar todo, confirma la inspección.
4. **Iniciar y recorrer:** inicia la ruta desde Despacho. El mapa muestra el punto activo, el avance y los puntos programados; ofrece abrir indicaciones en Google Maps.
5. **Identificar el contenedor:** escanea el código QR o código de barras del punto activo. Si la cámara no logra leerlo, se puede elegir manualmente el mismo punto activo. Los códigos de otros puntos no permiten avanzar.
6. **Registrar la recolección:** toma fotos iniciales y finales del exterior e interior, indica el nivel de llenado y registra materiales, peso por material e incidencias. Para nivel medio o lleno se requiere al menos un material con peso mayor que cero; para nivel bajo no hace falta registrar material.
7. **Guardar y continuar:** guarda el reporte. El punto queda completado y el mapa activa el siguiente; al completar todos los contenedores de cualquier ruta, se agrega la estación de regreso y se muestran sus indicaciones en el mapa.
8. **Finalizar la ruta:** al llegar a la estación, captura la evidencia fotográfica de regreso y confirma el cierre para volver a Despacho.

El avance operativo de campo vive en el store en memoria del dispositivo. Los reportes se insertan en Supabase cuando está configurado; si no lo está, quedan registrados solo durante la sesión local. La evidencia fotográfica de cierre se conserva en el estado de la sesión.

## Flujo de administración

Abre `/?mode=admin` o elige **Administración** en la pantalla inicial. Se requiere iniciar sesión con una cuenta de Supabase registrada en `public.admin_users`; una cuenta autenticada sin ese permiso no puede abrir el panel.

1. **Consultar operación:** el resumen muestra reportes de contenedores y cobertura de puntos. Se puede actualizar la consulta, abrir el detalle de cada reporte y revisar su llenado, peso, materiales, incidencias y evidencia registrada.
2. **Configurar rutas:** crea una ruta con nombre o zona y uno o más puntos, o edita/elimina una ruta existente. La tabla permite buscar por ruta, zona o punto, filtrar por estado y exportar las rutas a CSV.
3. **Programar rutas:** crea o edita una ruta y elige su **Fecha de operación**. Puedes programarla para hoy o para un día futuro; solo se permite una ruta por fecha. La ruta programada para hoy se muestra automáticamente en campo y los cambios se distribuyen mediante Supabase Realtime.
4. **Revisar visitas:** la tabla de puntos usa el reporte más reciente de cada contenedor para mostrar su última visita. Los reportes no se actualizan en vivo: pulsa **Actualizar** para volver a consultarlos.
5. **Cerrar sesión:** usa **Cerrar sesión** en la barra superior para salir del panel.

Las rutas y su fecha programada se almacenan en `public.route_configurations` y también se mantienen en caché local. El campo ya no permite elegir una ruta manualmente: usa la ruta asignada al día operativo de La Paz (`America/Mazatlan`) y no permite iniciar si no existe una. El avance de los reportes aparece en el panel después de actualizar; la sesión de campo no se restaura al recargar la aplicación.

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

En **Rutas configuradas**, crea o edita una ruta, selecciona los contenedores incluidos y define su fecha de operación. Puedes dejar la fecha vacía para guardar la ruta sin programarla. La ruta asignada a hoy aparece automáticamente en despacho y en el mapa de campo; los cambios se distribuyen a los dispositivos conectados mediante Supabase Realtime. Ejecuta de nuevo `supabase/schema.sql` en proyectos existentes para añadir la fecha programada y actualizar la función RPC.

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
│   ├── styles/          # Tokens y estilos de interfaz
│   └── main.js          # Entrada, router y ciclo de renderizado
├── index.html
├── package.json
└── vite.config.js
```

## Diseño visual

Field-Spec prioriza legibilidad en cabina y uso con guantes: tipografías Barlow Condensed y Atkinson Hyperlegible Next, controles táctiles de al menos 48 px, bordes rectos, alto contraste y colores semánticos para plástico, cartón y papel.
