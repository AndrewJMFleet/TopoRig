# TopoRig project page

A responsive research project page based on the supplied `paper.pdf`, with an interactive Three.js viewer for all four FBX samples. Built with Vite and plain JavaScript; no backend is required.

## Local development

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

```sh
npm run build    # Creates the deployable static site in dist/
npm run preview  # Serves the production build locally
npm test         # Browser tests using installed Google Chrome
```

## Preview with Python

The source entry is `src/index.html`. A plain HTTP server cannot compile the source JavaScript, so build once before serving it:

```sh
npm ci
npm run build
python3 -m http.server 8000
```

Open http://localhost:8000. The project-root `index.html` automatically opens `dist/`, preserving query parameters and section links. It displays build instructions if `dist/` does not exist. Run `npm run build` again after source edits.

You can also serve the compiled site directly:

```sh
python3 -m http.server 8000 --directory dist
```

## GitHub Pages

1. Push the project source, `package-lock.json`, `.github/workflows/pages.yml`, and **all of `public/`** to your GitHub repository. Generated `dist/` and `node_modules/` are ignored and do not need to be committed.
2. In the repository, open **Settings → Pages → Build and deployment → Source**, and select **GitHub Actions**.
3. Push to `main` or `master`, or manually run **Deploy GitHub Pages** from the Actions tab. If your branch has a different name, update the workflow's branch filter.

The included workflow installs dependencies, builds the page, and deploys only `dist/`. Blender and the source FBX files are not needed by the workflow; the prepared assets in `public/` are used directly. No repository-name configuration is required: HTML, scripts, styles, models, textures, and PDF links use relative paths, supporting both `https://USERNAME.github.io/` and `https://USERNAME.github.io/REPOSITORY/`.

This is a static site. The browser needs WebGL 2 for the demo; the research content works independently. Deployment is configured locally; it has not been published to a GitHub account.

See the official [GitHub Pages custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) for the Pages environment setup.

## Interactive viewer

- Four supplied characters, with lazy loading and download progress.
- 43 selectable facial blendshapes (eye-wide left/right excluded) and a separate panel for eight eyeball gaze controls without AU numbers.
- Facial-region filtering, an AU selector, keyboard-accessible intensity slider, animation, reset, and hold-to-compare with neutral.
- Orbit/zoom controls and texture, clay, and wireframe views.
- Error recovery and disposal of previous model resources when switching samples.

The demo interpolates one facial blendshape at a time. The separate gaze selector and intensity slider act on the eyeball meshes and preserve the selected facial expression; resetting gaze does not reset the face. It does **not** execute the TopoRig neural model. AU numbers follow the paper's ICT FaceKit vocabulary, which differs from standard FACS numbering. L/R denote the character's own left and right.

`src/controls.js` retains the original ICT indices when filtering the facial controls, so removing eye-wide does not renumber other AUs. Gaze controls are exported separately without AU labels. `src/viewer.js` decodes normalized geometry attributes and applies the selected displacement on the CPU, avoiding large GPU morph-target textures. Normal vectors update with the expression. No geometry simplification is performed; glTF may split/reorder vertices at attribute seams, and Meshopt quantizes coordinates. The viewer's vertex count reports the source FBX count.

## Assets and reproducibility

The prepared web assets are included under `public/`. Ordinary development and builds do not require Blender or Python. Each compressed character is approximately 6–7 MB; only the selected character is downloaded.

To regenerate models from `samples/*.fbx`, install Blender 4.2+ with `blender` on your PATH, then run:

```sh
npm run assets
```

The exporter preserves the facial and eye shapes, transforms the entire character hierarchy into an upright coordinate system, and exports opaque textured materials. The compression script applies Meshopt and WebP texture compression. Intermediate uncompressed models are written to the ignored `.asset-build/` directory. Original FBX files remain unchanged.

To regenerate paper figures, install `pymupdf` and `pillow`, then run `python3 scripts/extract-paper.py`. To regenerate the four transparent preview images, start the dev server on port 5173 and run `node scripts/render-posters.mjs`. These are renders of the actual supplied models.

## Content and verification

The page includes the paper's authors and affiliations, method summary, original architecture and comparison figures, exact Table 1 results, and a local PDF download. It retains the paper's distinction between transferred-reference fidelity and perceptual quality, and does not claim compound-expression evaluation or a released code repository.

Browser tests cover real vertex displacement and linear interpolation, preservation of triangle counts, neutral comparison, playback, keyboard slider control, all four characters, independent facial/gaze control, exclusion of eye-wide controls, rapid sample changes, failed-download retry, mobile overflow, and asset/PDF availability. Development-only diagnostics used by the tests and preview renderer are excluded from production builds.

Production tests serve the compiled build through Python at the project root and under `/dist/` (the same relative-path behavior needed by repository-based GitHub Pages), checking model loading, visible deformation, gaze interaction, and image/PDF URLs. `npm test` builds first, then runs both development and static-hosting tests.
