/**
 * Step 1–4: 显示 PDF、画矩形、列表+表单、导出 JSON
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
  const exportBtn = document.getElementById('exportBtn');
  const importJsonInput = document.getElementById('importJsonInput');

  /** 已绘制的字段，每项为 { x, y, width, height, page, name, type, description } */
  const fields = [];
  /** 当前选中的字段在 fields 中的下标，-1 表示未选中 */
  let selectedIndex = -1;
  /** 每页的 overlay 引用，用于选中时重绘高亮 */
  const overlaysByPage = [];

  const HANDLE_SIZE = 8;
  const MIN_RECT_SIZE = 5;
  const CLOSE_BUTTON_SIZE = 18;
  const EDGE_TOL = 6;
  /** 当前是否在拖拽调整大小：{ fieldIndex, corner, overlay, pageNum } */
  let resizeState = null;
  /** 当前是否在拖拽移动框：{ fieldIndex, startLocalX, startLocalY, initialFieldX, initialFieldY, overlay, pageNum } */
  let moveState = null;

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
    if (resizeState) {
      document.removeEventListener('mousemove', onResizeMove);
      document.removeEventListener('mouseup', onResizeUp);
      resizeState = null;
    }
    if (moveState) {
      document.removeEventListener('mousemove', onMoveMove);
      document.removeEventListener('mouseup', onMoveUp);
      moveState = null;
    }
    renderFieldList();
    hideForm();
  }

  /** 在某一页的 overlay 上重绘所有该页的矩形 + 当前拖拽中的矩形；selectedIdx 用于高亮选中项；选中项画四角手柄 */
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

    if (selectedIdx >= 0) {
      const sel = fields[selectedIdx];
      if (sel && sel.page === pageNum) {
        const hs = HANDLE_SIZE / 2;
        ctx.fillStyle = 'rgba(255, 193, 7, 0.9)';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1;
        [[sel.x, sel.y], [sel.x + sel.width, sel.y], [sel.x, sel.y + sel.height], [sel.x + sel.width, sel.y + sel.height]].forEach(function (corner) {
          const cx = corner[0];
          const cy = corner[1];
          ctx.fillRect(cx - hs, cy - hs, HANDLE_SIZE, HANDLE_SIZE);
          ctx.strokeRect(cx - hs, cy - hs, HANDLE_SIZE, HANDLE_SIZE);
        });
        var btnX = sel.x + sel.width - CLOSE_BUTTON_SIZE - 4;
        var btnY = sel.y + 4;
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(btnX, btnY, CLOSE_BUTTON_SIZE, CLOSE_BUTTON_SIZE);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.strokeRect(btnX, btnY, CLOSE_BUTTON_SIZE, CLOSE_BUTTON_SIZE);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(btnX + 4, btnY + 4);
        ctx.lineTo(btnX + CLOSE_BUTTON_SIZE - 4, btnY + CLOSE_BUTTON_SIZE - 4);
        ctx.moveTo(btnX + CLOSE_BUTTON_SIZE - 4, btnY + 4);
        ctx.lineTo(btnX + 4, btnY + CLOSE_BUTTON_SIZE - 4);
        ctx.stroke();
      }
    }

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

  /** 若 (localX, localY) 在当前选中框的某个角柄上，返回 { corner }，否则返回 null */
  function getHandleAt(overlay, pageNum, localX, localY) {
    if (selectedIndex < 0 || selectedIndex >= fields.length) return null;
    const f = fields[selectedIndex];
    if (f.page !== pageNum) return null;
    const hs = HANDLE_SIZE / 2;
    const corners = [
      { corner: 'nw', x: f.x, y: f.y },
      { corner: 'ne', x: f.x + f.width, y: f.y },
      { corner: 'sw', x: f.x, y: f.y + f.height },
      { corner: 'se', x: f.x + f.width, y: f.y + f.height },
    ];
    for (var i = 0; i < corners.length; i++) {
      var c = corners[i];
      if (localX >= c.x - hs && localX <= c.x + hs && localY >= c.y - hs && localY <= c.y + hs) {
        return { corner: c.corner };
      }
    }
    return null;
  }

  /** 若 (localX, localY) 在当前选中框的关闭按钮内，返回 true */
  function getCloseButtonHit(overlay, pageNum, localX, localY) {
    if (selectedIndex < 0 || selectedIndex >= fields.length) return false;
    const f = fields[selectedIndex];
    if (f.page !== pageNum) return false;
    var btnX = f.x + f.width - CLOSE_BUTTON_SIZE - 4;
    var btnY = f.y + 4;
    return localX >= btnX && localX <= btnX + CLOSE_BUTTON_SIZE && localY >= btnY && localY <= btnY + CLOSE_BUTTON_SIZE;
  }

  /** 若 (localX, localY) 在当前选中框的四条边上（不含四角、不含关闭按钮），返回 true */
  function getEdgeHit(overlay, pageNum, localX, localY) {
    if (selectedIndex < 0 || selectedIndex >= fields.length) return false;
    const f = fields[selectedIndex];
    if (f.page !== pageNum) return false;
    var hs = HANDLE_SIZE / 2;
    var sel = f;
    var top = localY >= sel.y - EDGE_TOL && localY <= sel.y + EDGE_TOL && localX >= sel.x + hs && localX <= sel.x + sel.width - hs;
    var bottom = localY >= sel.y + sel.height - EDGE_TOL && localY <= sel.y + sel.height + EDGE_TOL && localX >= sel.x + hs && localX <= sel.x + sel.width - hs;
    var left = localX >= sel.x - EDGE_TOL && localX <= sel.x + EDGE_TOL && localY >= sel.y + hs && localY <= sel.y + sel.height - hs;
    var right = localX >= sel.x + sel.width - EDGE_TOL && localX <= sel.x + sel.width + EDGE_TOL && localY >= sel.y + hs && localY <= sel.y + sel.height - hs;
    return top || bottom || left || right;
  }

  /** 根据拖拽角与当前鼠标位置更新字段的 x,y,width,height */
  function applyResize(fieldIndex, corner, localX, localY) {
    const f = fields[fieldIndex];
    if (!f) return;
    var x = f.x, y = f.y, w = f.width, h = f.height;
    if (corner === 'nw') {
      x = Math.min(localX, f.x + f.width - MIN_RECT_SIZE);
      y = Math.min(localY, f.y + f.height - MIN_RECT_SIZE);
      w = f.x + f.width - x;
      h = f.y + f.height - y;
    } else if (corner === 'ne') {
      y = Math.min(localY, f.y + f.height - MIN_RECT_SIZE);
      w = Math.max(MIN_RECT_SIZE, localX - f.x);
      h = f.y + f.height - y;
    } else if (corner === 'sw') {
      x = Math.min(localX, f.x + f.width - MIN_RECT_SIZE);
      w = f.x + f.width - x;
      h = Math.max(MIN_RECT_SIZE, localY - f.y);
    } else if (corner === 'se') {
      w = Math.max(MIN_RECT_SIZE, localX - f.x);
      h = Math.max(MIN_RECT_SIZE, localY - f.y);
    }
    f.x = x;
    f.y = y;
    f.width = w;
    f.height = h;
  }

  function onResizeMove(e) {
    if (!resizeState) return;
    const { x, y } = getLocalCoords(resizeState.overlay, e.clientX, e.clientY);
    applyResize(resizeState.fieldIndex, resizeState.corner, x, y);
    drawOverlay(resizeState.overlay, resizeState.pageNum, null, selectedIndex);
  }

  function onResizeUp(e) {
    if (!resizeState) return;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeUp);
    resizeState = null;
    setStatus('已调整框大小');
  }

  function onMoveMove(e) {
    if (!moveState) return;
    const { x, y } = getLocalCoords(moveState.overlay, e.clientX, e.clientY);
    const f = fields[moveState.fieldIndex];
    if (!f) return;
    var dx = x - moveState.startLocalX;
    var dy = y - moveState.startLocalY;
    var newX = Math.max(0, Math.min(moveState.overlay.width - f.width, moveState.initialFieldX + dx));
    var newY = Math.max(0, Math.min(moveState.overlay.height - f.height, moveState.initialFieldY + dy));
    f.x = newX;
    f.y = newY;
    drawOverlay(moveState.overlay, moveState.pageNum, null, selectedIndex);
  }

  function onMoveUp(e) {
    if (!moveState) return;
    document.removeEventListener('mousemove', onMoveMove);
    document.removeEventListener('mouseup', onMoveUp);
    moveState = null;
    setStatus('已移动框');
  }

  function setupOverlay(wrapper, canvas, pageNum) {
    const overlay = document.createElement('canvas');
    overlay.className = 'pdf-overlay';
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    if (canvas.style.width) overlay.style.width = canvas.style.width;
    if (canvas.style.height) overlay.style.height = canvas.style.height;
    overlay.dataset.page = String(pageNum);

    let dragStart = null;

    overlay.addEventListener('mousedown', function (e) {
      const { x, y } = getLocalCoords(overlay, e.clientX, e.clientY);
      const handle = getHandleAt(overlay, pageNum, x, y);
      if (handle) {
        e.preventDefault();
        resizeState = { fieldIndex: selectedIndex, corner: handle.corner, overlay: overlay, pageNum: pageNum };
        document.addEventListener('mousemove', onResizeMove);
        document.addEventListener('mouseup', onResizeUp);
        return;
      }
      if (getCloseButtonHit(overlay, pageNum, x, y)) {
        e.preventDefault();
        deleteField(selectedIndex);
        return;
      }
      if (getEdgeHit(overlay, pageNum, x, y)) {
        e.preventDefault();
        var f = fields[selectedIndex];
        moveState = {
          fieldIndex: selectedIndex,
          startLocalX: x,
          startLocalY: y,
          initialFieldX: f.x,
          initialFieldY: f.y,
          overlay: overlay,
          pageNum: pageNum,
        };
        document.addEventListener('mousemove', onMoveMove);
        document.addEventListener('mouseup', onMoveUp);
        return;
      }
      dragStart = { x, y };
    });

    overlay.addEventListener('mousemove', function (e) {
      if (resizeState) return;
      if (moveState) return;
      if (!dragStart) {
        const { x, y } = getLocalCoords(overlay, e.clientX, e.clientY);
        if (getCloseButtonHit(overlay, pageNum, x, y)) {
          overlay.style.cursor = 'pointer';
        } else if (getEdgeHit(overlay, pageNum, x, y)) {
          overlay.style.cursor = 'move';
        } else {
          const handle = getHandleAt(overlay, pageNum, x, y);
          if (handle) {
            overlay.style.cursor = (handle.corner === 'nw' || handle.corner === 'se') ? 'nwse-resize' : 'nesw-resize';
          } else {
            overlay.style.cursor = 'crosshair';
          }
        }
        return;
      }
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
      if (resizeState) return;
      if (moveState) return;
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
      if (resizeState) return;
      if (moveState) return;
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

      const pixelRatio = window.devicePixelRatio || 1;
      const scale = 1.5 * pixelRatio;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale });

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
        canvas.style.width = viewport.width / pixelRatio + 'px';
        canvas.style.height = viewport.height / pixelRatio + 'px';

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
      li.classList.toggle('selected', i === selectedIndex);

      const label = document.createElement('span');
      label.className = 'field-list-label';
      label.textContent = '字段 ' + (i + 1) + (f.name ? ' · ' + f.name : '') + ' (第 ' + f.page + ' 页)';
      label.addEventListener('click', function () {
        selectField(i);
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'field-delete';
      delBtn.title = '删除';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteField(i);
      });

      li.appendChild(label);
      li.appendChild(delBtn);
      fieldListEl.appendChild(li);
    });
    exportBtn.disabled = fields.length === 0;
  }

  /** 删除指定下标的字段，并同步列表与 overlay */
  function deleteField(index) {
    if (index < 0 || index >= fields.length) return;
    fields.splice(index, 1);
    if (selectedIndex === index) {
      selectedIndex = -1;
      hideForm();
    } else if (selectedIndex > index) {
      selectedIndex--;
    }
    renderFieldList();
    redrawAllOverlays();
    setStatus('已删除，剩余 ' + fields.length + ' 个字段');
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
    var pageEl = pdfContainer.querySelector('.pdf-page-wrapper[data-page="' + String(f.page) + '"]');
    if (pageEl) {
      var overlayItem = overlaysByPage.find(function (item) { return item.pageNum === f.page; });
      if (overlayItem && overlayItem.overlay) {
        var displayedHeight = pageEl.getBoundingClientRect().height;
        var scaleY = displayedHeight / overlayItem.overlay.height;
        var boxTopInContainer = pageEl.offsetTop + f.y * scaleY;
        var targetScrollTop = boxTopInContainer - pdfContainer.clientHeight * 0.5;
        var maxScroll = pdfContainer.scrollHeight - pdfContainer.clientHeight;
        pdfContainer.scrollTo({ top: Math.max(0, Math.min(targetScrollTop, maxScroll)), behavior: 'smooth' });
      } else {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
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

  /** 按 mission 格式导出 JSON 并下载 */
  function exportJson() {
    var payload = {
      fields: fields.map(function (f) {
        return {
          name: f.name || '',
          type: f.type || 'string',
          description: f.description || '',
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          page: f.page,
        };
      }),
    };
    var json = JSON.stringify(payload, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'fields.json';
    a.click();
    URL.revokeObjectURL(url);
    setStatus('已导出 ' + fields.length + ' 个字段');
  }

  exportBtn.addEventListener('click', exportJson);

  /** 导入已保存的 JSON，替换当前字段列表；若已加载 PDF 会重绘 overlay */
  function importJson(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var payload = JSON.parse(reader.result);
        if (!payload || !Array.isArray(payload.fields)) {
          setStatus('导入失败：JSON 需包含 fields 数组');
          return;
        }
        fields.length = 0;
        payload.fields.forEach(function (item) {
          fields.push({
            x: Number(item.x) || 0,
            y: Number(item.y) || 0,
            width: Number(item.width) || 0,
            height: Number(item.height) || 0,
            page: Math.max(1, parseInt(item.page, 10) || 1),
            name: typeof item.name === 'string' ? item.name : '',
            type: typeof item.type === 'string' ? item.type : 'string',
            description: typeof item.description === 'string' ? item.description : '',
          });
        });
        selectedIndex = -1;
        hideForm();
        renderFieldList();
        redrawAllOverlays();
        setStatus('已导入 ' + fields.length + ' 个字段');
      } catch (err) {
        setStatus('导入失败：' + (err.message || String(err)));
      }
    };
    reader.readAsText(file);
  }

  importJsonInput.addEventListener('change', function () {
    var file = importJsonInput.files[0];
    if (!file) return;
    importJson(file);
    importJsonInput.value = '';
  });

  document.addEventListener('keydown', function (e) {
    if (selectedIndex < 0 || selectedIndex >= fields.length) return;
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    e.preventDefault();
    deleteField(selectedIndex);
  });
})();
