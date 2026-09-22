/**
 * Pantalla 5: Escaneo de Código de Barras - Contenedor
 */

import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

export function renderQRScannerScreen(state) {
  const selectableContainers = state.stops.filter(stop => stop.status !== 'completed');

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
          <div id="barcode-countdown" style="background: rgba(15, 23, 42, 0.85); color: #ffffff; padding: 4px 8px; border: 1px solid #ffffff; font-family: var(--font-mono); font-size: 11px; display: none;">
            LECTURA AUTOMÁTICA: 10 s
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

      <div id="manual-selection-fallback" class="card-tactical" style="padding: 12px 14px; display: none;">
        <span class="font-label-sm" style="color: #475569; display: block; margin-bottom: 6px;">
          LECTURA AUTOMÁTICA NO COMPLETADA
        </span>
        <button type="button" class="btn-tactical btn-tactical-sm" id="btn-show-pending-containers">
          <span class="material-symbols-outlined">format_list_bulleted</span>
          ELEGIR CONTENEDOR MANUALMENTE
        </button>
        <div id="pending-containers-list" style="display: none; gap: 8px; flex-direction: column; margin-top: 10px;">
          ${selectableContainers.length ? selectableContainers.map(stop => `
            <button type="button" class="btn-tactical btn-tactical-sm btn-pending-container" data-id="${stop.id}" style="justify-content: space-between; padding: 8px 10px; font-size: 12px;">
              <span>${stop.id}</span>
              <span>${stop.code}</span>
            </button>
          `).join('') : '<span class="font-body-sm">No hay contenedores pendientes.</span>'}
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
  const countdown = container.querySelector('#barcode-countdown');
  const manualSelectionFallback = container.querySelector('#manual-selection-fallback');
  const showPendingContainersButton = container.querySelector('#btn-show-pending-containers');
  const pendingContainersList = container.querySelector('#pending-containers-list');
  let cameraControls = null;
  let cameraStarting = false;
  let cameraStopRequested = false;
  let flashlightOn = false;
  let barcodeValidated = false;
  let countdownTimer = null;
  let countdownTimeout = null;

  const clearCountdown = () => {
    window.clearInterval(countdownTimer);
    window.clearTimeout(countdownTimeout);
    countdownTimer = null;
    countdownTimeout = null;
  };

  const startCountdown = () => {
    clearCountdown();
    let secondsRemaining = 10;
    if (countdown) countdown.textContent = `LECTURA AUTOMÁTICA: ${secondsRemaining} s`;
    countdownTimer = window.setInterval(() => {
      secondsRemaining -= 1;
      if (countdown) countdown.textContent = `LECTURA AUTOMÁTICA: ${secondsRemaining} s`;
    }, 1000);
    countdownTimeout = window.setTimeout(() => {
      clearCountdown();
      if (countdown) countdown.textContent = 'LECTURA AUTOMÁTICA AGOTADA';
      if (manualSelectionFallback) manualSelectionFallback.style.display = 'block';
    }, 10000);
  };

  const stopCamera = () => {
    clearCountdown();
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
    if (countdown) countdown.style.display = 'none';
    flashlightOn = false;
    cameraStarting = false;
  };

  const showCameraActive = () => {
    scanArea?.classList.add('camera-active');
    if (cameraPlaceholder) cameraPlaceholder.style.display = 'none';
    if (laser) laser.style.display = 'block';
    if (closeCameraButton) closeCameraButton.style.display = 'block';
    if (countdown) countdown.style.display = 'block';
  };

  container.querySelector('#btn-scanner-cancel')?.addEventListener('click', () => {
    stopCamera();
    store.setScreen('map');
  });

  closeCameraButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    stopCamera();
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

  const validateBarcode = (value = '') => {
    if (barcodeValidated) return;

    const scannedValue = String(value || '').trim().toUpperCase();
    const matchedContainer = store.state.stops.find(stop => stop.id.toUpperCase() === scannedValue);

    if (!matchedContainer) {
      store.showToast(scannedValue ? 'Código detectado, pero no corresponde a un contenedor' : 'No se pudo leer el código', 'info');
      return;
    }

    barcodeValidated = true;
    stopCamera();
    store.selectContainer(matchedContainer.id);
    store.setScreen('report', 'slide-left');
  };

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
      return;
    }

    cameraStarting = true;
    cameraStopRequested = false;
    if (manualSelectionFallback) manualSelectionFallback.style.display = 'none';
    if (pendingContainersList) pendingContainersList.style.display = 'none';
    if (showPendingContainersButton) showPendingContainersButton.style.display = 'inline-flex';
    try {
      const codeReader = new BrowserMultiFormatReader(hints);
      cameraControls = await codeReader.decodeFromVideoDevice(undefined, video, (result) => {
        if (!result) {
          return;
        }

        validateBarcode(result.getText());
      });
      if (cameraStopRequested) {
        stopCamera();
        return;
      }
      showCameraActive();
      startCountdown();
    } catch {
      stopCamera();
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

  showPendingContainersButton?.addEventListener('click', () => {
    if (pendingContainersList) pendingContainersList.style.display = 'flex';
    showPendingContainersButton.style.display = 'none';
  });

  container.querySelectorAll('.btn-pending-container').forEach(btn => {
    btn.addEventListener('click', (event) => {
      const id = event.currentTarget.getAttribute('data-id');
      if (!id) return;
      barcodeValidated = true;
      stopCamera();
      store.selectContainer(id);
      store.setScreen('report', 'slide-left');
    });
  });

  startCamera();

  window.addEventListener('pagehide', stopCamera, { once: true });
}
