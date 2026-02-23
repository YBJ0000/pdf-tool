/**
 * Step 1 + 2: 显示 PDF，并在每页上叠一层 canvas 拖拽画矩形
 */
(function () {
  const fileInput = document.getElementById('fileInput');
  const pdfContainer = document.getElementById('pdfContainer');
  const statusEl = document.getElementById('status');

  /** 已绘制的矩形，每项为 { x, y, width, height, page }，坐标为该页 canvas 像素（左上角为原点） */
  const fields = [];

  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function clearPdf() {
    pdfContainer.innerHTML = '';
    fields.length = 0;
  }

  /** 将鼠标事件坐标转换为 overlay 上的像素坐标（与 PDF 该页 canvas 一致） */
  function getLocalCoords(overlay, clientX, clientY) {
    const rect = overlay.getBoundingClientRect();
    const scaleX = overlay.width / rect.width;
    const scaleY = overlay.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  /** 在某一页的 overlay 上重绘所有该页的矩形 + 当前拖拽中的矩形 */
  function drawOverlay(overlay, pageNum, dragRect) {
    const ctx = overlay.getContext('2d');
    const w = overlay.width;
    const h = overlay.height;
    ctx.clearRect(0, 0, w, h);

    const pageRects = fields.filter(function (r) { return r.page === pageNum; });
    ctx.strokeStyle = 'rgba(33, 150, 243, 0.9)';
    ctx.lineWidth = 2;
    pageRects.forEach(function (r) {
      ctx.strokeRect(r.x, r.y, r.width, r.height);
    });

    if (dragRect) {
      ctx.strokeStyle = 'rgba(255, 152, 0, 0.9)';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(dragRect.x, dragRect.y, dragRect.width, dragRect.height);
      ctx.setLineDash([]);
    }
  }

  function setupOverlay(wrapper, canvas, pageNum) {
    const overlay = document.createElement('canvas');
    overlay.className = 'pdf-overlay';
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    overlay.dataset.page = String(pageNum);

    let dragStart = null;

    overlay.addEventListener('mousedown', function (e) {
      const { x, y } = getLocalCoords(overlay, e.clientX, e.clientY);
      dragStart = { x, y };
    });

    overlay.addEventListener('mousemove', function (e) {
      if (!dragStart) return;
      const { x, y } = getLocalCoords(overlay, e.clientX, e.clientY);
      const dragRect = {
        x: Math.min(dragStart.x, x),
        y: Math.min(dragStart.y, y),
        width: Math.abs(x - dragStart.x),
        height: Math.abs(y - dragStart.y),
      };
      drawOverlay(overlay, pageNum, dragRect);
    });

    overlay.addEventListener('mouseup', function (e) {
      if (!dragStart) return;
      const { x, y } = getLocalCoords(overlay, e.clientX, e.clientY);
      const x1 = Math.min(dragStart.x, x);
      const y1 = Math.min(dragStart.y, y);
      const width = Math.abs(x - dragStart.x);
      const height = Math.abs(y - dragStart.y);
      dragStart = null;
      if (width >= 5 && height >= 5) {
        fields.push({ x: x1, y: y1, width, height, page: pageNum });
        setStatus('已添加框，共 ' + fields.length + ' 个');
      }
      drawOverlay(overlay, pageNum, null);
    });

    overlay.addEventListener('mouseleave', function () {
      if (dragStart) {
        dragStart = null;
        drawOverlay(overlay, pageNum, null);
      }
    });

    drawOverlay(overlay, pageNum, null);
    wrapper.appendChild(overlay);
  }

  async function renderPdf(arrayBuffer) {
    clearPdf();
    setStatus('加载中…');

    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      setStatus('共 ' + numPages + ' 页，渲染中…');

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        const wrapper = document.createElement('div');
        wrapper.className = 'pdf-page-wrapper';
        wrapper.dataset.page = String(pageNum);

        const label = document.createElement('span');
        label.className = 'page-label';
        label.textContent = '第 ' + pageNum + ' 页';
        wrapper.appendChild(label);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        wrapper.appendChild(canvas);
        pdfContainer.appendChild(wrapper);

        await page.render({
          canvasContext: ctx,
          viewport: viewport,
        }).promise;

        setupOverlay(wrapper, canvas, pageNum);
      }

      setStatus('已加载 ' + numPages + ' 页，可拖拽画矩形');
    } catch (err) {
      console.error(err);
      setStatus('加载失败: ' + (err.message || String(err)));
    }
  }

  fileInput.addEventListener('change', function () {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function () {
      renderPdf(reader.result);
    };
    reader.readAsArrayBuffer(file);
  });
})();
