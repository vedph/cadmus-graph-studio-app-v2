# Cadmus Graph Studio V2

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.1. This is the second generation of the [original studio app](https://github.com/vedph/cadmus-graph-studio-app), rebased on Angular 20 and totally rewritten to leverage newer UI components.

The Cadmus Graph Studio App is a minimalist editor for helping users build and test their graph mapping rules.

- 📖 [documentation](https://myrmex.github.io/overview/cadmus/graph-studio/graph-studio/)
- 🟢 [backend API](https://github.com/vedph/cadmus-graph-studio-api): this is required to test mappings.
- [library overview](./projects/myrmidon/cadmus-mapping-builder/README.md)

🐋 Docker:

1. update [env.js](./src/env.js) version number, and version numbers in [docker compose](docker-compose.yml) and [package.json](package.json);
2. `pnpm run build:libs` (builds all the libraries in dependency order);
3. `ng build --configuration=production`;
4. build image (change version number accordingly):

```bash
docker build . -t vedph2020/cadmus-graph-studio-app:2.0.1 -t vedph2020/cadmus-graph-studio-app:latest
```

🚀 For production:

(1) build as above.
(2) add an `env.js` file next to your `docker-compose.yml` script in your host to override the host address as in this example:

```js
// ... leave the rest unchanged except for API URL and version:
window.__env.apiUrl = "https://cadmus-graph-studio-api.fusi-soft.com/api/";
window.__env.version = "2.0.0";
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
