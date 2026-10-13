# Qubefin Frontend — Architecture & Developer Guide

> Snapshot of `main` @ `bf797a4` (October 2026). Written to onboard new work on top of the existing app.

Qubefin is an HR, payroll and organisation-administration web app (the browser tab title reads *"WeGrow India | Microfinance Institutions"*). This repo is the Angular frontend. It talks to a backend API gateway that fronts six services: `app`, `auth`, `global`, `hrms`, `payroll` and `report`.

---

## 1. Tech stack

| Area | Choice |
|---|---|
| Framework | **Angular 22** (standalone components only, no `NgModule`s) |
| Language | TypeScript ~6.0, `strict` + `strictTemplates` |
| Build | `@angular/build` (esbuild `application` builder), `ng-packagr` for the library |
| State | Angular **signals** + `httpResource` / `rxResource` (no NgRx) |
| Forms | **Signal Forms** (`@angular/forms/signals`) for most forms; template-driven `FormsModule` for filters and search |
| UI kit | Angular Material 22 + CDK (custom overrides in `mat-theme.scss`) |
| Styling | **Tailwind CSS v4** via PostCSS, plus hand-written global CSS in `src/styles/` |
| Icons | `@lucide/angular` ^1.56 (registered once, globally) |
| Alerts | SweetAlert2, wrapped by `AlertService` |
| Dates | `moment` + `@angular/material-moment-adapter` |
| Tests | Vitest + jsdom are installed, but **no test target or spec files exist yet** |

---

## 2. Getting started (Windows, local CLI, no global install)

The Angular CLI is already a **dev dependency** (`@angular/cli ^22.0.4`), so it installs into `node_modules` with the rest of the project. You do not need `npm i -g @angular/cli`.

```powershell
cd D:\projects\qubefin-frontend

# 1. Install exactly what package-lock.json pins (CLI included)
npm ci

# 2. Use the project-local CLI via npx (or "npm run ng -- <args>")
npx ng version

# 3. Build the shared library FIRST. The app imports it from dist/
npx ng build qubefin-core

# 4. Run the app (http://localhost:4200)
npx ng serve qubefin-app        # or: npm start
```

When you are editing `qubefin-core`, keep a second terminal running `npx ng build qubefin-core --watch --configuration development` so the app picks up changes.

| Task | Command |
|---|---|
| Dev server | `npm start` / `npx ng serve qubefin-app` |
| Production build | `npx ng build qubefin-core && npx ng build qubefin-app` |
| Dev build | `npx ng build qubefin-app --configuration development` |
| Generate a component | `npx ng g c features/<area>/components/<name> --project qubefin-app` |

`npm run build` and `npm test` **do not work as written** (see §11.2).

**Environments** (`projects/qubefin-app/src/environments/`):

| File | Used by | `gatewayPath` |
|---|---|---|
| `environment.development.ts` | `ng serve` / `--configuration development` | `https://localhost:7297/` |
| `environment.ts` | production build (default) | `http://65.2.146.91/services/` |

For local development the backend gateway must be running on `https://localhost:7297`.

---

## 3. Workspace layout

```
qubefin-frontend/
├─ angular.json              # 2 projects: qubefin-app (application) + qubefin-core (library)
├─ tsconfig.json             # paths: "qubefin-core" → ./dist/qubefin-core
├─ package.json
└─ projects/
   ├─ qubefin-core/          # shared library, built with ng-packagr → dist/qubefin-core
   │  └─ src/lib/
   │     ├─ components/      # DocumentModal, StatusBadge, TimePickerDialog
   │     ├─ enums/           # ApiPaths, StorageTokens
   │     ├─ guards/          # AuthGuard, PermissionGuard
   │     ├─ heloers/         # tokenDecoder  (sic: folder is misspelled)
   │     ├─ interceptors/    # AuthInterceptor
   │     ├─ services/        # AlertService, DocumentModalService
   │     ├─ stores/          # AuthStore, LoginStateStore, PermissionStore
   │     ├─ types/           # RouteMeta
   │     ├─ constants.ts     # EMPTY_UUID, months, nationalities, accountType
   │     └─ env-config.ts    # ENV_CONFIG token + EnvConfig
   └─ qubefin-app/
      ├─ public/             # static assets (favicon, leaf.png, assets/images/*)
      └─ src/
         ├─ main.ts, index.html
         ├─ mat-theme.scss   # Angular Material theme + component overrides
         ├─ styles.css       # Tailwind entry + imports of styles/*.css
         ├─ styles/          # theme, header, footer, menu, tree, dark, components…
         ├─ environments/
         └─ app/
            ├─ app.ts / app.html / app.config.ts / app.routes.ts
            ├─ lucide-icons.ts       # APP_ICONS (registration) + APP_ICONS_MAP (by name)
            ├─ guards/               # AuthGuard (app copy)
            ├─ interceptors/         # HttpErrorInterceptor
            ├─ layouts/
            │  ├─ public/area/       # login shell
            │  └─ secure/            # container, drawer, header, footer, breadcrumb, store/
            ├─ models/               # SearchParam, SessionUser, NotificationItem, …
            ├─ services/             # PageService, NotificationService, SessionService, ThemeService
            └─ features/
               ├─ auth/  home/  global/  app/  hrms/  payroll/  error/
               └─ Report/Service/    # ReportService (PF / PTax / ESI report blobs)
```

