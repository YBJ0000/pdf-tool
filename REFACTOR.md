# 重构记录：PDF 字段标注工具 TypeScript + Vite 迁移

本文档记录将 PDF 字段标注工具从单文件 JavaScript 迁移到 TypeScript + Vite 的改动。

## 目标

- 使用 **TypeScript** 重写，开启严格类型检查
- 使用 **Vite** 作为构建与开发服务器
- 建立清晰的 **src/** 模块结构，保持与原 `app.js` 行为一致

## 配置与工具

### 新增文件

| 文件 | 说明 |
|------|------|
| `tsconfig.json` | TypeScript 配置。`strict: true`，并启用 `noUnusedLocals`、`noUncheckedIndexedAccess`、`noPropertyAccessFromIndexSignature` 等严格选项；仅编译 `src/` |
| `vite.config.ts` | Vite 配置。构建输出到 `dist/`，入口脚本输出为 `assets/[name]-[hash].js` |
| `package.json` | 项目脚本与依赖：`pdfjs-dist`、`typescript`、`vite`；脚本：`dev`、`build`、`preview` |
| `.gitignore` | 忽略 `node_modules/`、`dist/`、`*.tsbuildinfo`、`.env`、`.DS_Store` 等 |

### 修改文件

| 文件 | 说明 |
|------|------|
| `index.html` | 移除对 `style.css`、CDN 版 pdf.js、`app.js` 的引用；改为 `<script type="module" src="/src/main.ts"></script>`，由 Vite 在开发/构建时注入样式与脚本 |

### 删除文件

| 文件 | 说明 |
|------|------|
| `app.js` | 原有单文件逻辑已迁移至 `src/` 下各 TypeScript 模块 |

## 源码结构（src/）

| 模块 | 职责 |
|------|------|
| `types.ts` | 类型定义：`Field`、`FieldType`、`DragRect`、`Corner`、`OverlayItem`、`ResizeState`、`MoveState`、`FieldsExport` |
| `constants.ts` | 常量：`HANDLE_SIZE`、`MIN_RECT_SIZE`、`CLOSE_BUTTON_SIZE`、`EDGE_TOL` |
| `state.ts` | 全局可变状态：`fields`、`selectedIndex`、`overlaysByPage`、`resizeState`、`moveState` |
| `overlay.ts` | 坐标转换、overlay 绘制、命中检测（角柄/关闭按钮/边/框）、resize/move 逻辑、`setupOverlay` |
| `pdf.ts` | `clearPdf`、`renderPdf`（加载 PDF、逐页渲染、挂 overlay） |
| `fieldList.ts` | `renderFieldList`、`deleteField`、`selectField`（列表渲染、删除、选中并滚动到框） |
| `form.ts` | `showForm`、`hideForm`、`syncFormToField` |
| `exportImport.ts` | `exportJson`、`importJson`（按 mission 格式导出/导入 fields.json） |
| `main.ts` | 入口：配置 PDF.js worker、获取 DOM、组装 deps、绑定事件（文件选择、导出/导入、表单、键盘删除） |
| `style.css` | 样式（由原根目录 `style.css` 迁入，在 `main.ts` 中 import） |

逻辑与原 `app.js` 一致，仅拆分为模块并加上类型约束。

## 构建与运行

- **开发**：`npm run dev` → 打开 http://localhost:5173/
- **构建**：`npm run build` → 产物在 `dist/`，`index.html` 会引用带 hash 的 `dist/assets/index-xxx.js`、`dist/assets/index-xxx.css`
- **预览构建结果**：`npm run preview`，或使用 `npx serve dist` 等静态服务

## 版本控制与忽略

- **已提交**：源码、配置、`package-lock.json`、`.gitignore`
- **忽略**：`node_modules/`、`dist/`、`*.tsbuildinfo` 及常见临时/环境文件

功能与 README 中的测试流程保持一致，可直接按该流程验证行为。
