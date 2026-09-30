# Ruta Cero

HUD táctico para la operación de rutas de recolección inteligente de residuos urbanos. La aplicación simula una terminal móvil de cabina para consultar una ruta, realizar verificaciones preoperativas y registrar la recolección de contenedores.

## Arquitectura

- **Frontend:** JavaScript vanilla con módulos ES.
- **Build y servidor local:** Vite 6.
- **Entrada:** `index.html` carga `src/main.js`.
- **Renderizado:** `main.js` funciona como shell y router modular. Selecciona la pantalla activa, monta sus eventos y re-renderiza cuando cambia el estado.
- **Estado:** `src/state/store.js` contiene un store reactivo en memoria con los datos de la unidad, operador, ruta, paradas, combustible, inspección y notificaciones.
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

> El estado se conserva únicamente en memoria del navegador. Al recargar la página, la demostración vuelve a sus datos iniciales.

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
4. Reinicia Vite con `npm run dev` y guarda un reporte desde la pantalla de contenedores. Los registros aparecen en `public.container_reports`.

La clave `anon`/publishable está diseñada para usarse en el cliente; nunca pongas la clave `service_role` en estas variables. El esquema permite inserciones anónimas sin lectura para facilitar pruebas y no debe usarse así en producción. Las fotos se registran actualmente como marcas de tiempo de evidencia, no como archivos de imagen. Sin variables configuradas, la aplicación sigue funcionando en modo local.

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
