import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, FileText, Image as ImageIcon, FileArchive, FileSpreadsheet, FileVideo, FileAudio, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const BLOCKED_EXTS = new Set(['exe','msi','bat','cmd','sh','vbs','ps1','scr','com','pif','jar','dll','sys','app','dmg','reg','inf']);
const ALLOWED_EXTS = new Set(['jpg','jpeg','png','gif','webp','svg','pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv','zip','mp3','mp4','mov','avi','mpg','mpeg','wav','flac','ogg','webm','3gp','mkv','psd','ai','eps','indd','raw','tiff','bmp']);

const MAX_FILE_SIZE_MB = 50;
const PREVIEW_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

function getFileIcon(file) {
  const ext = file.name?.split('.').pop()?.toLowerCase() || '';
  if (['jpg','jpeg','png','gif','webp','svg','psd','raw','tiff','bmp'].includes(ext)) return <ImageIcon size={20} />;
  if (['pdf'].includes(ext)) return <FileText size={20} className="text-red-500" />;
  if (['doc','docx'].includes(ext)) return <FileText size={20} className="text-blue-500" />;
  if (['xls','xlsx','csv'].includes(ext)) return <FileSpreadsheet size={20} className="text-green-500" />;
  if (['ppt','pptx'].includes(ext)) return <FileText size={20} className="text-orange-500" />;
  if (['zip','rar','7z','tar','gz'].includes(ext)) return <FileArchive size={20} className="text-purple-500" />;
  if (['mp4','mov','avi','mpg','mpeg','webm','3gp','mkv'].includes(ext)) return <FileVideo size={20} className="text-indigo-500" />;
  if (['mp3','wav','flac','ogg','aac'].includes(ext)) return <FileAudio size={20} className="text-pink-500" />;
  return <FileText size={20} className="text-ice-500" />;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUpload({
  label = 'Upload Files',
  accept,
  multiple = true,
  onChange,
  value = [],
  description = 'Drag & drop files or click to browse',
  maxSizeMB = MAX_FILE_SIZE_MB,
  className = '',
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState({});

  const files = Array.isArray(value) ? value : (value ? [value] : []);

  const validateFile = useCallback((file) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (BLOCKED_EXTS.has(ext)) return { valid: false, reason: `.${ext} files are blocked for security` };
    if (!ALLOWED_EXTS.has(ext) && ext) return { valid: false, reason: `.${ext} format is not supported` };
    if (file.size > maxSizeMB * 1024 * 1024) return { valid: false, reason: `File exceeds ${maxSizeMB}MB limit` };
    return { valid: true };
  }, [maxSizeMB]);

  const processFiles = useCallback(async (incoming) => {
    const valid = [];
    const errors = [];
    
    for (const file of incoming) {
      const check = validateFile(file);
      if (check.valid) {
        valid.push(file);
        // Generate preview for images
        if (PREVIEW_TYPES.includes(file.type)) {
          const url = URL.createObjectURL(file);
          setPreviews(prev => ({ ...prev, [file.name]: url }));
        }
      } else {
        errors.push(`${file.name}: ${check.reason}`);
      }
    }
    
    if (errors.length > 0) {
      alert('⚠️ Some files were rejected:\n' + errors.join('\n'));
    }
    
    if (valid.length > 0) {
      setUploading(true);
      // Simulate brief upload delay for UX
      await new Promise(r => setTimeout(r, 400));
      setUploading(false);
      onChange(multiple ? [...files, ...valid] : valid[0]);
    }
  }, [files, multiple, onChange, validateFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    processFiles(dropped);
  }, [processFiles]);

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleClick = () => inputRef.current?.click();

  const handleInputChange = (e) => {
    processFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const removeFile = (index) => {
    const removed = files[index];
    if (removed && previews[removed.name]) {
      URL.revokeObjectURL(previews[removed.name]);
      setPreviews(prev => {
        const next = { ...prev };
        delete next[removed.name];
        return next;
      });
    }
    const updated = files.filter((_, i) => i !== index);
    onChange(multiple ? updated : null);
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-ice-700 mb-1">{label}</label>

      {/* Drop Zone */}
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        animate={dragOver ? { scale: 1.01 } : { scale: 1 }}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all
          ${dragOver
            ? 'border-gebeya-400 bg-gebeya-50/40'
            : 'border-clay-200 hover:border-gebeya-300 hover:bg-gebeya-50/20'
          }
          ${files.length > 0 ? 'pb-4' : ''}
        `}
        style={{
          boxShadow: dragOver
            ? 'inset 0 0 20px rgba(0,0,0,0.06)'
            : 'inset 2px 2px 6px rgba(0,0,0,0.02), inset -1px -1px 3px rgba(255,255,255,0.5)'
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
              <Loader size={32} className="text-gebeya-500" />
            </motion.div>
            <p className="text-sm font-medium text-gebeya-600">Processing files...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <motion.div
              className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-gebeya-50 to-gebeya-100"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Upload size={24} className="text-gebeya-500" />
            </motion.div>
            <div>
              <p className="text-sm font-medium text-ice-700">
                {dragOver ? 'Drop files here' : 'Drag & drop files or click to browse'}
              </p>
              <p className="text-xs text-ice-400 mt-0.5">{description}</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-ice-500">
                {files.length} file{files.length !== 1 ? 's' : ''} · {formatSize(totalSize)} total
              </p>
              {multiple && files.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    files.forEach(f => previews[f.name] && URL.revokeObjectURL(previews[f.name]));
                    onChange([]);
                  }}
                  className="text-xs text-red-500 hover:text-red-600 font-medium"
                >
                  Remove all
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {files.map((file, i) => {
                const hasPreview = previews[file.name];
                return (
                  <motion.div
                    key={`${file.name}-${i}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative group rounded-xl overflow-hidden border border-clay-100 bg-white"
                    style={{ boxShadow: '2px 2px 6px rgba(0,0,0,0.03)' }}
                  >
                    {/* Preview or Icon */}
                    {hasPreview ? (
                      <div className="aspect-[4/3] overflow-hidden bg-ice-50">
                        <img
                          src={previews[file.name]}
                          alt={file.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-ice-50 to-clay-50">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm"
                        >
                          {getFileIcon(file)}
                        </motion.div>
                      </div>
                    )}

                    {/* File Info */}
                    <div className="p-2.5">
                      <p className="text-xs font-medium text-ice-700 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[10px] text-ice-400">{formatSize(file.size)}</p>
                    </div>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <X size={12} />
                    </button>

                    {/* Success indicator */}
                    <div className="absolute bottom-2 right-2">
                      <CheckCircle size={14} className="text-green-500" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
