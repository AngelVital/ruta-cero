/**
 * Pantalla 5: Escaneo de Código de Barras - Contenedor
 */

// ZXing is large, so it is downloaded only when the scanner opens the camera.
let barcodeReaderPromise = null;

function loadBarcodeReader() {
  barcodeReaderPromise ??= Promise.all([
    import('@zxing/browser'),
    import('@zxing/library')
  ]).then(([{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }]) => {
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
    return () => new BrowserMultiFormatReader(hints);
  }).catch((error) => {
    barcodeReaderPromise = null;
    throw error;
  });
  return barcodeReaderPromise;
}

export function renderQRScannerScreen(state) {
  const selectableContainers = state.stops.filter(stop => stop.status === 'active');

  return `
    <div class="screen-header-bar">
      <div class="screen-header-title">
        <span class="material-symbols-outlined">barcode_reader</span>
        <span>ESCANEAR CÓDIGO QR</span>
      </div>
      <button type="button" class="btn-tactical btn-tactical-sm" id="btn-scanner-cancel">
        CANCELAR
      </button>
    </div>

    <div class="screen-body">
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
        <div class="scanner-overlay-top">
          <div class="scanner-chip scanner-chip-active">
            CÁMARA ACTIVA
          </div>
          <div id="barcode-countdown" class="scanner-chip scanner-chip-countdown" hidden>
            LECTURA AUTOMÁTICA: 10 s
          </div>
          <button type="button" class="btn-tactical btn-tactical-sm scanner-icon-btn" id="btn-toggle-flashlight" title="Linterna">
            <span class="material-symbols-outlined icon-20">flashlight_on</span>
          </button>
          <button type="button" class="btn-tactical btn-tactical-sm scanner-icon-btn scanner-close" id="btn-close-camera" title="Cerrar cámara" hidden>
            <span class="material-symbols-outlined icon-20">videocam_off</span>
          </button>
        </div>

        <!-- Viewport Bottom Message -->
        <div class="scanner-hint">
          APUNTE LA CÁMARA AL CÓDIGO QR DEL CONTENEDOR
        </div>
      </div>

      <div id="manual-selection-fallback" class="card-tactical card-compact" hidden>
        <span class="font-label-sm text-soft scanner-fallback-label">
          LECTURA AUTOMÁTICA NO COMPLETADA
        </span>
        <button type="button" class="btn-tactical btn-tactical-sm" id="btn-show-pending-containers">
          <span class="material-symbols-outlined">format_list_bulleted</span>
          ELEGIR CONTENEDOR MANUALMENTE
        </button>
        <div id="pending-containers-list" class="scanner-pending-list" hidden>
          ${selectableContainers.length ? selectableContainers.map(stop => `
            <button type="button" class="btn-tactical btn-tactical-sm btn-pending-container scanner-pending-btn" data-id="${stop.id}">
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
      if (manualSelectionFallback) manualSelectionFallback.hidden = false;
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
    if (cameraPlaceholder) cameraPlaceholder.hidden = false;
    if (laser) laser.hidden = true;
    if (closeCameraButton) closeCameraButton.hidden = true;
    if (countdown) countdown.hidden = true;
    flashlightOn = false;
    cameraStarting = false;
  };

  const showCameraActive = () => {
    scanArea?.classList.add('camera-active');
    if (cameraPlaceholder) cameraPlaceholder.hidden = true;
    if (laser) laser.hidden = false;
    if (closeCameraButton) closeCameraButton.hidden = false;
    if (countdown) countdown.hidden = false;
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
    e.currentTarget.classList.toggle('is-on', flashlightOn);
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

    barcodeValidated = true;
    stopCamera();

    const scannedValue = String(value || '').trim().toUpperCase();
    const matchedContainer = store.state.stops.find(stop => stop.id.toUpperCase() === scannedValue);

    if (!matchedContainer) {
      store.showToast(scannedValue ? 'Código detectado, pero no corresponde a un contenedor' : 'No se pudo leer el código', 'info');
      return;
    }

    if (matchedContainer.status !== 'active' || matchedContainer.id !== store.state.activeContainerId) {
      store.showToast(
        matchedContainer.status === 'completed'
          ? `El contenedor ${matchedContainer.id} ya está registrado`
          : `El código no corresponde al contenedor activo (${store.state.activeContainerId})`,
        'info'
      );
      return;
    }

    store.selectContainer(matchedContainer.id, false);
    store.setScreen('report', 'slide-left');
  };

  const startCamera = async () => {
    if (cameraStarting || cameraControls) return;

    if (!video || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    cameraStarting = true;
    cameraStopRequested = false;
    barcodeValidated = false;
    if (manualSelectionFallback) manualSelectionFallback.hidden = true;
    if (pendingContainersList) pendingContainersList.hidden = true;
    if (showPendingContainersButton) showPendingContainersButton.hidden = false;
    try {
      const createReader = await loadBarcodeReader();
      if (cameraStopRequested) {
        stopCamera();
        return;
      }
      const codeReader = createReader();
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
    if (pendingContainersList) pendingContainersList.hidden = false;
    showPendingContainersButton.hidden = true;
  });

  container.querySelectorAll('.btn-pending-container').forEach(btn => {
    btn.addEventListener('click', (event) => {
      const id = event.currentTarget.getAttribute('data-id');
      if (!id) return;
      const selectedContainer = store.state.stops.find(stop => stop.id === id);
      if (selectedContainer?.status !== 'active') {
        store.showToast('Solo puedes reportar el contenedor activo', 'info');
        return;
      }
      barcodeValidated = true;
      stopCamera();
      store.selectContainer(id, false);
      store.setScreen('report', 'slide-left');
    });
  });

  startCamera();

  window.addEventListener('pagehide', stopCamera, { once: true });

  return () => {
    window.removeEventListener('pagehide', stopCamera);
    stopCamera();
  };
}
