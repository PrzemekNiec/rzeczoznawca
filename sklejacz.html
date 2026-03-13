<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generator Tabeli ze Zdjęciami</title>
    <style>
        :root {
            --bg-color: #F2F2F7;
            --card-bg: #FFFFFF;
            --primary: #007AFF;
            --primary-hover: #005bb5;
            --danger: #FF3B30;
            --danger-bg: #FFE5E5;
            --text-main: #1C1C1E;
            --text-muted: #8E8E93;
            --input-bg: rgba(118, 118, 128, 0.12);
            --shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
            --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
            --radius-large: 20px;
            --radius-medium: 12px;
            --radius-pill: 100px;
            --transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        /* Usunięcie domyślnego przewijania całej strony, delegacja do prawej kolumny */
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            background: var(--bg-color); 
            color: var(--text-main);
            margin: 0;
            height: 100vh;
            overflow: hidden;
        }

        /* Główny układ Split View */
        .app-layout {
            display: flex;
            height: 100vh;
            width: 100%;
            max-width: 1920px;
            margin: 0 auto;
        }

        /* Lewa Kolumna (40%) */
        .left-panel {
            width: 40%;
            padding: 40px;
            display: flex;
            flex-direction: column;
            border-right: 1px solid #E5E5EA;
            background: var(--bg-color);
            box-sizing: border-box;
            height: 100%;
        }

        #dropzone {
            background: var(--card-bg);
            border: 2px dashed #C7C7CC;
            border-radius: var(--radius-large);
            flex: 1; /* Rozciągnięcie na całą wysokość kolumny */
            text-align: center;
            color: var(--text-muted);
            font-size: 17px;
            font-weight: 500;
            transition: var(--transition);
            cursor: pointer;
            box-shadow: var(--shadow);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }

        #dropzone svg { width: 64px; height: 64px; fill: var(--primary); opacity: 0.8; transition: var(--transition); }
        #dropzone:hover, #dropzone.dragover { border-color: var(--primary); background: #F4F9FF; color: var(--primary); }
        #dropzone:hover svg, #dropzone.dragover svg { transform: translateY(-4px); opacity: 1; }

        /* Prawa Kolumna (60%) */
        .right-panel {
            width: 60%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            background: #FAFAFC;
            box-sizing: border-box;
            overflow-y: auto; /* Wewnętrzny pasek przewijania */
            position: relative;
        }

        /* Przyklejony panel sterowania */
        .controls-wrapper {
            position: sticky;
            top: 0;
            z-index: 10;
            background: rgba(250, 250, 252, 0.85);
            backdrop-filter: blur(12px); /* Efekt szkła (Glassmorphism) */
            padding: 20px 40px;
            border-bottom: 1px solid rgba(0,0,0,0.05);
        }

        .controls {
            display: flex;
            gap: 20px;
            align-items: center;
            flex-wrap: wrap;
            justify-content: space-between;
        }

        .control-group { display: flex; gap: 16px; align-items: center; }
        label { font-size: 15px; font-weight: 500; display: flex; align-items: center; gap: 8px; }

        input[type="number"] { 
            background: var(--input-bg);
            border: none;
            padding: 10px 14px; 
            width: 50px; 
            text-align: center; 
            border-radius: var(--radius-medium);
            font-size: 16px;
            font-weight: 600;
            color: var(--text-main);
            transition: var(--transition);
            outline: none;
        }

        input[type="number"]:focus { box-shadow: 0 0 0 2px var(--primary); background: var(--card-bg); }

        .button-group { display: flex; gap: 12px; }

        button {
            border: none; 
            padding: 12px 24px;
            border-radius: var(--radius-pill); 
            cursor: pointer; 
            font-weight: 600; 
            font-size: 15px;
            transition: var(--transition);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #copy-btn { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3); }
        #copy-btn:hover { background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0, 122, 255, 0.4); }
        #clear-btn { background: var(--danger-bg); color: var(--danger); }
        #clear-btn:hover { background: #FFD6D6; }

        #table-container { 
            padding: 40px; 
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        /* Kontener udający arkusz papieru */
        #export-wrapper {
            background: var(--card-bg);
            padding: 40px;
            border-radius: var(--radius-medium);
            box-shadow: var(--shadow-sm);
        }

        img.drag-over { outline: 4px solid var(--primary) !important; border-radius: 4px; }
        .word-table img { cursor: grab; transition: opacity 0.2s; }
        .word-table img:active { cursor: grabbing; opacity: 0.5; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { opacity: 1; }

        /* Media Query dla mniejszych ekranów (np. poniżej 1000px) */
        @media (max-width: 1000px) {
            body { height: auto; overflow: auto; }
            .app-layout { flex-direction: column; height: auto; }
            .left-panel { width: 100%; height: 350px; padding: 20px; border-right: none; border-bottom: 1px solid #E5E5EA; }
            .right-panel { width: 100%; height: auto; overflow: visible; }
            .controls-wrapper { padding: 20px; }
            #table-container { padding: 20px; }
        }
    </style>
</head>
<body>

    <div class="app-layout">
        
        <div class="left-panel">
            <div id="dropzone">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                </svg>
                <span id="dropzone-text">Przeciągnij i upuść tutaj zdjęcia (.jpg, .png)</span>
            </div>
        </div>

        <div class="right-panel">
            <div class="controls-wrapper">
                <div class="controls">
                    <div class="control-group">
                        <label>Kolumny: <input type="number" id="columns-count" value="2" min="1" max="10"></label>
                        <label>Skala (%): <input type="number" id="scale-percent" value="100" min="10" max="200" step="10"></label>
                    </div>
                    <div class="button-group">
                        <button id="clear-btn">Wyczyść</button>
                        <button id="copy-btn">Kopiuj do Worda</button>
                    </div>
                </div>
            </div>

            <div id="table-container"></div>
        </div>

    </div>

    <script>
        let imagesData = [];
        const dropzone = document.getElementById('dropzone');
        const dropzoneText = document.getElementById('dropzone-text');
        const tableContainer = document.getElementById('table-container');
        const columnsInput = document.getElementById('columns-count');
        const scaleInput = document.getElementById('scale-percent');

        // Stałe bazowe (format A4)
        const MAX_TABLE_WIDTH = 600; 
        const CELL_PADDING_BORDER = 12;

        dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });

        columnsInput.addEventListener('change', renderTable);
        document.getElementById('clear-btn').addEventListener('click', () => { imagesData = []; renderTable(); });
        document.getElementById('copy-btn').addEventListener('click', copyTableToClipboard);

        let debounceTimer;
        scaleInput.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(renderTable, 300); });

        function handleFiles(files) {
            let filesArray = Array.from(files).filter(f => f.type.match('image/(jpeg|png)'));
            if (filesArray.length === 0) return;

            dropzoneText.textContent = `Wczytywanie ${filesArray.length} zdjęć...`;
            let loadedCount = 0;
            let newImages = [];

            filesArray.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        newImages.push({ 
                            src: event.target.result, 
                            width: img.width, 
                            height: img.height, 
                            lastModified: file.lastModified,
                            imgObj: img 
                        });
                        loadedCount++;
                        
                        if (loadedCount === filesArray.length) {
                            dropzoneText.textContent = 'Przeciągnij i upuść tutaj zdjęcia (.jpg, .png)';
                            newImages.sort((a, b) => a.lastModified - b.lastModified);
                            imagesData = imagesData.concat(newImages);
                            renderTable();
                        }
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            });
        }

        function renderTable() {
            tableContainer.innerHTML = '';
            if (imagesData.length === 0) return;

            const cols = parseInt(columnsInput.value, 10) || 2;
            const userScaleFactor = (parseInt(scaleInput.value, 10) || 100) / 100;
            
            const currentTableWidth = Math.floor(MAX_TABLE_WIDTH * userScaleFactor);
            const cellOuterWidth = Math.floor(currentTableWidth / cols);
            const contentWidth = cellOuterWidth - Math.floor(CELL_PADDING_BORDER * userScaleFactor);

            const exportWrapper = document.createElement('div');
            exportWrapper.id = 'export-wrapper';

            const table = document.createElement('table');
            table.className = 'word-table';
            table.setAttribute('width', currentTableWidth);
            table.setAttribute('cellspacing', '0');
            table.setAttribute('cellpadding', '0');
            table.setAttribute('style', `border-collapse: collapse; width: ${currentTableWidth}px; max-width: ${currentTableWidth}px; table-layout: fixed; margin: 0; background: #FFF;`);
            
            const tbody = document.createElement('tbody');

            for (let i = 0; i < imagesData.length; i += cols) {
                const rowImages = imagesData.slice(i, i + cols);
                const tr = document.createElement('tr');
                
                let minHeight = Math.min(...rowImages.map(img => img.height));
                let maxScaledWidth = Math.max(...rowImages.map(img => img.width * (minHeight / img.height)));
                
                let rowTargetHeight = minHeight * userScaleFactor;
                let refMaxW = maxScaledWidth * userScaleFactor;
                
                if (refMaxW > contentWidth) {
                    rowTargetHeight = rowTargetHeight * (contentWidth / refMaxW);
                }

                const finalCanvasWidth = contentWidth;
                const finalCanvasHeight = Math.round(rowTargetHeight);

                rowImages.forEach((imgData, indexInRow) => {
                    const td = document.createElement('td');
                    td.setAttribute('width', cellOuterWidth);
                    td.setAttribute('valign', 'middle');
                    td.setAttribute('align', 'center');
                    td.setAttribute('style', `border: 1px solid #ccc; padding: ${Math.floor(5*userScaleFactor)}px; width: ${cellOuterWidth}px; max-width: ${cellOuterWidth}px; overflow: hidden;`);

                    const imgW = Math.round(imgData.width * (rowTargetHeight / (imgData.height * userScaleFactor)));
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = finalCanvasWidth;
                    canvas.height = finalCanvasHeight;
                    const ctx = canvas.getContext('2d');
                    
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, finalCanvasWidth, finalCanvasHeight);
                    
                    const dx = Math.round((finalCanvasWidth - imgW) / 2);
                    ctx.drawImage(imgData.imgObj, dx, 0, imgW, finalCanvasHeight);
                    
                    const processedSrc = canvas.toDataURL('image/jpeg', 0.9);

                    const imgElement = document.createElement('img');
                    imgElement.src = processedSrc;
                    imgElement.setAttribute('width', finalCanvasWidth);
                    imgElement.setAttribute('height', finalCanvasHeight);
                    imgElement.setAttribute('style', `display: block; margin: 0 auto; width: ${finalCanvasWidth}px; height: ${finalCanvasHeight}px;`);
                    
                    imgElement.draggable = true;
                    imgElement.dataset.index = i + indexInRow;
                    
                    imgElement.addEventListener('dragstart', handleImageDragStart);
                    imgElement.addEventListener('dragover', handleImageDragOver);
                    imgElement.addEventListener('dragleave', handleImageDragLeave);
                    imgElement.addEventListener('drop', handleImageDrop);

                    td.appendChild(imgElement);
                    tr.appendChild(td);
                });

                while (tr.children.length < cols) {
                    const td = document.createElement('td');
                    td.setAttribute('width', cellOuterWidth);
                    td.setAttribute('style', `border: 1px solid #ccc; padding: ${Math.floor(5*userScaleFactor)}px; width: ${cellOuterWidth}px; max-width: ${cellOuterWidth}px;`);
                    
                    const emptyCanvas = document.createElement('canvas');
                    emptyCanvas.width = finalCanvasWidth;
                    emptyCanvas.height = finalCanvasHeight;
                    const eCtx = emptyCanvas.getContext('2d');
                    eCtx.fillStyle = '#FFFFFF';
                    eCtx.fillRect(0, 0, finalCanvasWidth, finalCanvasHeight);
                    
                    const emptyImg = document.createElement('img');
                    emptyImg.src = emptyCanvas.toDataURL('image/jpeg', 0.1);
                    emptyImg.setAttribute('width', finalCanvasWidth);
                    emptyImg.setAttribute('height', finalCanvasHeight);
                    emptyImg.setAttribute('style', `display: block; width: ${finalCanvasWidth}px; height: ${finalCanvasHeight}px;`);
                    
                    td.appendChild(emptyImg);
                    tr.appendChild(td);
                }

                tbody.appendChild(tr);
            }

            table.appendChild(tbody);
            exportWrapper.appendChild(table);
            tableContainer.appendChild(exportWrapper);
        }

        let draggedImageIndex = null;

        function handleImageDragStart(e) { draggedImageIndex = parseInt(e.target.dataset.index, 10); e.dataTransfer.effectAllowed = 'move'; }
        function handleImageDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if(e.target.dataset.index) e.target.classList.add('drag-over'); }
        function handleImageDragLeave(e) { e.target.classList.remove('drag-over'); }

        function handleImageDrop(e) {
            e.preventDefault();
            e.target.classList.remove('drag-over');
            const targetIndex = parseInt(e.target.dataset.index, 10);
            
            if (draggedImageIndex !== null && !isNaN(targetIndex) && draggedImageIndex !== targetIndex) {
                const draggedItem = imagesData.splice(draggedImageIndex, 1)[0];
                imagesData.splice(targetIndex, 0, draggedItem);
                renderTable();
            }
            draggedImageIndex = null;
        }

        async function copyTableToClipboard() {
            const wrapper = document.getElementById('export-wrapper');
            if (!wrapper || wrapper.children.length === 0) return; 

            const btn = document.getElementById('copy-btn');
            const originalText = btn.textContent;
            
            try {
                const htmlContent = wrapper.innerHTML;
                const blobHtml = new Blob([htmlContent], { type: 'text/html' });
                const clipboardItem = new ClipboardItem({ 'text/html': blobHtml });
                
                await navigator.clipboard.write([clipboardItem]);
                
                btn.textContent = "Skopiowano!";
                btn.style.background = "#34C759";
                setTimeout(() => { btn.textContent = originalText; btn.style.background = ""; }, 2000);

            } catch (err) {
                console.error('Błąd podczas kopiowania:', err);
                alert('Wystąpił błąd podczas kopiowania. Upewnij się, że używasz bezpiecznego środowiska (lub dysku lokalnego).');
            }
        }
    </script>
</body>
</html>