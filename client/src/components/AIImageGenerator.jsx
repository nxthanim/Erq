import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Download, X, Loader2, CheckCircle, RefreshCw, Trash2, ImagePlus, Edit3, Image } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { aiAPI } from '../utils/api';

const ASPECT_RATIOS = [
  { id: '16:9', label: '16:9', icon: '🖥️', desc: 'Widescreen' },
  { id: '1:1', label: '1:1', icon: '⬛', desc: 'Square' },
  { id: '4:3', label: '4:3', icon: '📺', desc: 'Standard' },
  { id: '9:16', label: '9:16', icon: '📱', desc: 'Portrait' },
  { id: '3:2', label: '3:2', icon: '📸', desc: 'Photo' },
  { id: '2:3', label: '2:3', icon: '🖼️', desc: 'Poster' },
];

const TXT2IMG_PRESETS = [
  { id: 'fast', label: 'Fast', steps: 4, cfg: 1.0, icon: '⚡', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'balanced', label: 'Balanced', steps: 8, cfg: 2.0, icon: '⭐', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'quality', label: 'Best Quality', steps: 16, cfg: 3.5, icon: '💎', color: 'bg-purple-100 text-purple-700 border-purple-200' },
];

const IMG2IMG_PRESETS = [
  { id: 'fast', label: 'Fast', steps: 15, icon: '⚡', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'balanced', label: 'Balanced', steps: 30, icon: '⭐', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'quality', label: 'Best Quality', steps: 50, icon: '💎', color: 'bg-purple-100 text-purple-700 border-purple-200' },
];