Size: about 125 components, 126 templates, 31 store files and 24 service files.

**Prefix:** every selector uses `qfin-` (`angular.json` → `prefix: "qfin"`).
**Schematic defaults:** inline styles and `skipTests: true` for components, services, guards and the rest.

---

## 4. Bootstrap & global configuration

`main.ts` → `bootstrapApplication(App, appConfig)`.

`app.config.ts` provides:

- `provideHttpClient(withInterceptors([AuthInterceptor, HttpErrorInterceptor]))`
- `provideRouter(routes)`
- `ENV_CONFIG` ← `environment`, consumed by `EnvConfig.getGatewayPath()` in the core library
- `MAT_FORM_FIELD_DEFAULT_OPTIONS` = `{ appearance: 'fill' }`
- `provideLucideIcons(...APP_ICONS)`, which registers every icon the templates use
- `provideBrowserGlobalErrorListeners()`

`App` (`qfin-root`) renders `<router-outlet>`, a navigation loading flag, and the global `<qfin-document-modal>` viewer from the core library.

---

## 5. Routing map

All feature areas are lazy-loaded (`loadChildren` → `*-routes.ts`, then `loadComponent` per page).

```
/                         → redirect /public/auth/login
/public        (Area layout)
  /auth/login             Login (multi-step: credentials → MFA → register MFA)
/secure        (Container layout, canActivate: AuthGuard)
  /home/      dashboard, profile
  /global/    administrative-units, organization-units, survey-committees, surveys
  /admin/     menus, roles, users                         (feature folder: features/app)
  /hrms/      employees, approval-workflows, employee-records, employee-approvals,
              attendance-history, attendance-regularization, leave-requests,
              leave-prayers, employee-attendance-history, employee-lop-finalization,
              holiday, department
              (commented out: approval-regularization, leave-approvals,
               leave-prayer-approvals, leave-fitness)
  /payroll/   salary-components, monthly-payroll, payslip
/unauthorized             PageUnauthorized
/**                       PageNotfound
```

Some routes carry `data: { title, subTitle, icon }` (type `RouteMeta`). In practice, the header title, subtitle, icon and breadcrumb come from the **backend menu record**, not from route data (see §7).

---

## 6. Authentication & authorisation

### Login flow (state machine)

`LoginStateStore` (core) holds `{ step, sessionId }` in `sessionStorage` and only allows these transitions:

```
login ──► mfa ──► complete
           │  ▲
           ▼  │
       register-mfa
```

`Login` page swaps the active step component with `NgComponentOutlet`:

| Step | Component | API |
|---|---|---|
| `login` | `ValidateLogin` | `POST auth-api/validate-login` → stores `sessionToken` |
| `mfa` | `VerifyMfa` | `POST auth-api/verify-mfa {mfaCode, sessionToken}` → stores `accessToken`, clears session token |
| `register-mfa` | `RegisterMfa` | `UserService.registerMfa` (QR code + key) → `enableMfa` → new `sessionToken`, back to `mfa` |
| `complete` | (none) | navigates to `/secure/home/dashboard` |

### Tokens

- `AuthStore` (core) keeps `sessionToken` / `accessToken` in signals mirrored to **`sessionStorage`**, under obfuscated keys from `StorageTokens`. Each browser tab therefore has its own session.
- `isAuthenticated` = access token present **and** the JWT `exp` has not passed.
- `logout()` clears both tokens and resets the login state.
- `main` has **no refresh-token handling**. `StorageTokens.REFRESH_TOKEN` is defined but unused, and a `Dev_Refresh_Token` branch exists on origin.

