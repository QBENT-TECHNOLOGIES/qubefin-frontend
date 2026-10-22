import { LucideIconData, LucideIconNode } from '@lucide/angular';

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

  /**
   * Teardrop pin with a Lucide icon inside (places in the task picker).
   * `outline` = white pin with a coloured border and icon (not selected); `label` replaces the icon (e.g. a route sequence number).
   */
  iconPin(
    key: string,
    icon: LucideIconData,
    color: string,
    opts: { selected?: boolean; small?: boolean; outline?: boolean; label?: string | null } = {},
  ): HTMLElement {
    let el = this.cache.get(key);
    if (!el) {
      el = document.createElement('div');
      el.className = 'trk-marker-pin has-icon';
      el.appendChild(document.createElement('span'));
      this.cache.set(key, el);
    }
    el.style.setProperty('--trk-color', color);
    el.classList.toggle('is-selected', !!opts.selected);
    el.classList.toggle('is-small', !!opts.small);
    el.classList.toggle('is-outline', !!opts.outline);
    const span = el.firstChild as HTMLElement;
    const want = opts.label ? `t:${opts.label}` : `i:${icon.name}`;
    if (span.dataset['content'] !== want) {
      span.dataset['content'] = want;
      span.replaceChildren(opts.label ? document.createTextNode(opts.label) : lucideSvg(icon));
    }
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

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Builds a Lucide icon as a plain SVG element (markers live outside Angular templates). */
export function lucideSvg(icon: LucideIconData): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const attrs: Record<string, string> = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2.25',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  };
  Object.entries(attrs).forEach(([k, v]) => svg.setAttribute(k, v));
  const build = (node: LucideIconNode): Element => {
    const [name, props, children] = node as [string, Record<string, unknown>, LucideIconNode[]?];
    const el = document.createElementNS(SVG_NS, name);
    Object.entries(props ?? {}).forEach(([k, v]) => {
      if (k !== 'key' && v != null) el.setAttribute(k, String(v));
    });
    (children ?? []).forEach((c) => el.appendChild(build(c)));
    return el;
  };
  icon.node.forEach((n) => svg.appendChild(build(n)));
  return svg;
}
