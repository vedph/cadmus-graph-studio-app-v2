# Cadmus Graph Studio V2

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.1. This is the second generation of the [original studio app](https://github.com/vedph/cadmus-graph-studio-app), rebased on Angular 20 and totally rewritten to leverage newer UI components.

The Cadmus Graph Studio App is a minimalist editor for helping users build and test their graph mapping rules.

- 📖 [documentation](https://myrmex.github.io/overview/cadmus/graph-studio/graph-studio/)
- 🟢 [backend API](https://github.com/vedph/cadmus-graph-studio-api): this is required to test mappings.
- [library overview](./projects/myrmidon/cadmus-mapping-builder/README.md)

🐋 Docker:

1. `pnpm run build-lib`;
2. update [env.js](./src/env.js) version number and version numbers in [docker compose](docker-compose.yml);
3. `ng build --configuration=production`;
4. build image like (change version number accordingly):

```bash
docker build . -t vedph2020/cadmus-graph-studio-app:1.0.0 -t vedph2020/cadmus-graph-studio-app:latest
```

🚀 For production:

(1) build as above for 1-3.
(2) in `dist/cadmus-graph-studio-app/browser/env.js` replace the host address (and eventually version number by appending `-prod`) as follows:

```js
window.__env.apiUrl = "https://cadmus-graph-studio-api.fusi-soft.com/api/";
```

(3) build prod image:

```bash
docker build . -t vedph2020/cadmus-graph-studio-app:1.0.0-prod
```

## Debug Hints

If you need to debug the tree:

1. always _build_ the library first before linking.
2. in your _source_ workspace root, run `npm link dist/myrmidon/paged-data-browsers --force`. You can check with `npm ls -g --depth=0 --link=true`.
3. in your _target_ workspace root, run `npm link @myrmidon/paged-data-browsers --force`.
4. later, to unlink, in your _target_ workspace root run `npm unlink @myrmidon/paged-data-browsers --force` and `npm i --force` to reinstall the original package.

You don't need to uninstall the NPM package first. The `npm link` command will temporarily override the installed package without removing it from your package.json or node_modules. The original package stays in node_modules and package.json; `npm link` creates a symbolic link that takes precedence. When you `npm unlink`, it removes the symbolic link and falls back to the original package.

You can check if the link is active by looking at `node_modules/@myrmidon/paged-data-browser`: it should show as a symbolic link (folder icon with an arrow on Windows).

When you revert with `npm unlink @myrmidon/paged-data-browser`, the original package from npm will be used again automatically.

## History

- 2026-02-28: updated Angular and packages.
- 2026-02-01:
  - updated Angular and packages.
  - ⚠️ migrated to zoneless.
  - in testing migrated from Karma to Vitest.
- 2025-11-24:
  - ⚠️ upgraded to Angular 21.
  - migrated to `pnpm`.
- 2025-11-07: updated Angular and packages.
- 2025-09-28: updated Angular and packages.

### 2.0.0

- 2025-09-18:
  - updated Angular and packages.
  - ⚠️ refactored for full reactivity.
- 2025-09-03: updated Angular and packages.
- 2025-07-25: updated Angular and packages.

### 1.0.0

- 2025-07-12:
  - updated Angular.
  - added Docker support.
  - generated image.
- 2025-07-09: updated Angular and packages.
- 2025-06-15: updated Angular and packages.
- 2025-06-10:
  - adopted modern Angular infrastructure.
  - made all components standalone, removing modules.
  - replaced all input/output in components with signals.
  - replaced Material tree with paged tree.
  - refactored data services.

---

- 2025-06-09: updated Angular and packages.
- 2025-06-05: ⚠️ upgraded to Angular 20.
- 2024-12-12:
  - updated Angular and packages.
  - M3 theme.
- 2024-11-19: updated Angular and packages.
- 2024-11-09: ⚠️ upgraded to Angular 17.

### 0.1.0

- 2023-10-05:
  - ⚠️ removed ELF.
  - updated packages and Angular.

### 0.0.11

- 2023-09-07: updated Angular and some mappings.
- 2023-08-07:
  - updated Angular and packages.
  - added more mappings.
- 2023-07-23: added scalar pattern to mapping.

### 0.0.10

- 2023-07-19:
  - updated mappings.
  - better layout for mapping editor.
- 2023-07-08:
  - updated Angular.
  - more mappings and samples.
- 2023-06-30: updated Angular and packages.
- 2023-06-14: updated Angular.

### 0.0.9

- 2023-05-31: fixes to sample work mappings.

### 0.0.8

- 2023-05-31: more mappings.
- 2023-05-27:
  - updated Angular.
  - fixed `E90` in sample `work` mapping.

### 0.0.7

- 2023-05-23:
  - updated sample data and mappings for the new model of event related ID (using [asserted composite ID](https://github.com/vedph/cadmus-bricks-shell/blob/master/projects/myrmidon/cadmus-refs-asserted-ids/README.md#asserted-composite-id)).
  - updated Angular and packages.

### 0.0.6

- 2023-05-15:
  - refactored mappings and samples to fit the real events part scheme (which has multiple chronotopes and note side to side with description).
  - added prettify JSON button for sample input in mapping tester.

### 0.0.5

- 2023-05-11:
  - updated Angular and packages.
  - fix to node to string in output.
  - more samples.

### 0.0.4

- 2023-05-10: fixes to node parsing for labels.

### 0.0.3

- 2023-05-09: refactored import/export.

### 0.0.2

- 2023-05-09:
  - fixes to triples serialization for object literals.
  - improved sample presets.
  - more details in object literal output.
- 2023-05-08: upgraded to Angular 16.

### 0.0.1

- 2023-05-07: initial release.
