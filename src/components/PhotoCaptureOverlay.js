function stopStream(video) {
  video?.srcObject?.getTracks().forEach((track) => track.stop());
  if (video) {
    video.pause();
    video.srcObject = null;
  }
}

export async function openPhotoCapture(onCaptured, onError) {
  const existingOverlay = document.querySelector('.photo-capture-overlay');
  if (existingOverlay) {
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    onError?.('La cámara no está disponible en este dispositivo');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'photo-capture-overlay';
  overlay.innerHTML = `
    <div class="photo-capture-header">
      <span class="font-label-md">CAPTURAR EVIDENCIA</span>
      <button type="button" class="btn-tactical btn-tactical-sm photo-capture-close" aria-label="Cerrar cámara" title="Cerrar cámara">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
    <div class="photo-capture-stage">
      <video class="photo-capture-video" autoplay muted playsinline></video>
      <div class="photo-capture-guide" aria-hidden="true"></div>
      <p class="photo-capture-message">ENCUADRA LA EVIDENCIA Y PULSA EL BOTÓN</p>
    </div>
    <div class="photo-capture-controls">
      <button type="button" class="photo-capture-shutter" aria-label="Tomar foto" title="Tomar foto">
        <span class="material-symbols-outlined">photo_camera</span>
      </button>
    </div>
  `;
  document.body.appendChild(overlay);

  const video = overlay.querySelector('.photo-capture-video');
  const closeButton = overlay.querySelector('.photo-capture-close');
  const shutterButton = overlay.querySelector('.photo-capture-shutter');
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    stopStream(video);
    overlay.remove();
  };

  closeButton.addEventListener('click', close);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
    if (closed) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    video.srcObject = stream;
    await video.play();
  } catch (error) {
    close();
    onError?.('No se pudo abrir la cámara');
    return;
  }

  shutterButton.addEventListener('click', () => {
    if (closed || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    const frame = document.createElement('canvas');
    frame.width = video.videoWidth;
    frame.height = video.videoHeight;
    frame.getContext('2d')?.drawImage(video, 0, 0, frame.width, frame.height);
    close();
    onCaptured?.();
  });
}