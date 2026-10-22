const FONT_FILE = 'Roboto-Regular.ttf';
const FONT_URL = '/fonts/Roboto-Regular.ttf';
const FONT_NAME = 'Roboto';

let fontBase64 = null;

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function registerPdfUnicodeFont(doc) {
  if (!fontBase64) {
    const response = await fetch(FONT_URL);
    if (!response.ok) throw new Error('Không tải được font PDF.');
    fontBase64 = bufferToBase64(await response.arrayBuffer());
  }
  const fonts = doc.getFontList?.() || {};
  if (!fonts[FONT_NAME]) {
    doc.addFileToVFS(FONT_FILE, fontBase64);
    doc.addFont(FONT_FILE, FONT_NAME, 'normal');
  }
  doc.setFont(FONT_NAME, 'normal');
  return FONT_NAME;
}
