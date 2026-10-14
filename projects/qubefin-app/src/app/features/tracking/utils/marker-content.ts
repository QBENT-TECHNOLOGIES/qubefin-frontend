/**
 * Builds and caches DOM nodes for google.maps AdvancedMarker `content`.
 * Re-creating a node on every change-detection pass makes markers flicker, so each key keeps
 * one element and only its colour / text is updated.
 */
export class MarkerContentCache {
  private readonly cache = new Map<string, HTMLElement>();

  /** Round badge with initials (used for people on the live map). */
  badge(key: string, text: string, color: string, opts: { selected?: boolean; pulse?: boolean } = {}): HTMLElement {
    let el = this.cache.get(key);
    if (!el) {
      el = document.createElement('div');
      el.className = 'trk-marker-badge';
      el.appendChild(document.createElement('span'));
      this.cache.set(key, el);
    }
    el.style.setProperty('--trk-color', color);
    el.classList.toggle('is-selected', !!opts.selected);
    el.classList.toggle('is-pulsing', !!opts.pulse);
    (el.firstChild as HTMLElement).textContent = text;
    return el;
  }

  /** Teardrop pin with a short label (used for places: tasks, branches, homes). */
  pin(key: string, label: string, color: string, opts: { selected?: boolean; small?: boolean } = {}): HTMLElement {
    let el = this.cache.get(key);
    if (!el) {
      el = document.createElement('div');
      el.className = 'trk-marker-pin';
      el.appendChild(document.createElement('span'));
      this.cache.set(key, el);
    }
    el.style.setProperty('--trk-color', color);
    el.classList.toggle('is-selected', !!opts.selected);
    el.classList.toggle('is-small', !!opts.small);
    (el.firstChild as HTMLElement).textContent = label;
    return el;
  }

  /** Small dot (route stops, playback head). */
  dot(key: string, color: string, size = 12): HTMLElement {
    let el = this.cache.get(key);
    if (!el) {
      el = document.createElement('div');
      el.className = 'trk-marker-dot';
      this.cache.set(key, el);
    }
    el.style.setProperty('--trk-color', color);
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    return el;
  }

  clear(): void {
    this.cache.clear();
  }
}

export function initials(name: string | null | undefined): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
