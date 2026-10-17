# History

- 2026-10-17:
  - replaced the library build script with `scripts/build-libs.mjs` (`pnpm run build:libs`), building libraries in dependency order, guarded by `scripts/check-local-libs.js`.
  - completed the Vitest infrastructure: jest-dom matchers (`setup-test.ts`) and global test providers (`test-providers.ts`) wired into `angular.json`; added `@testing-library/user-event` and `@vitest/coverage-v8`; removed the unused `vitest.config.ts`.
  - `@myrmidon/cadmus-mapping-builder`: full test suite (services with Vitest + TestBed; components with Angular Testing Library), and these fixes:
    - all components: "too long" validation errors were never shown, as templates checked the `maxLength` error key instead of Angular's `maxlength`.
    - `RamNodeMappingService`: `addMapping` appended a duplicate instead of updating a mapping with an existing ID (so edits were not visible when reopening a mapping); a new mapping in an empty store got ID `-Infinity`; children of a new mapping now get its ID as parent ID; page count was `Infinity` with page size 0.
    - `GraphStudioApiService.runMappings`: no longer mutates the metadata object received from the caller.
    - `MappingJsonService`: IDs assigned while reading a document (e.g. to expanded named mappings) could collide with explicit IDs in the document; a node with a tag but no label was serialized as `uid [undefined|tag]`; a triple without object was serialized with literal `"undefined"`.
    - `MappingTreeComponent`: the tree was rebuilt by re-reading the mapping from the RAM store by ID, rather than from the bound mapping as documented, so unsaved changes (e.g. added children) did not appear; the tree was not cleared when the mapping was removed; the name filter also applied to the single root, so filtering by a child's name emptied the whole tree.
    - `MappingTreeService.reset` resolved before the tree was actually reset.
    - `MappingTreeEditorComponent`: after adding, deleting or saving a child, the editor jumped back to the root instead of editing the new/saved child (or closing when the edited mapping was deleted); after saving the root, the editor kept a stale copy of it; new child IDs could collide with existing ones when the tree IDs did not come from the JSON service counter; added the `editorClose` output (the host page already bound it).
    - `MappingEditorComponent`: the "n/a" source type set `undefined` rather than 0; children of a new root (parent ID 0) lost their parent ID on save and were treated as roots (SID required, source type shown).
    - `MappingOutputEditorComponent`: the nodes validator rejected valid lines, e.g. single-character keys or blank lines.
    - `JmesComponent`: transform errors were never displayed, as they were placed in a `mat-error` of a valid field.
    - `MappingRunnerComponent`: prettifying invalid JSON threw an unhandled error (now reported); it could run with invalid metadata; table headers were not inside rows.
    - `CachedTextPickerComponent`: added presets were listed without prefix, so they could not be removed from the list; the selection was not cleared after deleting a preset; without a prefix keys became `undefined...`; all cache keys briefly appeared before filtering by prefix.
    - `MappingListComponent`: the delete confirmation dialog had title and prompt swapped.
    - `NodeMappingListService.setPage`: changing the page size returned the cached page of the old size (`PagedListStore` cache keys ignore the page size).
    - added accessible names to icon-only buttons; declared the missing peer dependencies in the library's `package.json`.
  - app: full test suite (services with Vitest + TestBed; components with Angular Testing Library), and these fixes:
    - mapping editor page: any change in the tree editor (including adding or deleting a child) saved the mapping and left the page, so a newly added child could never be edited; now changes are saved and the editor stays open until it is closed (closing returns to the home page).
    - mapping editor page: "add mapping" (route ID 0) opened an empty editor which could not save anything; it now starts a new mapping.
    - mappings document page: importing a valid JSON document with invalid mappings (e.g. a malformed triple) threw an unhandled error; it is now reported.
    - app shell: importing sample mappings and clearing mappings did not subscribe to the mapping service, relying on the RAM service doing its work eagerly.
  - removed the unused `@angular/animations` package.
- 2026-10-03: updated Angular and packages.
- 2026-09-04: updated packages.
- 2026-07-29: updated packages.
- 2026-07-02: API port for unified backend.
- 2026-03-13: ⚠️ migrated to new [Monaco wrapper](https://vedph.github.io/cadmus-doc/history/20260613-monaco.html).
- 2026-05-11: updated Angular and packages.

## 2.0.1

- 2026-05-05:
  - updated Angular and packages.
  - migrated to M3 syles and var-based colors.
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

## 2.0.0

- 2025-09-18:
  - updated Angular and packages.
  - ⚠️ refactored for full reactivity.
- 2025-09-03: updated Angular and packages.
- 2025-07-25: updated Angular and packages.

## 1.0.0

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

## 0.1.0

- 2023-10-05:
  - ⚠️ removed ELF.
  - updated packages and Angular.

## 0.0.11

- 2023-09-07: updated Angular and some mappings.
- 2023-08-07:
  - updated Angular and packages.
  - added more mappings.
- 2023-07-23: added scalar pattern to mapping.

## 0.0.10

- 2023-07-19:
  - updated mappings.
  - better layout for mapping editor.
- 2023-07-08:
  - updated Angular.
  - more mappings and samples.
- 2023-06-30: updated Angular and packages.
- 2023-06-14: updated Angular.

## 0.0.9

- 2023-05-31: fixes to sample work mappings.

## 0.0.8

- 2023-05-31: more mappings.
- 2023-05-27:
  - updated Angular.
  - fixed `E90` in sample `work` mapping.

## 0.0.7

- 2023-05-23:
  - updated sample data and mappings for the new model of event related ID (using [asserted composite ID](https://github.com/vedph/cadmus-bricks-shell/blob/master/projects/myrmidon/cadmus-refs-asserted-ids/README.md#asserted-composite-id)).
  - updated Angular and packages.

## 0.0.6

- 2023-05-15:
  - refactored mappings and samples to fit the real events part scheme (which has multiple chronotopes and note side to side with description).
  - added prettify JSON button for sample input in mapping tester.

## 0.0.5

- 2023-05-11:
  - updated Angular and packages.
  - fix to node to string in output.
  - more samples.

## 0.0.4

- 2023-05-10: fixes to node parsing for labels.

## 0.0.3

- 2023-05-09: refactored import/export.

## 0.0.2

- 2023-05-09:
  - fixes to triples serialization for object literals.
  - improved sample presets.
  - more details in object literal output.
- 2023-05-08: upgraded to Angular 16.

## 0.0.1

- 2023-05-07: initial release.