### Guards & permissions

- `AuthGuard` exists in both the app (`app/guards/auth.guard.ts`, the one routes use) and core. The two are identical.
- Core `PermissionStore` decodes the JWT once, in its constructor, and exposes `has(permissionToken)` from the `permission` claim.
- Core `PermissionGuard` reads `route.data['permission']`. **No route uses it yet.**
- Menus shown in the drawer are already filtered server-side (`app-api/menus/tree-by-user`), so menu visibility is the main access control in the UI.

---

## 7. Shell layout (secure area)

`Container` = `Drawer` (sidebar) + `Header` + `<router-outlet>` + `Footer`.

- **Drawer menu:** `MenuStore.menuTreeByUser` (`GET app-api/menus/tree-by-user`) renders a 3-level tree: group → item → sub-item. The `icon` string from the backend is resolved through `APP_ICONS_MAP`.
- **Page metadata:** on every `NavigationEnd`, `Container` calls `PageService.getByUrl(router.url)` → `GET app-api/menus/{encodedUrl}`. The returned `Menu` (name, icon, `hierarchy[]` for breadcrumbs) is passed to `Header` as `pageData`.
  ⇒ **A new page only gets a proper title and breadcrumb after a matching menu record is created in Admin → Menus**, with `target` = the route URL.
- **Header:** notifications (`NotificationStore`: `global-api/notifications`, `/count`, mark read / read-all), the logged-in user (`LoggedInUserInfoStore`: `app-api/users/login-info`), the theme toggle and logout.
- **Theme:** `ThemeService` toggles a `.dark` class on `<html>` and persists it in `localStorage`. Tailwind's `dark:` variant is bound to that class (`@custom-variant dark` in `styles.css`).

---

## 8. HTTP layer

### Request pipeline

1. **`AuthInterceptor`** (core) **prefixes every URL with `gatewayPath`** and adds `Authorization: Bearer <accessToken>` when authenticated.
   ⇒ Services and stores always use **relative** URLs built from `ApiPaths`:

   ```ts
   export enum ApiPaths { APP='app-api', AUTH='auth-api', GLOBAL='global-api',
                          HRMS='hrms-api', PAYROLL='payroll-api', REPORT='report-api' }
   // e.g. `${ApiPaths.HRMS}/departments/${id}` → https://localhost:7297/hrms-api/departments/{id}
   ```
2. **`HttpErrorInterceptor`** (app) shows a SweetAlert error for every failed request. It covers no network, 400 (`error.message` or `error.errors[0]`), 504, and everything else (`message`/`detail`), then re-throws.
   ⇒ Components usually **don't handle errors themselves**. Don't add a second error popup.

### Reads vs writes (the core convention)

| Kind | Where | How |
|---|---|---|
| **Reads** (GET, and POST searches) | `features/<area>/stores/*-store.ts` | `httpResource(() => url \| request \| undefined)` exposed as `computed` signals |
| **Writes** (POST/PUT/DELETE) | `features/<area>/services/*-service.ts` | `HttpClient` returning an `Observable`; the caller subscribes, then calls `store.refresh…()` |

---

## 9. Feature anatomy: the standard CRUD slice

Every master-data screen follows the same shape. The **Department** slice (`features/hrms`) is the cleanest reference:

```
features/hrms/
├─ models/department.ts                       IDepartment
├─ stores/department-store.ts                 list + single-item httpResources
├─ services/department-service.ts             create / update (+ getById)
├─ pages/department-component/                routed "page" = list + side panel orchestration
└─ components/department-components/
   ├─ department-list/    (input data, selectedId, isCollapsed → output onViewDetail)
   ├─ department-view/    (read-only panel, output showEdit)
   └─ department-detail/  (signal form for add / edit, outputs save / cancel)
```

### Store pattern

