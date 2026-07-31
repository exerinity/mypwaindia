export const THEME_PANEL_OPEN_EVENT = 'mpi-theme-panel-open';

export function openThemePanel(): void {
  window.dispatchEvent(new Event(THEME_PANEL_OPEN_EVENT));
}
