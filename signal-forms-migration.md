# Signal forms migration log

Migration of this workspace from reactive forms to signal forms
(`@angular/forms/signals`, Angular 22.2.3).

**Convention:** everything not marked otherwise was measured, by a spec, a
build, or the running app driven over CDP (headless Chrome, scripted clicks
and DOM reads). What was inferred but not measured is marked **believed**,
with how to check it.

## Facts verified along the way

- A static `min`/`max`/`maxlength` attribute on a `[formField]` node is
  rejected at build time (`NG8022`, measured for `min`). Such limits became
  schema rules (`min`, `max`, `maxLength`), which `[formField]` renders back
  as DOM attributes (specs read `maxlength`, `min`, `max` from the DOM).
- Consequence: a `maxLength` rule on a native input/textarea caps typing at
  the limit (user-event respects `maxlength`; specs measure a 51-character
  input ending with 50). The "too long" messages are now reachable only
  for over-long values coming from a bound model, which specs cover where a
  model exists. Before, users could type past the limit and get the error.
- At HEAD, the JMES component's `markAsDirty()` on every expression change
  had no visible effect: with an empty expression, "JMES required" was not
  shown on load (probe spec run against HEAD), because Material's default
  `ErrorStateMatcher` requires `touched`. It was not ported.
- FieldTree tags the objects inside arrays of a form model with a hidden
  `Symbol()`. In the mapping editor, without copying the output into and
  out of the draft, the triples of both the bound and the saved mapping got
  the symbol (mutation check: the spec failed with `expected [ Symbol() ]
  to deeply equal []`). The editor deep-copies the output both ways.
- Navigation in the app: a full page load of `/mappings/:id` shows an empty
  editor, because the page reads the mapping before the sample data is
  imported. Pre-existing (unchanged page code); in-app navigation works.

## Tooling and resolution

- `node_modules/@myrmidon` holds only third-party packages (symlinks into
  `.pnpm`); the local library resolves only through `tsconfig.json` paths
  to `dist/` (measured with `ls -la`). `scripts/check-local-libs.js` fails
  the build if a copy of a local library appears in `node_modules`.
- Before each browser check: `node scripts/build-libs.mjs`, then
  `.angular/cache` deleted and `ng serve` restarted. The served `main.js`
  was fetched from the page and grepped for identifiers introduced by the
  migration (`copyOutput`, `isDraftInSync`): present.
- The backend allows CORS only from `http://localhost:4200` (its
  `appsettings.json`), so the app must be served on 4200 to reach it.

## `@myrmidon/cadmus-mapping-builder`

Tests: 247, green. Build: library and app (downstream) clean. App tests
(34) green against the rebuilt library.

No component renders a `<form>` any more (a spec per component checks it).
Every action button is `type="button"` with `(click)`. Where the former
implicit form submission let Enter confirm, a `(keydown.enter)` on the
component's own single-line inputs does the same, guarded by the same
condition that disabled the submit button (implicit submission does nothing
when that button is disabled); specs cover Enter with and without a valid
state.

- `CachedTextPickerComponent`: local state only, so a plain `signal` draft
  (`key`, `newKey`). Enter in the key field adds the preset.
- `JmesComponent` (autosave):
  - The expression is a `linkedSignal(() => expression() || '')` with its
    own `form`. It is saved unchanged (no normalization), so the echo of
    our own autosave recomputes the identical string, which does not
    notify: no `previous` check is needed. Spec: typing `"abc "`, waiting
    past the debounce and typing `"d"` gives `"abc d"`, and the model gets
    `"abc "` then `"abc d"`.
  - A value received from the consumer is not saved back (spec).
  - Autosave still saves invalid values (e.g. `''`), as before: the mapping
    editor validates the expression as its own required source.
  - The test input/output are a separate local form. Enter in the
    expression runs the transform.
  - `sampleKeys`/`sampleForm`/`addSample` are not used by the template
    (dead code, migrated as is; see the report below).
