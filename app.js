/**
 * Step 1–3: 显示 PDF、画矩形、列表 + 表单填 name/type/description
 */
(function () {
  const fileInput = document.getElementById('fileInput');
  const pdfContainer = document.getElementById('pdfContainer');
  const statusEl = document.getElementById('status');
  const fieldListEl = document.getElementById('fieldList');
  const fieldFormEl = document.getElementById('fieldForm');
  const fieldNameInput = document.getElementById('fieldName');
  const fieldTypeSelect = document.getElementById('fieldType');
  const fieldDescriptionInput = document.getElementById('fieldDescription');

  /** 已绘制的字段，每项为 { x, y, width, height, page, name, type, description } */
  const fields = [];
  /** 当前选中的字段在 fields 中的下标，-1 表示未选中 */
  let selectedIndex = -1;
  /** 每页的 overlay 引用，用于选中时重绘高亮 */
  const overlaysByPage = [];

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
    overlaysByPage.length = 0;
    selectedIndex = -1;
    renderFieldList();
    hideForm();
  }

  /** 在某一页的 overlay 上重绘所有该页的矩形 + 当前拖拽中的矩形；selectedIdx 用于高亮选中项 */
  function drawOverlay(overlay, pageNum, dragRect, selectedIdx) {
    const ctx = overlay.getContext('2d');
    const w = overlay.width;
    const h = overlay.height;
    ctx.clearRect(0, 0, w, h);

    fields.forEach(function (f, idx) {
      if (f.page !== pageNum) return;
      ctx.strokeStyle = idx === selectedIdx ? 'rgba(255, 193, 7, 0.95)' : 'rgba(33, 150, 243, 0.9)';
      ctx.lineWidth = idx === selectedIdx ? 3 : 2;
      ctx.setLineDash([]);
      ctx.strokeRect(f.x, f.y, f.width, f.height);
    });

    if (dragRect) {
      ctx.strokeStyle = 'rgba(255, 152, 0, 0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(dragRect.x, dragRect.y, dragRect.width, dragRect.height);
      ctx.setLineDash([]);
    }
  }

  function redrawAllOverlays() {
    overlaysByPage.forEach(function (item) {
      drawOverlay(item.overlay, item.pageNum, null, selectedIndex);
    });
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
      drawOverlay(overlay, pageNum, dragRect, selectedIndex);
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
        fields.push({
          x: x1, y: y1, width, height, page: pageNum,
          name: '', type: 'string', description: '',
        });
        setStatus('已添加框，共 ' + fields.length + ' 个');
        renderFieldList();
        selectField(fields.length - 1);
      }
      drawOverlay(overlay, pageNum, null, selectedIndex);
    });

    overlay.addEventListener('mouseleave', function () {
      if (dragStart) {
        dragStart = null;
        drawOverlay(overlay, pageNum, null, selectedIndex);
      }
    });

    overlaysByPage.push({ overlay, pageNum });
    drawOverlay(overlay, pageNum, null, selectedIndex);
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

  function renderFieldList() {
    fieldListEl.innerHTML = '';
    fields.forEach(function (f, i) {
      const li = document.createElement('li');
      li.dataset.index = String(i);
      li.textContent = '字段 ' + (i + 1) + (f.name ? ' · ' + f.name : '') + ' (第 ' + f.page + ' 页)';
      li.classList.toggle('selected', i === selectedIndex);
      li.addEventListener('click', function () {
        selectField(i);
      });
      fieldListEl.appendChild(li);
    });
  }

  function showForm() {
    fieldFormEl.classList.remove('hidden');
  }

  function hideForm() {
    fieldFormEl.classList.add('hidden');
    fieldNameInput.value = '';
    fieldTypeSelect.value = 'string';
    fieldDescriptionInput.value = '';
  }

  function selectField(index) {
    selectedIndex = index;
    renderFieldList();
    redrawAllOverlays();
    if (index < 0) {
      hideForm();
      return;
    }
    var f = fields[index];
    fieldNameInput.value = f.name || '';
    fieldTypeSelect.value = f.type || 'string';
    fieldDescriptionInput.value = f.description || '';
    showForm();
  }

  function syncFormToField() {
    if (selectedIndex < 0 || !fields[selectedIndex]) return;
    var f = fields[selectedIndex];
    f.name = fieldNameInput.value.trim();
    f.type = fieldTypeSelect.value;
    f.description = fieldDescriptionInput.value.trim();
    renderFieldList();
  }

  fieldNameInput.addEventListener('input', syncFormToField);
  fieldNameInput.addEventListener('change', syncFormToField);
  fieldTypeSelect.addEventListener('change', syncFormToField);
  fieldDescriptionInput.addEventListener('input', syncFormToField);
  fieldDescriptionInput.addEventListener('change', syncFormToField);
})();