```ts
@Injectable({ providedIn: 'root' })
export class DepartmentStore {
  private readonly basePath = `${ApiPaths.HRMS}/departments`;
  private readonly departmentId = signal<string | undefined>(undefined);

  private readonly departmentsResource = httpResource<IDepartment[]>(() => this.basePath);
  readonly departments        = computed(() => this.departmentsResource.value() ?? []);
  readonly departmentsLoading = computed(() => this.departmentsResource.isLoading());
  readonly departmentsError   = computed(() => this.departmentsResource.error());

  readonly departmentResource = httpResource<IDepartment>(() => {
    const id = this.departmentId();
    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined; // undefined = don't fetch
  });
  readonly department = computed(() => this.departmentResource.value());

  setDepartmentId(id?: string) { if (this.departmentId() !== id) this.departmentId.set(id); }
  refreshList()   { this.departmentsResource.reload(); }
  refreshDetail() { this.departmentResource.reload(); }
}
```

Variations you'll see:

- **Lazy loading flags:** `MenuStore` uses `shouldLoadX` signals so a resource only fires when a screen asks for it.
- **Server-side paging:** `EmployeeStore` keeps `searchQuery`, `pageIndex`, `pageSize`, `sortOn`, `sortDirection` and filter signals, and builds a `POST …/employees/search` request object inside `httpResource`. Changing any signal refetches automatically. Paired with `MatPaginator` / `MatSort` in the list. (`SearchParam` in `app/models` is the shared shape.)
- `rxResource` appears in a few employee sub-forms and modals.

### Page pattern (list + slide-in panel)

The page component owns `selectedXId = signal(EMPTY_UUID)` and `isViewMode = signal(true)`:

- `EMPTY_UUID` + view mode → full-width list
- an id + view mode → list collapses to 25% and the **View** panel opens at 75%
- edit or add (`isViewMode=false`) → the **Detail** form takes full width; `EMPTY_UUID` means "new"

Shared CSS classes for this layout: `page-container`, `header-group`, `mainCard-area glass`, `viewArea-container`, `viewArea-header`, `pannel-close`, `global-btn shine-sweep lift`.

### Form pattern (Signal Forms)

```ts
protected readonly formModel = signal<IDepartment>(this.createEmptyModel());
protected readonly schema: Schema<IDepartment> = schema((p) => {
  required(p.name, { message: 'Name is required' });
});
protected readonly departmentForm = form(this.formModel, this.schema);
```

- An `effect` on the `xId` input calls `store.setXId(...)`. A second `effect` copies `store.x()` into `formModel` when editing.
- Submit: `form().markAsTouched()` → check `valid()` → `service.create/update(payload)` → `alertService.success(...)`, then `.then(() => { store.refreshList(); store.refreshDetail(); save.emit(); })`.
- Autocompletes, such as employee search, use a `Subject` + `debounceTime` + `switchMap` → `employeeOptions` signal.

### Component conventions

- Standalone, `imports: [...]` per component, signal APIs (`input()`, `output()`, `model()`), with only one legacy `@Input`.
- Built-in control flow (`@if`, `@for`) in templates.
- Default change detection everywhere in the app. `App` uses `ChangeDetectionStrategy.Eager`, and only core components use `OnPush`.
- Modals use `MatDialog.open(Component, { data })`, for example `EmployeeTransferModal`, `GrossSalaryModal`, `AttendanceCalendarModal` and `TimePickerDialogComponent`.
- Documents and images open via `DocumentModalService.open({ url, documentName, extension, downloadAccess })`. The single `<qfin-document-modal>` in `App` renders them, with zoom, rotate, fullscreen and download.
- Confirmations and toasts go through `AlertService`: `success`, `error`, `warning`, `info`, `question`, `confirm`, `delete`, `toast`.
- Current user ids come from `SessionService.employeeId` / `.userId`, decoded from the JWT.

---

## 10. Icons & styling

**Lucide icons.** Templates use `<svg lucideIcon="plus" class="w-4 h-4"></svg>` (kebab-case name) or `LucideDynamicIcon` with an icon object. **To add an icon**, edit `app/lucide-icons.ts` in up to three places:

1. import `LucideFoo` from `@lucide/angular`
2. add it to `APP_ICONS` (registers it for `lucideIcon="foo"`)
3. add it to `APP_ICONS_MAP` under a PascalCase key, if the icon name will come from **backend data** such as menu icons

**Styles.**

- `styles.css` is the Tailwind v4 entry (`@import 'tailwindcss'`). It imports `styles/theme.css`, which holds the `@theme` design tokens: primary is green `#16C784`, secondary is blue `#2563EB`, accent is violet `#7C3AED`. It also imports header, footer, menu, tree, components, utilities, animations, typography and `dark.css`.
- `mat-theme.scss` applies Material component overrides (form field, button, stepper, tree, slide toggle, and others).
- The component style budget is **4 kB warn / 8 kB error**, so put styling in Tailwind classes or the global CSS files rather than in large component styles.
- SweetAlert z-index is forced above CDK overlays in `styles.css`.

