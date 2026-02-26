Summary
Build a tool to mark fields in an imported PDF and export all marked fields as JSON.

Requirements
- Allow users to draw a rectangle around a desired field in the PDF.
- For each marked field, allow users to input:
  - name
  - type
  - description
- Save rectangle coordinates and location metadata:
  - x, y, width, height (in **viewport pixels**, i.e. canvas coordinates; not PDF points)
  - page (page number)
- Export a JSON object containing all marked fields and their information. The export includes a **scale** field: at render time `scale = 1.5 * devicePixelRatio`, so 1 PDF point = scale pixels; the backend must use this scale to convert (x, y, width, height) from pixels to PDF points before filling, otherwise positions will be wrong.

Good To Have
Auto-detect likely field rectangles based on PDF layout.
Allow users to adjust auto-detected rectangles and then input field metadata.

Output JSON Example
- Top-level **scale** (number): viewport scale when rendering (1 PDF point = scale pixels). Backend uses it to convert x, y, width, height from pixels to PDF points.
- **fields**: array of field objects; x, y, width, height are in viewport pixels.

```json
{
  "scale": 3,
  "fields": [
    {
      "name": "field1_anamef_fdasfads",
      "type": "string",
      "description": "This is the worker's name.",
      "x": 100,
      "y": 200,
      "width": 111,
      "height": 22,
      "page": 1
    },
    {
      "name": "field2_anamef_fdasfads",
      "type": "number",
      "description": "This is the worker's age.",
      "x": 100,
      "y": 230,
      "width": 111,
      "height": 22,
      "page": 1
    }
  ]
}
```