# Refactor: PDF Field Annotation Tool — TypeScript + Vite Migration

This document records the migration of the PDF field annotation tool from a single-file JavaScript app to TypeScript + Vite.

## Goals

- Rewrite in **TypeScript** with strict type checking
- Use **Vite** for build and dev server
- Clear **src/** module layout while keeping behavior aligned with the original `app.js`

## Config & Tooling

### New Files

| File | Description |
|------|-------------|
| `tsconfig.json` | TypeScript config: `strict: true`, plus `noUnusedLocals`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`; compiles `src/` only |
| `vite.config.ts` | Vite config: build output to `dist/`, entry script to `assets/[name]-[hash].js` |
| `package.json` | Scripts and deps: `pdfjs-dist`, `typescript`, `vite`; scripts: `dev`, `build`, `preview` |
| `.gitignore` | Ignores `node_modules/`, `dist/`, `*.tsbuildinfo`, `.env`, `.DS_Store`, etc. |

### Modified Files

| File | Description |
|------|-------------|
| `index.html` | Removed refs to `style.css`, CDN pdf.js, `app.js`; now `<script type="module" src="/src/main.ts"></script>`, with Vite injecting styles and script |

### Removed Files

| File | Description |
|------|-------------|
| `app.js` | Logic moved into `src/` TypeScript modules |

## Source Layout (src/)

| Module | Role |
|--------|------|
| `types.ts` | Types: `Field`, `FieldType`, `DragRect`, `Corner`, `OverlayItem`, `ResizeState`, `MoveState`, `FieldsExport` |
| `constants.ts` | Constants: `HANDLE_SIZE`, `MIN_RECT_SIZE`, `CLOSE_BUTTON_SIZE`, `EDGE_TOL` |
| `state.ts` | Global state: `fields`, `selectedIndex`, `overlaysByPage`, `resizeState`, `moveState` |
| `overlay.ts` | Coord conversion, overlay drawing, hit tests (handles/close button/edges/box), resize/move logic, `setupOverlay` |
| `pdf.ts` | `clearPdf`, `renderPdf` (load PDF, render pages, attach overlay) |
| `fieldList.ts` | `renderFieldList`, `deleteField`, `selectField` (list render, delete, select and scroll to box) |
| `form.ts` | `showForm`, `hideForm`, `syncFormToField` |
| `exportImport.ts` | `exportJson`, `importJson` (mission-format export/import of fields.json) |
| `main.ts` | Entry: configure PDF.js worker, get DOM, wire deps, bind events (file picker, export/import, form, keyboard delete) |
| `style.css` | Styles (moved from root `style.css`, imported in `main.ts`) |

Behavior matches the original `app.js`, split into modules with types.

## Build & Run

- **Dev**: `npm run dev` → http://localhost:5173/
- **Build**: `npm run build` → output in `dist/`; `index.html` references hashed `dist/assets/index-xxx.js` and `dist/assets/index-xxx.css`
- **Preview build**: `npm run preview`, or `npx serve dist` etc.

## Version Control

- **Committed**: Source, config, `package-lock.json`, `.gitignore`
- **Ignored**: `node_modules/`, `dist/`, `*.tsbuildinfo`, and common temp/env files

Behavior matches the README test flow; you can verify with that flow.
