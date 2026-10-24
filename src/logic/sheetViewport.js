/** Keep the grid filling its frame. Zoom changes cell size, not the frame. */
export function fitSheetViewport(hot, scale) {
  const host = hot?.rootElement?.parentElement;
  if (!hot || !host) return;
  if (host.clientHeight < 32 || host.clientWidth < 32) return;
  const safe = Number(scale) > 0 ? Number(scale) : 1;
  const height = Math.max(280, Math.floor(host.clientHeight / safe));
  const width = Math.max(480, Math.floor(host.clientWidth / safe));
  hot.rootElement.style.zoom = safe === 1 ? '' : String(safe);
  const current = hot.getSettings();
  if (current.height !== height || current.width !== width) {
    hot.updateSettings({ height, width });
  }
}

export function revealSheet(hot, scale) {
  const host = hot?.rootElement?.parentElement;
  if (!hot?.rootElement?.isConnected || !host) return;
  if (host.clientHeight < 32 || host.clientWidth < 32) return;
  const safe = Number(scale) > 0 ? Number(scale) : 1;
  const height = Math.max(280, Math.floor(host.clientHeight / safe));
  const width = Math.max(480, Math.floor(host.clientWidth / safe));
  const current = hot.getSettings();
  if (current.height === height && current.width === width) return;
  fitSheetViewport(hot, safe);
}

export function watchSheetViewport(hot, getScale) {
  const host = hot?.rootElement?.parentElement;
  if (!host) return () => {};
  const fit = () => fitSheetViewport(hot, getScale());
  fit();
  const observer = new ResizeObserver(fit);
  observer.observe(host);
  return () => observer.disconnect();
}
