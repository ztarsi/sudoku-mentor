import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Loader2, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function OCRUpload({ onClose, onPuzzleExtracted }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'
  const [message, setMessage] = useState('');

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
          setMessage('Puzzle extracted successfully!');
          
          // Convert to puzzle format (0 for empty cells)
          setTimeout(() => {
            onPuzzleExtracted(grid);
            onClose();
          }, 1000);
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