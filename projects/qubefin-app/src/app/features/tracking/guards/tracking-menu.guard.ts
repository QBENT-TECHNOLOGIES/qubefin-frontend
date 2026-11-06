import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { ApiPaths, AuthStore } from 'qubefin-core';
import { MenuTreeNode } from '../../app/models/menu';

/**
 * URL blocking for the Tracking screens only. A tracking page opens only when the signed-in user has a menu for it
 * (Admin → Menus, `app-api/menus/tree-by-user`, the same list the drawer shows). Typing the URL of a hidden screen,
 * e.g. /secure/tracking/settings for a Branch Manager, goes to /unauthorized.
 *
 * The menu list is fetched once per access token (a new login gets a fresh list). If it cannot be loaded the
 * page is refused (fail closed). The backend still has to check every tracking-api call itself.
 */
let cache: { token: string; targets: Observable<Set<string>> } | null = null;

const normalize = (url: string) => url.split(/[?#;]/)[0].replace(/\/+$/, '').toLowerCase();

function collect(nodes: readonly MenuTreeNode[] | null | undefined, into: Set<string>): Set<string> {
  for (const n of nodes ?? []) {
    if (n.target) into.add(normalize(n.target));
    collect(n.children, into);
  }
  return into;
}

function menuTargets(http: HttpClient, token: string): Observable<Set<string>> {
  if (cache?.token !== token) {
    const targets = http.get<MenuTreeNode[]>(`${ApiPaths.APP}/menus/tree-by-user`).pipe(
      map((tree) => collect(tree, new Set<string>())),
      catchError(() => {
        cache = null; // try again on the next navigation
        return of(new Set<string>());
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    cache = { token, targets };
  }
  return cache.targets;
}

export const trackingMenuGuard: CanActivateChildFn = (_route, state) => {
  const router = inject(Router);
  const token = inject(AuthStore).accessToken();
  if (!token) return router.parseUrl('/public/auth/login');
  const url = normalize(state.url);
  return menuTargets(inject(HttpClient), token).pipe(map((targets) => (targets.has(url) ? true : router.parseUrl('/unauthorized'))));
};
