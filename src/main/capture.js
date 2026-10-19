'use strict';
// Screen capture (explicit activation only). Images stay in memory; nothing is written to disk.
const { desktopCapturer, screen, systemPreferences, nativeImage } = require('electron');

const MAX_EDGE = 1440; // keeps image tokens (and Groq rate-limit usage) down while small text stays legible

function permissionStatus() {
  return process.platform === 'darwin' ? systemPreferences.getMediaAccessStatus('screen') : 'granted';
}

/** Capture the display under the cursor (or a given display id) at native pixel resolution. */
async function captureDisplay(displayId) {
  const display = displayId != null
    ? screen.getAllDisplays().find((d) => d.id === displayId) || screen.getPrimaryDisplay()
    : screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const size = { width: Math.round(display.size.width * display.scaleFactor), height: Math.round(display.size.height * display.scaleFactor) };
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: size });
  const src = sources.find((s) => String(s.display_id) === String(display.id)) || sources[0];
  if (!src || src.thumbnail.isEmpty()) throw new Error('Screen capture returned no image. Check Screen Recording permission.');
  return { display: { id: display.id, ...display.bounds, scaleFactor: display.scaleFactor }, image: src.thumbnail };
}

function toJpegDataUrl(image, quality = 80) {
  const { width, height } = image.getSize();
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const img = scale < 1 ? image.resize({ width: Math.round(width * scale), height: Math.round(height * scale), quality: 'best' }) : image;
  return `data:image/jpeg;base64,${img.toJPEG(quality).toString('base64')}`;
}

function dataUrlToImage(url) { return nativeImage.createFromDataURL(url); }

module.exports = { captureDisplay, toJpegDataUrl, dataUrlToImage, permissionStatus, MAX_EDGE };