- `MappingOutputEditorComponent` (manual save): canonical template.
  Parsing normalizes (e.g. `a = 1` becomes `a=1`), so the `previous` check
  matters. Mutation check: dropping it fails the echo spec (the field
  becomes `a=1` after saving).
- `MappingRunnerComponent`: local state only, one flat form for input and
  metadata. The metadata reset button clears the metadata (but not the
  input) as `FormGroup.reset()` did for those nullable controls (flags to
  0); a spec checks that the input is kept.
- `MappingEditorComponent` (manual save):
  - ID and parent ID are not in the draft: `toData(draft, mapping)` takes
    them from the bound mapping. The echo check compares
    `toData(toDraft(mapping), mapping)` with `toData(previous.value,
    previous.source)`, so it never serializes `parent`/`children`, which may
    be circular (spec: the saved data sent back as a child with a circular
    parent is accepted, and the editor switches to child mode).
  - `NgxToolsValidators.conditionalValidator(() => !isChild, required)`
    became the built-in `required(path.sid, { when: () => !this.isChild() })`
    rather than `NgxToolsSignalValidators.conditional`, which would mean
    re-implementing `required` by hand.
  - Enter in a single-line metadata field saves, as before.
  - Behaviour change: the flags filter had a static `min="0"` (a spinner
    hint only); it is now a `min` rule, so a negative value makes the form
    invalid (spec).
  - The host element is `<div role="form" aria-label="mapping">`, keeping
    the landmark that consumers' specs query.
- `MappingFilterComponent`: the draft is `linkedSignal(() =>
  toDraft(filter()))` over `toSignal(filter$, { requireSync: true })`
  (`filter$` is a `BehaviorSubject`). Apply is explicit and the old code
  rebuilt the form on every emission, so there is no echo guard.
  `reset()` sets the default values explicitly (`form().reset(value)`).
  Behaviour change: the flags input's static `min`/`max` are now rules, so
  out-of-range flags disable apply (spec).
- `MappingTreeFilterComponent`: canonical `linkedSignal` with echo check.
  `reset()` clears the value explicitly, as the filter may already be
  undefined (spec). Behaviour change: an empty name is applied as
  `undefined`; before, a name typed and then cleared was applied as `''`.
  The tree store ignores both (it trims the name).
- `MappingTreeComponent`: its display checkboxes are a small local form
  (`options`).
- `MappingListComponent`: dropped an unused `ReactiveFormsModule` import.

**Browser check (measured, app on 4200 with the backend):**

- Mapping editor at `/mappings/10`: 0 `<form>` elements, also with the
  nested JMES editor open. Enter in a text field saved (the tree editor's
  model got the new description) without leaving the page.
- Nested JMES: Enter in the expression ran the transform on the backend,
  output `42`.
- Nested output editor: after saving `x = 1`, the field still read
  `x = 1`, and the mapping saved with the button had metadata `{x: "1"}`.
- Nested runner: the run returned a result (0 nodes, 0 triples for the
  sample input) with no error.
- Nested child flow on `person_birth_event`: editing a child (after the
  switch confirmation) hid the source type and did not require the SID;
  renaming and saving updated the child in the tree model, with all 7
  children kept and the parent reference intact; the editor stayed on the
  child. Adding a child switched the editor to "New mapping".
- No console errors or warnings in any of these runs.

## App (`cadmus-graph-studio-app`)

Tests: 35, green. Build clean.

- `HomeComponent`: the two sample selectors are a local form, defaulting to
  the first sample of each list. The old `combineLatest` of two
  `valueChanges` with `startWith` became `toObservable(sources().value)`
  with the same 100 ms debounce: one load on creation (spec: exactly one
  call), one per change.
- `MappingDocPageComponent`: the JSON validator became a `validate` rule
  (`invalidJson`), next to `required`. The page renders no `<form>`; the
  import button was a `type="submit"` outside any form, and is now
  `type="button"`.
