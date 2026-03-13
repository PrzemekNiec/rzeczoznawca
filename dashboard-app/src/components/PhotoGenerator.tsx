import React, { useReducer, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import exifr from 'exifr';
import { Image as ImageIcon } from 'lucide-react';

/**
 * --- T Y P Y ---
 */

export interface PhotoData {
  id: string;
  src: string;
  width: number;
  height: number;
  dateCreated: number;
  file: File;
  imgObj: HTMLImageElement;
}

export interface PhotoState {
  images: PhotoData[];
  columns: number;
  scalePercent: number;
  isLoading: boolean;
  timeTolerance: number; 
}

type PhotoAction =
  | { type: 'ADD_IMAGES'; payload: PhotoData[] }
  | { type: 'CLEAR_IMAGES' }
  | { type: 'SET_COLUMNS'; payload: number }
  | { type: 'SET_SCALE'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'REORDER_IMAGES'; payload: { dragId: string; dropId: string } }
  | { type: 'REMOVE_IMAGE'; payload: string }
  | { type: 'SET_TOLERANCE'; payload: number };

/**
 * --- R E D U C E R ---
 */

const initialState: PhotoState = {
  images: [],
  columns: 2,
  scalePercent: 100,
  isLoading: false,
  timeTolerance: 60, // 60 sekund domyślnie
};

function photoReducer(state: PhotoState, action: PhotoAction): PhotoState {
  switch (action.type) {
    case 'ADD_IMAGES':
      // Sortowanie po dateCreated - odczytanym precyzyjniej z EXIF
      const sortedNew = [...state.images, ...action.payload].sort((a, b) => a.dateCreated - b.dateCreated);
      return { ...state, images: sortedNew };
    case 'CLEAR_IMAGES':
      return { ...state, images: [] };
    case 'SET_COLUMNS':
      return { ...state, columns: action.payload };
    case 'SET_SCALE':
      return { ...state, scalePercent: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'REORDER_IMAGES': {
      const { dragId, dropId } = action.payload;
      const result = Array.from(state.images);
      const dragIdx = result.findIndex(img => img.id === dragId);
      const dropIdx = result.findIndex(img => img.id === dropId);
      if (dragIdx === -1 || dropIdx === -1) return state;
      const [removed] = result.splice(dragIdx, 1);
      result.splice(dropIdx, 0, removed);
      return { ...state, images: result };
    }
    case 'REMOVE_IMAGE':
      return { ...state, images: state.images.filter(img => img.id !== action.payload) };
    case 'SET_TOLERANCE':
      return { ...state, timeTolerance: action.payload };
    default:
      return state;
  }
}

/**
 * --- K O M P O N E N T ---
 */

// Stałe bazowe formatu A4 w MS Word, jak w tradycyjnym sklejacz.html
const MAX_TABLE_WIDTH = 600;
const CELL_PADDING_BORDER = 12;

export const PhotoGenerator: React.FC = () => {
  const [state, dispatch] = useReducer(photoReducer, initialState);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  
  // Referencja na właściwy kontener tabeli żeby móc ją skopiować (ClipboardItem)
  const exportWrapperRef = useRef<HTMLDivElement>(null);

  const dragItemId = useRef<string | null>(null);
  const dragOverItemId = useRef<string | null>(null);

  /**
   * --- 1. HANDLE FILES & EXIF & RESIZE ---
   */
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => f.type.match('image/(jpeg|png|webp)'));
    if (validFiles.length === 0) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    const newPhotos: PhotoData[] = [];

    for (const file of validFiles) {
      try {
        const photoData = await processImageFile(file);
        newPhotos.push(photoData);
      } catch (err) {
        console.error(`Nie udało się przetworzyć pliku: ${file.name}`, err);
      }
    }

    dispatch({ type: 'ADD_IMAGES', payload: newPhotos });
    dispatch({ type: 'SET_LOADING', payload: false });
  }, []);

  const processImageFile = async (file: File): Promise<PhotoData> => {
    // 1. Ekstrakcja Data Zrobienia (DateTimeOriginal) używając exifr dla 100% pewności
    let dateCreated = file.lastModified; 
    try {
        // Zoptymalizowane parsowanie EXIF (tylko meta)
        const exifData = await exifr.parse(file, { pick: ['DateTimeOriginal'], tiff: true });
        if (exifData && exifData.DateTimeOriginal) {
            dateCreated = exifData.DateTimeOriginal.getTime();
        }
    } catch (e) {
        console.warn("Brak EXIF, używam modified fallback", e);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let outputSrc = e.target?.result as string;
          let outputWidth = img.width;
          let outputHeight = img.height;

          // Optymalizacja rozmiaru (wczesny resize na Canvas dla dużych wag)
          const MAX_DIMENSION = 3000;
          if (file.size > 10 * 1024 * 1024 || img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
             const scaleRate = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height);
             if(scaleRate < 1) {
               const canvas = document.createElement('canvas');
               canvas.width = img.width * scaleRate;
               canvas.height = img.height * scaleRate;
               const ctx = canvas.getContext('2d');
               if(ctx) {
                 ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                 outputSrc = canvas.toDataURL('image/jpeg', 0.9);
                 outputWidth = canvas.width;
                 outputHeight = canvas.height;
               }
             }
          }

          // Jeśli był resize, przeładuj img z nowym src
          if (outputSrc !== e.target?.result) {
            const resizedImg = new Image();
            resizedImg.onload = () => {
              resolve({
                id: uuidv4(), src: outputSrc, width: outputWidth, height: outputHeight,
                dateCreated, file, imgObj: resizedImg
              });
            };
            resizedImg.src = outputSrc;
          } else {
            resolve({
              id: uuidv4(), src: outputSrc, width: outputWidth, height: outputHeight,
              dateCreated, file, imgObj: img
            });
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /**
   * --- 2. DRAG / DROP STREFY GŁÓWNEJ ---
   */
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dropzoneRef.current) dropzoneRef.current.classList.add('bg-blue-50/50', 'border-blue-500');
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dropzoneRef.current) dropzoneRef.current.classList.remove('bg-blue-50/50', 'border-blue-500');
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dropzoneRef.current) dropzoneRef.current.classList.remove('bg-blue-50/50', 'border-blue-500');
    // Ignoruj reorder dragi z tabeli
    if (e.dataTransfer.types.includes('application/x-reorder')) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  /**
   * --- 3. DRAG / DROP W TABELI (Reordering) ---
   */
  const handleSortDragStart = (e: React.DragEvent<HTMLTableCellElement>, id: string) => {
    dragItemId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-reorder', id);
  };

  const handleSortDragOver = (e: React.DragEvent<HTMLTableCellElement>, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverItemId.current = id;
  };

  const handleSortDrop = (e: React.DragEvent<HTMLTableCellElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragItemId.current && dragOverItemId.current && dragItemId.current !== dragOverItemId.current) {
        dispatch({
          type: 'REORDER_IMAGES',
          payload: { dragId: dragItemId.current, dropId: dragOverItemId.current }
        });
    }
    dragItemId.current = null;
    dragOverItemId.current = null;
  };

  /**
   * --- 4. EXPORT DO WORDA (Word Compatibility via ClipboardItem) ---
   */
  const copyToClipboard = async () => {
    if (!exportWrapperRef.current) return;

    try {
      // Klonujemy DOM, usuwamy przyciski (krzyżyki) żeby nie trafiły do Worda
      const clone = exportWrapperRef.current.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('button').forEach(btn => btn.remove());

      const htmlContent = clone.innerHTML;
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({ 'text/html': blobHtml });

      await navigator.clipboard.write([clipboardItem]);
      alert('Skopiowano tabelę ze zdjęciami do schowka! Możesz teraz wkleić (Ctrl+V) w MS Word.');
    } catch (err) {
      console.error('Błąd kopiowania:', err);
      alert('Nie udało się skopiować zawartości. Upewnij się, że używasz przeglądarki ze wsparciem ClipboardItem.');
    }
  };



  /**
   * --- 6. CANVAS RENDERING (identycznie jak sklejacz.html) ---
   * Rysuje obrazek na Canvas z białym tłem, centruje, eksportuje jako JPEG dataURL.
   * Dzięki temu Word dostaje gotowe bitmapy zamiast CSS object-fit.
   */
  const renderCanvasImage = (imgData: PhotoData, targetWidth: number, targetHeight: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return imgData.src;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Używamy pre-loaded imgObj (jak sklejacz.html) — synchroniczny drawImage
    const scale = Math.min(targetWidth / imgData.width, targetHeight / imgData.height);
    const drawW = Math.round(imgData.width * scale);
    const drawH = Math.round(imgData.height * scale);
    const dx = Math.round((targetWidth - drawW) / 2);
    const dy = Math.round((targetHeight - drawH) / 2);

    ctx.drawImage(imgData.imgObj, dx, dy, drawW, drawH);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const renderEmptyCell = (width: number, height: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.1);
  };

  /**
   * --- 7. RENDER TABELI (Word-compatible Canvas output) ---
   */
  const renderTableContent = () => {
    if (state.images.length === 0) return null;

    const cols = state.columns;
    const userScaleFactor = state.scalePercent / 100;

    const currentTableWidth = Math.floor(MAX_TABLE_WIDTH * userScaleFactor);
    const cellOuterWidth = Math.floor(currentTableWidth / cols);
    const contentWidth = cellOuterWidth - Math.floor(CELL_PADDING_BORDER * userScaleFactor);

    // Sekwencyjne wypełnianie wierszy — kolejność z state (umożliwia ręczny reorder)
    const rows: PhotoData[][] = [];
    for (let i = 0; i < state.images.length; i += cols) {
      rows.push(state.images.slice(i, i + cols));
    }

    return (
      <table
        className="word-table"
        width={currentTableWidth}
        cellSpacing="0"
        cellPadding="0"
        style={{ borderCollapse: 'collapse', width: `${currentTableWidth}px`, maxWidth: `${currentTableWidth}px`, tableLayout: 'fixed', margin: '0', background: '#FFF' }}
      >
        <tbody>
          {rows.map((rowImages, rowIndex) => {
            let minHeight = Math.min(...rowImages.map(img => img.height));
            let maxScaledWidth = Math.max(...rowImages.map(img => img.width * (minHeight / img.height)));

            let rowTargetHeight = minHeight * userScaleFactor;
            let refMaxW = maxScaledWidth * userScaleFactor;

            if (refMaxW > contentWidth) {
                rowTargetHeight = rowTargetHeight * (contentWidth / refMaxW);
            }

            const finalCanvasWidth = contentWidth;
            const finalCanvasHeight = Math.round(rowTargetHeight);

            return (
              <tr key={rowIndex}>
                {rowImages.map((imgData) => {
                  const processedSrc = renderCanvasImage(imgData, finalCanvasWidth, finalCanvasHeight);
                  return (
                    <td
                      key={imgData.id}
                      width={cellOuterWidth}
                      valign="middle"
                      align="center"
                      className="group/cell"
                      draggable
                      onDragStart={(e) => handleSortDragStart(e, imgData.id)}
                      onDragOver={(e) => handleSortDragOver(e, imgData.id)}
                      onDrop={(e) => handleSortDrop(e)}
                      style={{ border: '1px solid #ccc', padding: `${Math.floor(5*userScaleFactor)}px`, width: `${cellOuterWidth}px`, maxWidth: `${cellOuterWidth}px`, overflow: 'hidden', position: 'relative', cursor: 'grab' }}
                    >
                      <button
                        className="absolute top-1 right-1 z-50 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity text-xs font-bold cursor-pointer border-none outline-none shadow-md"
                        onClick={() => dispatch({ type: 'REMOVE_IMAGE', payload: imgData.id })}
                        title="Usuń ujęcie"
                      >✕</button>

                      <img
                        src={processedSrc}
                        width={finalCanvasWidth}
                        height={finalCanvasHeight}
                        style={{ display: 'block', margin: '0 auto', width: `${finalCanvasWidth}px`, height: `${finalCanvasHeight}px` }}
                        draggable={false}
                        title="Przeciągnij komórkę, by zamienić kolejność"
                        alt="Photo"
                      />
                    </td>
                  );
                })}

                {Array.from({ length: cols - rowImages.length }).map((_, emptyIndex) => {
                  const emptySrc = renderEmptyCell(finalCanvasWidth, finalCanvasHeight);
                  return (
                   <td
                     key={`empty-${emptyIndex}`}
                     width={cellOuterWidth}
                     style={{ border: '1px solid #ccc', padding: `${Math.floor(5*userScaleFactor)}px`, width: `${cellOuterWidth}px`, maxWidth: `${cellOuterWidth}px` }}
                   >
                     <img
                       src={emptySrc}
                       width={finalCanvasWidth}
                       height={finalCanvasHeight}
                       style={{ display: 'block', width: `${finalCanvasWidth}px`, height: `${finalCanvasHeight}px` }}
                       alt="Empty Cell"
                     />
                   </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };


  return (
    <div className="flex flex-col lg:flex-row w-full h-full text-slate-900 bg-slate-50 font-sans">

      {/* 60% LEWY PANEL - CONTROLS & TABLE */}
      <div className="w-full flex-1 flex flex-col bg-slate-50/50 box-border relative lg:h-full overflow-y-auto isolate">

        {/* Przezroczysty, przyklejony panel górny (Glassmorphism Sticky) */}
        <div className="sticky top-0 z-20 px-8 py-5 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl flex flex-wrap gap-5 items-center justify-between shadow-sm">

          <div className="flex flex-wrap gap-6 items-center flex-1">
            <label className="font-semibold text-sm text-slate-600 flex items-center gap-3">
              Kolumny
              <input
                type="number"
                min="1" max="10"
                value={state.columns}
                onChange={(e) => dispatch({ type: 'SET_COLUMNS', payload: parseInt(e.target.value) || 2 })}
                className="w-16 p-2 rounded-lg bg-slate-100 border border-slate-200 font-bold focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:bg-white outline-none transition-all text-center"
              />
            </label>
            <label className="font-semibold text-sm text-slate-600 flex items-center gap-3">
              Skala (%)
              <input
                type="number"
                min="10" max="200" step="10"
                value={state.scalePercent}
                onChange={(e) => dispatch({ type: 'SET_SCALE', payload: parseInt(e.target.value) || 100 })}
                className="w-20 p-2 rounded-lg bg-slate-100 border border-slate-200 font-bold focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:bg-white outline-none transition-all text-center"
              />
            </label>
             <label className="font-semibold text-sm text-slate-600 flex items-center gap-3">
              Odstęp Grupowania (s)
              <input
                type="number"
                min="5" max="3600" step="5"
                value={state.timeTolerance}
                onChange={(e) => dispatch({ type: 'SET_TOLERANCE', payload: parseInt(e.target.value) || 60 })}
                title="Tolerancja chronologiczna pomiędzy ujęciami kwalifikująca ją do nowej gry eksportu"
                className="w-20 p-2 rounded-lg bg-slate-100 border border-slate-200 font-bold focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:bg-white outline-none transition-all text-center"
              />
            </label>
          </div>

          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => dispatch({ type: 'CLEAR_IMAGES' })}
              title="Wyczyść wszystkie (W)"
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-red-500 bg-red-50 hover:bg-red-100 transition-all border border-red-100"
            >
              Wyczyść
            </button>
            <button
              onClick={copyToClipboard}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 shadow-[0_4px_12px_rgba(147,51,234,0.3)] hover:shadow-[0_6px_16px_rgba(147,51,234,0.4)] transition-all hover:-translate-y-px"
            >
              Kopiuj Tabelę
            </button>
          </div>
        </div>

        {/* MIEJSCE GENEROWANIA TABELI HTML */}
        <div className="flex-1 p-8 lg:p-12 flex flex-col items-center">
            {state.images.length > 0 ? (
                <div
                  id="export-wrapper"
                  ref={exportWrapperRef}
                  className="bg-white p-12 rounded-2xl shadow-lg border border-slate-200/60 overflow-x-auto w-auto min-w-[680px]"
                >
                  {renderTableContent()}
                </div>
            ) : (
                <div className="my-auto mb-32 flex flex-col justify-center items-center text-slate-400">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
                    <h3 className="font-semibold text-xl text-slate-500 mb-1">Pusta matryca podglądu</h3>
                    <p className="text-sm font-medium">Wrzuć zdjęcia po prawej stronie.</p>
                </div>
            )}
        </div>

      </div>

      {/* 40% PRAWY PANEL - DROPZONE */}
      <div className="w-full lg:w-[40%] p-8 lg:p-10 flex flex-col box-border lg:h-full bg-white/60 backdrop-blur border-l border-slate-200/50 shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10">

        <h2 className="text-xl font-bold text-purple-600 mb-6 tracking-tight">Generator Zdjęć</h2>

        <div
          ref={dropzoneRef}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className="flex-1 bg-white/80 border-2 border-dashed border-slate-300 rounded-3xl shadow-sm flex flex-col items-center justify-center p-8 text-slate-500 transition-all duration-300 hover:bg-purple-50/50 hover:border-purple-400 hover:text-purple-600 cursor-pointer gap-5 text-center min-h-[400px]"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          {state.isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-purple-600"></div>
              <span className="font-semibold text-purple-600">Przetwarzanie ujęć...</span>
            </div>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 transition-colors duration-300 group-hover:bg-purple-100 group-hover:text-purple-600">
                  <svg className="w-10 h-10 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                  </svg>
              </div>
              <div>
                <span className="block font-bold text-lg text-slate-700 mb-1">Przeciągnij pliki zdjęć</span>
                <span className="text-sm font-medium">(.jpg, .png) lub kliknij by wybrać folder</span>
              </div>
            </>
          )}
          <input
            id="file-upload"
            type="file"
            multiple
            accept="image/jpeg, image/png, image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
            }}
          />
        </div>

        {/* Helper text o dzialaniu */}
        <div className="mt-6 p-4 bg-slate-100/50 rounded-2xl text-xs font-medium text-slate-500 border border-slate-200 border-dashed text-justify leading-relaxed">
           Moduł automatycznie uporządkuje wrzucone ujęcia wykorzystując meta-dane daty i godziny (EXIF). Automatyczne cięcie grup wynosi obecnie: <strong>{state.timeTolerance} sek.</strong>
        </div>

      </div>

    </div>
  );
};

export default PhotoGenerator;
