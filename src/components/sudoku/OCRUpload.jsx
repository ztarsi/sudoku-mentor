import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Loader2, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function OCRUpload({ onClose, onPuzzleExtracted, embedded = false }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'
  const [message, setMessage] = useState('');
  const [puzzleName, setPuzzleName] = useState(() => {
    const now = new Date();
    return `OCR Puzzle ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  });
  const [extractedGrid, setExtractedGrid] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === 'image/png' || selectedFile.type === 'image/jpeg')) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setStatus(null);
      setMessage('');
    } else {
      setStatus('error');
      setMessage('Please select a PNG or JPG image.');
    }
  };

  const handleUploadAndExtract = async () => {
    if (!file) return;

    setIsProcessing(true);
    setStatus(null);
    setMessage('');

    try {
      // Step 1: Upload the file
      setMessage('Uploading image...');
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      if (!uploadResult.file_url) {
        throw new Error('Failed to upload file');
      }

      // Step 2: Extract Sudoku grid using OCR
      setMessage('Analyzing puzzle with OCR...');
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadResult.file_url,
        json_schema: {
          type: 'object',
          properties: {
            grid: {
              type: 'array',
              items: { type: 'integer', minimum: 0, maximum: 9 },
              minItems: 81,
              maxItems: 81,
              description: 'A flat array of 81 integers (0-9), where 0 represents empty cells'
            }
          },
          required: ['grid']
        }
      });

      if (extractResult.status === 'success' && extractResult.output?.grid) {
        const grid = extractResult.output.grid;
        
        // Validate grid
        if (grid.length === 81 && grid.every(n => n >= 0 && n <= 9)) {
          setStatus('success');
          setMessage('Puzzle extracted! Please verify and correct if needed.');
          setExtractedGrid(grid);
          setIsVerifying(true);
        } else {
          throw new Error('Invalid grid format received');
        }
      } else {
        throw new Error(extractResult.details || 'Failed to extract puzzle from image');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to process image. Please ensure the Sudoku puzzle is clearly visible and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCellEdit = (index, value) => {
    const newGrid = [...extractedGrid];
    newGrid[index] = value;
    setExtractedGrid(newGrid);
  };

  const handleConfirmExtraction = () => {
    onPuzzleExtracted(extractedGrid, puzzleName);
    onClose();
  };

  const handleRetry = () => {
    setExtractedGrid(null);
    setIsVerifying(false);
    setStatus(null);
    setMessage('');
    setSelectedCell(null);
  };

  const handleKeyDown = (e) => {
    if (!isVerifying || selectedCell === null) return;

    if (e.key >= '1' && e.key <= '9') {
      handleCellEdit(selectedCell, parseInt(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      handleCellEdit(selectedCell, 0);
    } else if (e.key === 'ArrowUp' && selectedCell >= 9) {
      setSelectedCell(selectedCell - 9);
    } else if (e.key === 'ArrowDown' && selectedCell < 72) {
      setSelectedCell(selectedCell + 9);
    } else if (e.key === 'ArrowLeft' && selectedCell % 9 !== 0) {
      setSelectedCell(selectedCell - 1);
    } else if (e.key === 'ArrowRight' && selectedCell % 9 !== 8) {
      setSelectedCell(selectedCell + 1);
    }
  };

  React.useEffect(() => {
    if (isVerifying) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVerifying, selectedCell, extractedGrid]);

  if (embedded) {
    // Verification view
    if (isVerifying && extractedGrid) {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-white font-medium mb-2">Verify Extracted Puzzle</h3>
            <p className="text-slate-400 text-sm">Compare with the original image and correct any errors</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Original Image */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Original Image</label>
              <div className="bg-slate-800 rounded-lg overflow-hidden">
                <img src={preview} alt="Original puzzle" className="w-full h-auto" />
              </div>
            </div>

            {/* Editable Grid */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Extracted Grid (click to edit)</label>
              <div className="bg-slate-800 rounded-lg p-3">
                <div 
                  className="grid grid-cols-9 gap-0 bg-slate-600 rounded"
                  style={{ border: '2px solid #475569' }}
                >
                  {extractedGrid.map((value, index) => {
                    const row = Math.floor(index / 9);
                    const col = index % 9;
                    const borderRight = (col + 1) % 3 === 0 && col !== 8 ? 'border-r-2' : 'border-r';
                    const borderBottom = (row + 1) % 3 === 0 && row !== 8 ? 'border-b-2' : 'border-b';
                    
                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedCell(index)}
                        className={`
                          w-full aspect-square text-center font-bold text-base
                          border-slate-600 ${borderRight} ${borderBottom}
                          transition-all
                          ${selectedCell === index 
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400' 
                            : value === 0 
                              ? 'bg-slate-900 text-slate-600 hover:bg-slate-800' 
                              : 'bg-slate-900 text-blue-400 hover:bg-slate-800'
                          }
                        `}
                      >
                        {value === 0 ? '·' : value}
                      </button>
                    );
                  })}
                </div>
                <p className="text-slate-400 text-xs mt-2 text-center">
                  Use arrow keys to navigate • Press 1-9 to enter digit • Delete/Backspace to clear
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Puzzle Name
            </label>
            <input
              type="text"
              value={puzzleName}
              onChange={(e) => setPuzzleName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="px-4 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all"
            >
              Start Over
            </button>
            <button
              onClick={handleConfirmExtraction}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-lg hover:shadow-lg transition-all"
            >
              Confirm & Load Puzzle
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-slate-400 text-center">Upload an image of a Sudoku puzzle for automatic extraction</p>
        
        {!preview ? (
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center hover:border-blue-500 transition-all bg-slate-800/50">
              <Camera className="w-16 h-16 mx-auto mb-4 text-slate-500" />
              <p className="text-white font-medium mb-2">Click to upload an image</p>
              <p className="text-sm text-slate-400">PNG, JPG up to 10MB</p>
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-slate-800">
              <img src={preview} alt="Selected puzzle" className="w-full h-auto" />
            </div>
            
            {message && (
              <div className={`p-4 rounded-lg ${
                status === 'error' ? 'bg-red-900/20 text-red-400' : 'bg-blue-900/20 text-blue-400'
              }`}>
                {message}
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setStatus(null);
                  setMessage('');
                }}
                className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadAndExtract}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Extract Puzzle'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">OCR Upload</h2>
                <p className="text-sm text-slate-500">Extract puzzle from image</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Upload Area */}
          {!preview ? (
            <label className="block">
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-slate-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-slate-700">Click to upload image</p>
                    <p className="text-sm text-slate-500 mt-1">PNG or JPG up to 10MB</p>
                  </div>
                </div>
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-100">
                <img
                  src={preview}
                  alt="Sudoku puzzle"
                  className="w-full h-64 object-contain"
                />
                {!isProcessing && (
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                      setStatus(null);
                      setMessage('');
                    }}
                    className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-600" />
                  </button>
                )}
              </div>

              {/* Status Messages */}
              <AnimatePresence mode="wait">
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`
                      flex items-center gap-3 p-4 rounded-xl
                      ${status === 'success' ? 'bg-emerald-50 text-emerald-700' : ''}
                      ${status === 'error' ? 'bg-red-50 text-red-700' : ''}
                      ${!status ? 'bg-blue-50 text-blue-700' : ''}
                    `}
                  >
                    {isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
                    {status === 'success' && <CheckCircle className="w-5 h-5" />}
                    {status === 'error' && <AlertCircle className="w-5 h-5" />}
                    <p className="text-sm font-medium">{message}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Tips for best results:</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Ensure the puzzle is well-lit and in focus</li>
              <li>• Position the grid straight (not at an angle)</li>
              <li>• Include the entire 9x9 grid in the frame</li>
              <li>• Use a clear image with high contrast</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        {preview && (
          <div className="p-6 border-t border-slate-100 flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadAndExtract}
              disabled={isProcessing || status === 'success'}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  Extract Puzzle
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}