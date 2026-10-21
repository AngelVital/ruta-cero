/** Field form photos: thumbnails with a remove button and the capture size used by the forms. */

// Compressed so a few photos fit in the offline queue (localStorage) and in Supabase rows.
export const fieldPhotoOptions = { maxSize: 1024, quality: 0.6 };

export function renderPhotoThumbnails(photos) {
  return `
    <div class="field-photo-thumbs">
      ${photos.map((photo, index) => `
        <div class="field-photo-thumb">
          <img src="${photo}" alt="Foto ${index + 1}">
          <button type="button" class="field-photo-remove" data-photo-index="${index}" aria-label="Quitar foto ${index + 1}">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      `).join('')}
    </div>
  `;
}
