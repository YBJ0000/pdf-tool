/**
 * Step 1: 在浏览器里用 PDF.js 显示 PDF
 */
(function () {
  const fileInput = document.getElementById('fileInput');
  const pdfContainer = document.getElementById('pdfContainer');
  const statusEl = document.getElementById('status');

  // 使用 CDN 时必须设置 worker，否则控制台会有警告
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function clearPdf() {
    pdfContainer.innerHTML = '';
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
      }

      setStatus('已加载 ' + numPages + ' 页');
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