export default function AIImageGenerator({ isOpen, onClose }) {
  // Mode: 'txt2img' (text-to-image) or 'img2img' (image editing)
  const [mode, setMode] = useState('txt2img');

  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [quality, setQuality] = useState('balanced');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [error, setError] = useState('');
  const [seed, setSeed] = useState(null);
  const [modelName, setModelName] = useState('');

  // img2img state
  const [inputImage, setInputImage] = useState(null);
  const [inputImageName, setInputImageName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const { toast } = useToast();

  const currentPresets = mode === 'txt2img' ? TXT2IMG_PRESETS : IMG2IMG_PRESETS;

  const handleImageUpload = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    setError('');
    setInputImageName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setInputImage(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleImageUpload(e.dataTransfer?.files?.[0]);
  }, [handleImageUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const clearInputImage = () => {
    setInputImage(null);
    setInputImageName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const switchMode = (newMode) => {
    if (newMode === mode || generating) return;
    setMode(newMode);
    setGeneratedImage(null);
    setError('');
    setSeed(null);
    setPrompt('');
    setQuality('balanced');
    setAspectRatio('16:9');
    clearInputImage();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description first');
      return;
    }
    if (mode === 'img2img' && !inputImage) {
      setError('Please upload a reference image first. This mode edits existing images.');
      return;
    }

    setError('');
    setGenerating(true);
    setGeneratedImage(null);
    setSeed(null);
    setModelName('');

    try {
      let res;
      if (mode === 'txt2img') {
        const preset = TXT2IMG_PRESETS.find(s => s.id === quality) || TXT2IMG_PRESETS[1];
        res = await aiAPI.generateImageTxt2img({
          prompt: prompt.trim(),
          aspectRatio,
          steps: preset.steps,
          cfgScale: preset.cfg,
        });
        setModelName('FLUX-schnell');
      } else {
        const preset = IMG2IMG_PRESETS.find(s => s.id === quality) || IMG2IMG_PRESETS[1];
        res = await aiAPI.generateImage({
          prompt: prompt.trim(),
          image: inputImage,
          steps: preset.steps,
        });
        setModelName('FLUX.1-kontext-dev');
      }

      if (res.data.success && res.data.image) {
        setGeneratedImage(res.data.image);
        setSeed(res.data.seed);
        const modelLabel = mode === 'txt2img' ? 'FLUX-schnell' : 'FLUX.1-kontext-dev';
        const label = mode === 'txt2img' ? 'Image generated!' : 'Image edited!';
        toast?.success?.(label, { title: `✨ ${modelLabel} Complete` });
      } else {
        throw new Error('No image returned from API');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Generation failed.';
      // Provide a fallback: generate a gradient placeholder so user still gets something
      try {
        const canvas = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        const [w, h] = aspectRatio.split(':').map(Number);
        canvas.width = (512 * dpr);
        canvas.height = (512 * (h/w) * dpr);
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        const hue = Math.abs(prompt.length * 37) % 360;
        grad.addColorStop(0, `hsl(${hue}, 70%, 60%)`);
        grad.addColorStop(0.5, `hsl(${(hue + 60) % 360}, 70%, 50%)`);
        grad.addColorStop(1, `hsl(${(hue + 120) % 360}, 70%, 40%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Draw decorative circles
        for (let i = 0; i < 8; i++) {
          ctx.beginPath();
          ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 60 + 10, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${(hue + i * 45) % 360}, 50%, 70%, 0.15)`;
          ctx.fill();
        }
        // Draw label text
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = `bold ${Math.round(24 * dpr)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('✨ AI Generated', canvas.width / 2, canvas.height / 2 - 10 * dpr);
        ctx.font = `${Math.round(14 * dpr)}px sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('Erq Marketplace', canvas.width / 2, canvas.height / 2 + 20 * dpr);
        const fallbackImg = canvas.toDataURL('image/png');
        setGeneratedImage(fallbackImg);
        setError('FLUX AI image service unavailable — showing placeholder. Try again later.');
      } catch (fallbackErr) {
        setError(msg);
        toast?.error?.(msg, { title: 'Generation Failed' });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.download = `erq-ai-${Date.now()}.png`;
    link.href = generatedImage;
    link.click();
    toast?.success?.('Image downloaded!', { title: '✅ Download Complete' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  mode === 'txt2img'
                    ? 'bg-gradient-to-br from-purple-700 to-purple-500'
                    : 'bg-gradient-to-br from-gray-800 to-gray-600'
                }`}>
                  {mode === 'txt2img' ? (
                    <Sparkles size={18} className="text-white" />
                  ) : (
                    <Edit3 size={18} className="text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {mode === 'txt2img' ? 'AI Image Generator' : 'AI Image Editor'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {mode === 'txt2img' ? 'FLUX-schnell • NVIDIA AI' : 'FLUX.1-kontext-dev • NVIDIA AI'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all">
                <X size={16} />
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="mb-5 p-1 bg-gray-100 rounded-xl flex">
              <button
                onClick={() => switchMode('txt2img')}
                disabled={generating}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'txt2img'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : generating ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Image size={14} />
                Text to Image
              </button>
              <button
                onClick={() => switchMode('img2img')}
                disabled={generating}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'img2img'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : generating ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Edit3 size={14} />
                Image Editing
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 flex items-start gap-2 animate-fade-in">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Text-to-Image controls */}
            {mode === 'txt2img' && (
              <>
                {/* Aspect Ratio */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Aspect Ratio</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ASPECT_RATIOS.map(ar => (
                      <button key={ar.id} onClick={() => setAspectRatio(ar.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
                          aspectRatio === ar.id
                            ? 'bg-purple-700 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={ar.desc}
                      >
                        {ar.icon} {ar.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality / Steps */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Quality / Steps</p>
                  <div className="flex gap-2">
                    {TXT2IMG_PRESETS.map(s => (
                      <button key={s.id} onClick={() => setQuality(s.id)}
                        className={`flex-1 px-2.5 py-2 rounded-xl text-[11px] font-medium transition-all border ${
                          quality === s.id
                            ? s.color + ' ring-2 ring-offset-1 ring-purple-400'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <span className="block">{s.icon} {s.label}</span>
                        <span className="block opacity-70 mt-0.5">{s.steps} steps</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Image Editing controls */}
            {mode === 'img2img' && (
              <>
                {/* Image Upload — required */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
                    Reference Image <span className="text-red-500">*required</span>
                  </p>
                  {inputImage ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group">
                      <img src={inputImage} alt="Reference" className="w-full h-32 object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                        <button onClick={clearInputImage}
                          className="opacity-0 group-hover:opacity-100 transition-all bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-red-600"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                        <span className="text-white text-[10px] truncate block">{inputImageName || 'Reference image'}</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                        dragOver
                          ? 'border-gray-900 bg-gray-100'
                          : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      <ImagePlus size={28} className="mx-auto mb-2 text-gray-400" />
                      <p className="text-xs text-gray-500 font-medium">Drop an image here or click to browse</p>
                      <p className="text-[10px] text-gray-400 mt-1">JPG, PNG, WebP — describes what to change</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e.target.files?.[0])}
                      />
                    </div>
                  )}
                </div>

                {/* Steps (img2img) */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Quality / Steps</p>
                  <div className="flex gap-2">
                    {IMG2IMG_PRESETS.map(s => (
                      <button key={s.id} onClick={() => setQuality(s.id)}
                        className={`flex-1 px-2.5 py-2 rounded-xl text-[11px] font-medium transition-all border ${
                          quality === s.id
                            ? s.color + ' ring-2 ring-offset-1 ring-gray-400'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <span className="block">{s.icon} {s.label}</span>
                        <span className="block opacity-70 mt-0.5">{s.steps} steps</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Prompt input */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
                {mode === 'txt2img' ? 'Describe what you want to create' : 'Describe the edit you want'}
              </p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  mode === 'txt2img'
                    ? 'e.g., A majestic Ethiopian landscape with the Simien Mountains at sunset, cinematic lighting, vibrant colors...'
                    : 'e.g., Now the mouse is holding pizza instead, Change the background to a sunset beach, Make the logo gold and minimalist...'
                }
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 resize-none transition-all"
              />
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={`w-full font-semibold py-3 rounded-xl transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-md ${
                mode === 'txt2img'
                  ? 'bg-purple-700 text-white hover:bg-purple-800'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {mode === 'txt2img' ? 'Generating...' : 'Editing Image...'}
                </>
              ) : (
                <>
                  {mode === 'txt2img' ? <Sparkles size={16} /> : <Edit3 size={16} />}
                  {mode === 'txt2img' ? 'Generate Image' : 'Edit Image with AI'}
                </>
              )}
            </button>

            {/* Loading Preview - shown during generation */}
            {generating && !generatedImage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gradient-to-br from-purple-50 via-white to-blue-50">
                  {/* Animated skeleton preview */}
                  <div className="relative" style={{ aspectRatio: aspectRatio.split(':').map(Number).reduce((w,h) => w/h, 1) }}>
                    {/* Animated gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-200/30 via-transparent to-blue-200/30 animate-pulse" />
                    {/* Sparkle particles */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="relative w-16 h-16 mx-auto mb-3">
                          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 animate-ping opacity-20" />
                          <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center">
                            <Sparkles size={20} className="text-white" />
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-700 animate-pulse">Creating your image...</p>
                        <div className="mt-3 flex items-center justify-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        {/* Progress bar */}
                        <div className="mt-4 max-w-[200px] mx-auto">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                              initial={{ width: '0%' }}
                              animate={{ width: '100%' }}
                              transition={{ duration: 30, ease: 'linear' }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {mode === 'txt2img'
                              ? `FLUX-schnell • ${currentPresets.find(s => s.id === quality)?.steps || 8} inference steps`
                              : `FLUX.1-kontext-dev • ${currentPresets.find(s => s.id === quality)?.steps || 30} inference steps`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Prompt overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-4 py-3">
                      <p className="text-white text-xs truncate">💭 &ldquo;{prompt}&rdquo;</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Result */}
            {generatedImage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                  <img src={generatedImage} alt="Generated" className="w-full h-auto" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={handleDownload}
                      className="w-8 h-8 rounded-lg bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-all"
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                    <button onClick={handleGenerate}
                      className="w-8 h-8 rounded-lg bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-all"
                      title="Regenerate"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <CheckCircle size={12} className="text-green-600" />
                    {currentPresets.find(s => s.id === quality)?.label || 'Balanced'}
                  </span>
                  {mode === 'txt2img' && (
                    <span className="flex items-center gap-1">
                      <Image size={12} />
                      {aspectRatio}
                    </span>
                  )}
                  {modelName && (
                    <span className="flex items-center gap-1 text-gray-400">
                      🤖 {modelName}
                    </span>
                  )}
                  {seed && (
                    <span className="flex items-center gap-1 text-gray-400">
                      🎲 Seed: {seed}
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
