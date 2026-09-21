/**
 * Pantalla 5: Escaneo de Código de Barras - Contenedor
 * Origen: Stitch Screen 07 (screen_7_aeeba493c04346d494f074a401d31d94)
 */

import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

export function renderQRScannerScreen(state) {
  const currentContainer = state.stops.find(s => s.id === state.activeContainerId) || state.stops[0];

  return `
    <div class="screen-header-bar">
      <div class="screen-header-title">
        <span class="material-symbols-outlined" style="color: var(--color-primary);">barcode_reader</span>
        <span>ESCANEAR CÓDIGO QR</span>
      </div>
      <button type="button" class="btn-tactical btn-tactical-sm" id="btn-scanner-cancel">
        CANCELAR
      </button>
    </div>

    <div style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
      <!-- Camera Viewport with Tactical Reticle -->
      <div class="qr-scanner-viewport barcode-scanner-viewport" id="barcode-scan-area" role="button" tabindex="0" aria-label="Abrir cámara para escanear código QR">
        <video id="barcode-camera" class="barcode-camera" autoplay muted playsinline></video>
        <div id="barcode-camera-placeholder" class="barcode-camera-placeholder">
          <span class="material-symbols-outlined">photo_camera</span>
          <span>PULSA PARA ABRIR LA CÁMARA</span>
        </div>
        <!-- Laser Scan Line -->
        <div class="qr-laser-beam" id="barcode-laser"></div>

        <!-- Viewport Top Overlay -->
        <div style="position: absolute; top: 12px; left: 14px; right: 14px; display: flex; justify-content: space-between; align-items: center;">
          <div style="background: rgba(15, 23, 42, 0.85); color: #00a86b; padding: 4px 8px; border: 1px solid #00a86b; font-family: var(--font-mono); font-size: 11px;">
            CÁMARA ACTIVA
          </div>
          <button type="button" class="btn-tactical btn-tactical-sm" id="btn-toggle-flashlight" style="background: rgba(15, 23, 42, 0.85); color: #ffffff; width: 40px; height: 40px; padding: 0;" title="Linterna">
            <span class="material-symbols-outlined" style="font-size: 20px;">flashlight_on</span>
          </button>
          <button type="button" class="btn-tactical btn-tactical-sm" id="btn-close-camera" style="background: rgba(225, 29, 72, 0.9); color: #ffffff; width: 40px; height: 40px; padding: 0; display: none;" title="Cerrar cámara">
            <span class="material-symbols-outlined" style="font-size: 20px;">videocam_off</span>
          </button>
        </div>

        <!-- Viewport Bottom Message -->
        <div style="position: absolute; bottom: 12px; text-align: center; color: #cbd5e1; font-family: var(--font-headline); font-size: 13px; letter-spacing: 0.05em;">
          APUNTE LA CÁMARA AL CÓDIGO QR DEL CONTENEDOR
        </div>
      </div>

      <div class="card-tactical card-tactical-accent" style="padding: 14px; display: flex; flex-direction: column; gap: 8px;">
        <label class="font-label-sm" for="barcode-input" style="color: #0f172a;">CÓDIGO LEÍDO / ENTRADA DEL LECTOR</label>
        <div style="display: flex; gap: 8px;">
          <input id="barcode-input" type="text" autocomplete="off" inputmode="text" placeholder="Ej. CONT-01" aria-describedby="barcode-status" style="flex: 1; min-width: 0; padding: 12px; border: 2px solid #0f172a; font: inherit; color: #0f172a; text-transform: uppercase;">
          <button type="button" class="btn-tactical btn-tactical-primary" id="btn-validate-barcode" title="Validar código">
            <span class="material-symbols-outlined">search</span>
          </button>
        </div>
        <p id="barcode-status" class="font-body-sm" style="color: #64748b; font-size: 13px; margin: 0;" aria-live="polite">
          Se solicitará permiso para usar la cámara. El reporte se abrirá cuando el código coincida con un contenedor.
        </p>
      </div>

      <!-- Manual ID Fallback Modal Trigger -->
      <div class="card-tactical" style="padding: 12px 14px;">
        <span class="font-label-sm" style="color: #475569; display: block; margin-bottom: 6px;">
          PRUEBA RÁPIDA O ENTRADA MANUAL
        </span>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${state.stops.slice(0, 5).map(s => `
            <button 
              type="button" 
              class="btn-tactical btn-tactical-sm btn-quick-select-container ${s.id === currentContainer.id ? 'active' : ''}" 
              data-id="${s.id}"
              style="padding: 4px 10px; font-size: 12px;"
            >
              ${s.id} (${s.code})
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

export function attachQRScannerEvents(container, store) {
  const video = container.querySelector('#barcode-camera');
  const scanArea = container.querySelector('#barcode-scan-area');
  const cameraPlaceholder = container.querySelector('#barcode-camera-placeholder');
  const laser = container.querySelector('#barcode-laser');
  const closeCameraButton = container.querySelector('#btn-close-camera');
  const barcodeInput = container.querySelector('#barcode-input');
  const barcodeStatus = container.querySelector('#barcode-status');
  let cameraControls = null;
  let cameraStarting = false;
  let cameraStopRequested = false;
  let flashlightOn = false;
  let barcodeValidated = false;

  const setStatus = (message, color = '#64748b') => {
    if (barcodeStatus) {
      barcodeStatus.textContent = message;
      barcodeStatus.style.color = color;
    }
  };

  const stopCamera = () => {
    cameraStopRequested = true;
    cameraControls?.stop();
    cameraControls = null;
    const stream = video?.srcObject;
    stream?.getTracks().forEach(track => track.stop());
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    scanArea?.classList.remove('camera-active');
    if (cameraPlaceholder) cameraPlaceholder.style.display = 'flex';
    if (laser) laser.style.display = 'none';
    if (closeCameraButton) closeCameraButton.style.display = 'none';
    flashlightOn = false;
    cameraStarting = false;
  };

  const showCameraActive = () => {
    scanArea?.classList.add('camera-active');
    if (cameraPlaceholder) cameraPlaceholder.style.display = 'none';
    if (laser) laser.style.display = 'block';
    if (closeCameraButton) closeCameraButton.style.display = 'block';
  };

  container.querySelector('#btn-scanner-cancel')?.addEventListener('click', () => {
    stopCamera();
    store.setScreen('map');
  });

  closeCameraButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    stopCamera();
    setStatus('Cámara cerrada. Pulsa el visor para volver a abrirla.');
  });

  container.querySelector('#btn-toggle-flashlight')?.addEventListener('click', (e) => {
    flashlightOn = !flashlightOn;
    e.currentTarget.style.backgroundColor = flashlightOn ? '#00a86b' : 'rgba(15, 23, 42, 0.85)';
    const track = video?.srcObject?.getVideoTracks()[0];
    const capabilities = track?.getCapabilities?.();
    if (track && capabilities?.torch) {
      track.applyConstraints({ advanced: [{ torch: flashlightOn }] });
    } else {
      store.showToast('La cámara no permite controlar la linterna', 'info');
    }
  });

  const validateBarcode = (value = barcodeInput?.value) => {
    if (barcodeValidated) return;

    const scannedValue = String(value || '').trim().toUpperCase();
    const matchedContainer = store.state.stops.find(stop => stop.id.toUpperCase() === scannedValue);

    if (!matchedContainer) {
      if (barcodeStatus) {
        barcodeStatus.textContent = scannedValue
          ? `Código detectado: ${scannedValue}. No coincide con ningún ID de contenedor.`
          : 'No se recibió ningún código. Intenta acercar y enfocar la etiqueta.';
        barcodeStatus.style.color = '#e11d48';
      }
      store.showToast(scannedValue ? 'Código detectado, pero no corresponde a un contenedor' : 'No se pudo leer el código', 'info');
      barcodeInput?.focus();
      return;
    }

    barcodeValidated = true;
    stopCamera();
    store.selectContainer(matchedContainer.id);
    store.setScreen('report', 'slide-left');
  };

  container.querySelector('#btn-validate-barcode')?.addEventListener('click', validateBarcode);
  barcodeInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      validateBarcode();
    }
  });
  barcodeInput?.focus();

  const barcodeFormats = [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.CODABAR,
    BarcodeFormat.EAN_8,
    BarcodeFormat.EAN_13,
    BarcodeFormat.ITF,
    BarcodeFormat.RSS_14,
    BarcodeFormat.RSS_EXPANDED,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E
  ];
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, barcodeFormats);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const startCamera = async () => {
    if (cameraStarting || cameraControls) return;

    if (!video || !navigator.mediaDevices?.getUserMedia) {
      const isLocalFile = window.location.protocol === 'file:';
      const message = isLocalFile
        ? 'Abre la aplicación con npm run dev; la cámara no funciona abriendo index.html directamente.'
        : 'El navegador bloquea la cámara en esta conexión. Usa http://localhost:5173 o HTTPS.';
      setStatus(message, '#d97706');
      return;
    }

    cameraStarting = true;
    cameraStopRequested = false;
    setStatus('Solicitando acceso a la cámara...');
    try {
      const codeReader = new BrowserMultiFormatReader(hints);
      cameraControls = await codeReader.decodeFromVideoDevice(undefined, video, (result) => {
        if (!result) {
          return;
        }

        barcodeInput.value = result.getText();
        setStatus(`Código leído: ${result.getText()}`);
        validateBarcode(result.getText());
      });
      if (cameraStopRequested) {
        stopCamera();
        return;
      }
      showCameraActive();
      setStatus('Cámara activa. Centra el código de barras en el visor.');
    } catch (error) {
      stopCamera();
      const errorMessage = error?.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Actívalo en los permisos del navegador y recarga la pantalla.'
        : error?.name === 'NotFoundError'
          ? 'No se encontró una cámara disponible en este dispositivo.'
          : 'No se pudo abrir la cámara. Cierra otras aplicaciones que la estén usando o introduce el código manualmente.';
      setStatus(errorMessage, '#d97706');
    }
  };

  scanArea?.addEventListener('click', (event) => {
    if (event.target.closest('#btn-toggle-flashlight, #btn-close-camera')) return;
    if (!cameraControls) startCamera();
  });
  scanArea?.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && !cameraControls) {
      event.preventDefault();
      startCamera();
    }
  });

  container.querySelectorAll('.btn-quick-select-container').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (id) {
        store.selectContainer(id);
        store.showToast(`Contenedor seleccionado: ${id}`);
      }
    });
  });

  startCamera();

  window.addEventListener('pagehide', stopCamera, { once: true });
}