- `App`: dropped an unused `ReactiveFormsModule` import.

No component in the workspace imports `ReactiveFormsModule`, `FormControl`,
`FormGroup`, `FormBuilder` or `NgxToolsValidators` any more (grep).

**Browser check (measured):** the served `main.js` contained the migrated
app code and none of the old Home subscription. Home: 0 `<form>`
elements; picking "sample-mappings" in the mappings selector replaced the
three person mappings with the 13 sample ones. Mappings document page: 0
`<form>` elements; import enabled for the exported document, disabled for
`{oops`, and importing a one-mapping document showed "Mappings imported:
1". No console errors or warnings.

## Reported issues: fixed

All the issues reported below were then fixed, except the backend CORS
origin (development only).

- **Going Home discarded all edits.** `SampleDataService` now exposes the
  loaded samples (`mappings()`, `presets()`) and does not reload a sample
  already loaded; changing only the presets no longer reloads the mappings.
  `HomeComponent` starts its selectors from the loaded samples (adding them
  to the options if missing), so coming back keeps both the selection and
  the edits. `reset()` still forces a reload. Measured in the browser:
  `-mappings.json` fetched once at startup (it was twice: the service and
  Home each loaded it) and not again when returning Home; a renamed mapping,
  an edited description and output metadata were all still there after
  going Home and reopening the mapping; selecting `sample-mappings` still
  loaded it, and Home showed that selection after editing one of its
  mappings. Specs cover the service rules and Home's initial selection.
- **Deep links opened an empty editor.** The editor page now gets the
  mapping again on each `json$` emission until it is found
  (`switchMap` + `filter` + `take(1)`). The app shell subscribed to `json$`
  first, so it has imported the sample when the page reads the store.
  Measured: a full page load of `/mappings/11` opened `person_birth_event`.
  A spec covers the deep link, and another that a later sample load does
  not replace the mapping being edited. A full reload still resets the
  in-memory store to the default sample, so links to mappings of another
  sample find nothing (by design: nothing is persisted).
- Dead code removed: `JmesComponent` sample members (and its now unused
  `RamCacheService` dependency); `MappingTreeComponent.onEditFilterRequest`
  with its `MatDialog` and the template binding, and `options.mockRoot`;
  the runner's "invalid GUID" messages.
- `console.log` calls removed from `MappingPagedTreeStoreService`,
  `MappingTreeComponent` and `SampleDataService` (grep finds none left).

Tests: library 247, app 42, green. Builds clean. The library flow and the
nested-child flow were rerun in the browser on a fresh server and cache,
with no console errors.

**Measured tooling hazard:** stopping a backgrounded `npx ng serve` left
its `ng serve` node processes running (twice), still holding the port
and the `.angular/cache` compiler db, so a new server failed with "Port
4200 is already in use" and the cache could not be deleted. Check with
`Get-CimInstance Win32_Process -Filter "Name='node.exe'"` and kill them
before restarting.

## Report: outside the migration's scope (as first reported)

- **Going Home discards all edits.** `HomeComponent` loads the sample
  mappings every time it is created; the app shell then re-imports them
  over the in-memory store. Measured: one more fetch of
  `person-mappings.json` on returning Home, and an edited description was
  back to its sample value when the mapping was reopened.
- `JmesComponent`: `sampleKeys`, `sampleForm` and `addSample` are dead code
  (not used by the template).
- `MappingTreeComponent`: `options.mockRoot` and `onEditFilterRequest` are
  unused (the tree nodes are rendered with `hideFilter`).
- `MappingRunnerComponent`: the item/part ID "invalid GUID" errors check a
  `pattern` rule that does not exist (the GUID validators are commented
  out), so they never show.
- `console.log` calls in library code: `SampleDataService.load` (app),
  `MappingPagedTreeStoreService.reset` and `MappingTreeComponent.
  onFilterChange`.
- Deep links to `/mappings/:id` open an empty editor (see above).