---

## 11. Known issues & observations

1. ~~`npm install` fails without `--legacy-peer-deps`~~ **Resolved.** The deprecated `lucide-angular@1.0.0` (peer Angular ≤21) and the unused `lucide` package were removed, and `@lucide/angular` was bumped to `^1.56.0`. Plain `npm ci` now works.
2. **`npm run build` / `npm test` are broken** in this two-project workspace. `ng build` errors with "Cannot determine project", and there is no `test` target at all (Vitest and jsdom are installed but not wired up, and there are no `*.spec.ts` files). Suggested scripts:
   `"build": "ng build qubefin-core && ng build qubefin-app"`, `"build:core": "ng build qubefin-core"`, `"watch:core": "ng build qubefin-core --watch --configuration development"`.
3. **The app depends on built library output.** `tsconfig.json` maps `qubefin-core` → `dist/qubefin-core`. On a fresh clone, `ng serve` fails with *Cannot find module 'qubefin-core'* until the library is built.
4. **Dead SSR leftovers.** `serve:ssr:qubefin-app`, `@angular/ssr`, `@angular/platform-server`, `express` and `@types/express` are present, but there is no server entry and no SSR config in `angular.json`.
5. `qubefin-core/package.json` peer deps still say `^21.2.0` while the workspace is on Angular 22. `README.md` still says it was generated with CLI 21.1.5.
6. **Two classes named `PermissionStore`.** One in core holds JWT permission tokens; one in `features/app/stores` holds the permission catalogue from `app-api/permissions`. Check imports carefully.
7. The core `PermissionStore` decodes the token only once, when first injected. If it is created before login, it stays empty until the page reloads.
8. `PermissionGuard` redirects to `/secure/unauthorized`, which doesn't exist; the route is `/unauthorized`. The guard is currently unused.
9. **XSS surface.** `AlertService` interpolates `title`/`text` into raw HTML, and `HttpErrorInterceptor` feeds it server error messages. Escape them if messages can ever contain user input.
10. **Production gateway is plain HTTP on a bare IP** (`http://65.2.146.91/services/`). Tokens in `sessionStorage` travel over it unencrypted.
11. **Production builds need internet.** The build inlines Google Fonts (Inter, Material Symbols) from `index.html`, so it fails offline or behind a proxy that blocks `fonts.googleapis.com`.
12. Housekeeping: misspelled folder `heloers`, capitalised `features/Report/Service`, duplicate `* - Copy.png` assets in `public/assets/images`, many commented-out routes in `hrms-routes.ts`, and the duplicate `AuthGuard`.

---

## 12. Recipe: adding a new feature screen

Example: *Grades* under HRMS.

1. **Model:** `features/hrms/models/grade.ts` (`IGrade`).
2. **Store:** `features/hrms/stores/grade-store.ts`, copied from `DepartmentStore` (list resource, item resource keyed by an id signal, `refreshList`/`refreshDetail`). Use `ApiPaths.HRMS`.
3. **Service:** `features/hrms/services/grade-service.ts` with `create`/`update`/`delete` via `HttpClient`.
4. **Components:** `components/grade-components/grade-list | grade-view | grade-detail`, created with
   `npx ng g c features/hrms/components/grade-components/grade-list --project qubefin-app`.
5. **Page:** `pages/grade-component/`, using the list + panel orchestration from `DepartmentComponent`.
6. **Route:** add `{ path: 'grades', loadComponent: () => import('./pages/grade-component/grade-component').then(m => m.GradeComponent) }` to `hrms-routes.ts`.
7. **Menu:** in the running app, *Admin → Menus*, create a menu item with `target = /secure/hrms/grades`, an icon name present in `APP_ICONS_MAP`, and role/user permissions. Without this step the item won't appear in the drawer and the header has no title.
8. **Icons:** register any new Lucide icon in `lucide-icons.ts` (§10).
9. Errors are already surfaced by the interceptor. Use `AlertService.success` after saves.

For a whole **new area** (not just a screen), add `features/<area>/<area>-routes.ts`, register it under `secure` children in `app.routes.ts`, and add a value to `ApiPaths` in `qubefin-core` if it talks to a new backend service. Then rebuild the library.
