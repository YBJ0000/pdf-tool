# PDF Field Annotation Tool

## Features

- **Load PDF**: Select a local PDF; multiple pages are rendered one by one
- **Draw boxes**: Drag on any page to draw a rectangle; a new field is added when minimum size is met
- **Edit fields**: Click a field in the right-hand list and edit name, type, description in the form (type: string / number / date / boolean / checkbox)
- **Resize boxes**: Selected field shows a yellow box with corner handles; drag handles to resize
- **Move boxes**: When the cursor is on an edge of the selected box it shows move; drag to move (constrained to the current page)
- **Delete fields**: Use the × on the list item, the red × on the selected box, or press Delete/Backspace when selected
- **Export JSON**: Export `fields.json` in mission format (name, type, description, x, y, width, height, page). **Coordinates**: x, y, width, height are **viewport pixels** (canvas coordinates). Render scale is `scale = 1.5 * devicePixelRatio` (1 PDF point = scale pixels). Export includes a `scale` field; the backend must use it to convert pixels to PDF points before filling, or positions will be wrong
- **Import JSON**: Choose a saved `fields.json` to continue editing (replaces the current field list)
- **Fixed sidebar**: Field list and form are fixed on the right; PDF area scrolls independently
- **Scroll to box**: Clicking a list item scrolls the PDF to that page and brings the box into view (roughly upper fifth of the viewport)
- **AcroForm auto-detect**: When loading a PDF with AcroForm, form controls (inputs, checkboxes, etc.) are detected and corresponding field boxes are created; you can edit, resize, or export them

## Development & Build

- **Dev**: `npm run dev`, then open http://localhost:5173/
- **Build**: `npm run build`; output in `dist/`. Use `npm run preview` to preview
- Or serve the build: `npx serve dist` or `python3 -m http.server 8080 --directory dist`

## Quick Test Flow

1. **Start**: Run `npm run dev` (or preview `dist` as above) and open the URL
2. **Load**: Click "Select PDF", pick a PDF; confirm multiple pages render; field list stays visible on the right
3. **Draw**: Drag on a blank area of a page to draw a rectangle; confirm a blue box appears and the list gains an item with the form open
4. **Edit**: Fill name/type/description in the form (e.g. type checkbox); confirm list text updates
5. **Select & adjust**: Click another list item; confirm the box turns yellow with corner handles and a red ×; drag a corner to resize; drag on an edge (when cursor is move) to move the box (within the page)
6. **Delete**: Use × on the list item, or the red × on the box, or Delete when selected; confirm box and list item are removed
7. **Scroll to box**: Click a list item and confirm the PDF scrolls so that box is in view
8. **Export**: Click "Export JSON"; confirm `fields.json` downloads with all current fields and coordinates
9. **Import**: Click "Import JSON" and choose the exported file; confirm list and boxes are restored and editable
10. **AcroForm**: Load a PDF with fillable form (AcroForm); confirm field boxes appear for form controls; without AcroForm, you should see "Loaded N page(s). Drag to draw rectangles." and no errors
