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
  | { type: 'REORDER_IMAGES'; payload: { startIndex: number; endIndex: number } }
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
      const result = Array.from(state.images);
      const [removed] = result.splice(action.payload.startIndex, 1);
      result.splice(action.payload.endIndex, 0, removed);
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

  // Używamy referencji do przetrzymywania tymczasowych drag-indexów bez wywoływania re-renderu
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

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

          resolve({
            id: uuidv4(),
            src: outputSrc,
            width: outputWidth,
            height: outputHeight,
            dateCreated: dateCreated,
            file: file
          });
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  /**
   * --- 3. DRAG / DROP W TABELI (Reordering) ---
   */
  const handleSortDragStart = (_e: React.DragEvent<HTMLImageElement>, position: number) => {
    dragItem.current = position;
  };
 
  const handleSortDragEnter = (_e: React.DragEvent<HTMLImageElement>, position: number) => {
    dragOverItem.current = position;
  };

  const handleSortDrop = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
        dispatch({
          type: 'REORDER_IMAGES',
          payload: { startIndex: dragItem.current, endIndex: dragOverItem.current }
        });
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  /**
   * --- 4. EXPORT DO WORDA (Word Compatibility via ClipboardItem) ---
   */
  const copyToClipboard = async () => {
    if (!exportWrapperRef.current) return;

    try {
      const htmlContent = exportWrapperRef.current.innerHTML;
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
   * --- 5. GRUPOWANIE WG EXIF DATE ---
   * Silnik podziału i grupowania chronologicznego ze znalezisk w sklejacz.html i wymogów "Tolerancja czasowa"
   */
  const groupImages = () => {
    if (state.images.length === 0) return [];
    
    // Sortujemy dla pewności
    const sorted = [...state.images].sort((a,b) => a.dateCreated - b.dateCreated);
    const groups: PhotoData[][] = [];
    let currentGroup: PhotoData[] = [sorted[0]];
    const msTolerance = state.timeTolerance * 1000;

    for (let i = 1; i < sorted.length; i++) {
        const prevTime = sorted[i-1].dateCreated;
        const currTime = sorted[i].dateCreated;
        
        // Jeżeli różnica czasu między następstwem przekracza tolerancję, nowy zbiór/podział (nowy wiersz lub nowa sekcja)
        if (Math.abs(currTime - prevTime) > msTolerance) {
            groups.push(currentGroup);
            currentGroup = [sorted[i]];
        } else {
            currentGroup.push(sorted[i]);
        }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);
    return groups;
  };


  /**
   * --- 6. RENDER TABELI MAGIC (Client-side HTML for MS Word Compatibility) ---
   */
  const renderTableContent = () => {
    if (state.images.length === 0) return null;

    const cols = state.columns;
    const userScaleFactor = state.scalePercent / 100;
    
    const currentTableWidth = Math.floor(MAX_TABLE_WIDTH * userScaleFactor);
    const cellOuterWidth = Math.floor(currentTableWidth / cols);
    const contentWidth = cellOuterWidth - Math.floor(CELL_PADDING_BORDER * userScaleFactor);

    // KROK: Dzielimy posortowane obrazki na inteligentne grupy.
    // Aby spełnić wymagania "cięcia" w Wordzie, musimy po każdej grupie ewentualnie dopełnić wiersz.
    const exifGroups = groupImages();
    const rows: PhotoData[][] = [];
    
    exifGroups.forEach(group => {
       // Dla zidentyfikowanej grupy czasowej budujemy sekwencyjne wiersze i ucinamy grupę.
       for (let i = 0; i < group.length; i += cols) {
         rows.push(group.slice(i, i + cols));
       }
       // Następna grupa EXIF zawsze ląduje w nowym, pełnym wierszu pod spodem.
    });

    // Płaska lista służąca do śledzenia globalnych indexów (umożliwia Drag and Drop wewnątrz gotowego grida)
    const flatRebuiltOrder = rows.flat();

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
            // Skalowanie proporcji tak żeby wiersz trzymał równy layout w oparciu o wysokość komórek w tym wierszu
            let minHeight = Math.min(...rowImages.map(img => img.height));
            let maxScaledWidth = Math.max(...rowImages.map(img => img.width * (minHeight / img.height)));
            
            let rowTargetHeight = minHeight * userScaleFactor;
            let refMaxW = maxScaledWidth * userScaleFactor;
            
            if (refMaxW > contentWidth) {
                rowTargetHeight = rowTargetHeight * (contentWidth / refMaxW);
            }

            const finalCanvasWidth = contentWidth;
            const finalCanvasHeight = Math.round(rowTargetHeight);
            
            // Znalezienie pierwszego indexu tego wiersza z połączonej płaskiej zreogranizowanej tabeli
            const firstImgOfRow = rowImages[0];
            const globalStartIndex = flatRebuiltOrder.findIndex(img => img.id === firstImgOfRow.id);

            return (
              <tr key={rowIndex}>
                {/* Wypełnione komórki */}
                {rowImages.map((imgData, indexInRow) => {
                  return (
                    <td 
                      key={imgData.id}
                      width={cellOuterWidth} 
                      valign="middle" 
                      align="center" 
                      style={{ border: '1px solid #ccc', padding: `${Math.floor(5*userScaleFactor)}px`, width: `${cellOuterWidth}px`, maxWidth: `${cellOuterWidth}px`, overflow: 'hidden', position: 'relative' }}
                    >
                      {/* X (Usuń) - ukryte przed MS Word poprzez ignorowanie buttonów */}
                      <div contentEditable={false} style={{ userSelect: 'none', position: 'absolute', top: 2, right: 2, zIndex: 50 }}>
                         <button 
                            className="bg-red-500 hover:bg-red-600 outline-none text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                            style={{ position: 'absolute', top: 0, right: 0 }}
                            onClick={() => dispatch({ type: 'REMOVE_IMAGE', payload: imgData.id })}
                            title="Usuń ujęcie"
                         >✕</button>
                      </div>

                      <img 
                        src={imgData.src} 
                        width={finalCanvasWidth}
                        height={finalCanvasHeight}
                        style={{ display: 'block', margin: '0 auto', width: `${finalCanvasWidth}px`, height: `${finalCanvasHeight}px`, objectFit: 'contain', cursor: 'grab' }}
                        draggable
                        onDragStart={(e) => handleSortDragStart(e, globalStartIndex + indexInRow)}
                        onDragEnter={(e) => handleSortDragEnter(e, globalStartIndex + indexInRow)}
                        onDragEnd={handleSortDrop}
                        onDragOver={(e) => e.preventDefault()}
                        title="Przeciągnij, by zamienić kolejność"
                        alt="Photo"
                      />
                    </td>
                  );
                })}
                
                {/* Puste komórki dopychające siatkę wiersza, zapobiega rozciąganiu wiersza w HTML/Word */}
                {Array.from({ length: cols - rowImages.length }).map((_, emptyIndex) => (
                   <td 
                     key={`empty-${emptyIndex}`}
                     width={cellOuterWidth} 
                     style={{ border: '1px solid #ccc', padding: `${Math.floor(5*userScaleFactor)}px`, width: `${cellOuterWidth}px`, maxWidth: `${cellOuterWidth}px` }}
                   >
                     <img 
                       src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" 
                       width={finalCanvasWidth}
                       height={finalCanvasHeight}
                       style={{ display: 'block', width: `${finalCanvasWidth}px`, height: `${finalCanvasHeight}px` }}
                       alt="Empty Cell"
                     />
                   </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };


  return (
    <div className="flex flex-col lg:flex-row w-full h-full text-slate-900 bg-slate-50 font-sans">
      
      {/* 40% LEWY PANEL - DRAGZONE (Glassmorphism integration) */}
      <div className="w-full lg:w-[40%] p-8 lg:p-10 flex flex-col box-border lg:h-full bg-white/60 backdrop-blur border-r border-slate-200/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        
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

      {/* 60% PRAWY PANEL - CONTROLS & TABLE */}
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
              📋 Kopiuj Tabelę
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
                    <p className="text-sm font-medium">Brak załadowanych pakietów zdjęć po lewej stronie.</p>
                </div>
            )}
        </div>

      </div>

    </div>
  );
};

export default PhotoGenerator;
