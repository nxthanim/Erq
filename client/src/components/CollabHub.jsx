import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video, Upload, Download,
  FileText, ExternalLink, Send,
  X, Loader2, Phone, Monitor, Globe, Copy, Check
} from 'lucide-react';
import { messagesAPI } from '../utils/api';

// ====== COLLABORATION HUB ======
// Provides: Google Meet integration, file sharing, Telegram sharing, screenshare
export default function CollabHub({ order, user, partnerName }) {
  const [activeCollab, setActiveCollab] = useState(null); // 'meet' | 'files' | 'share' | null
  const [meetLink, setMeetLink] = useState('');
  const [meetCopied, setMeetCopied] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const fileInputRef = useRef(null);

  // Generate a Google Meet link (creates a room-like URL)
  const generateMeetLink = () => {
    const roomId = `erq-${order?.id?.slice(0, 8) || 'meet'}-${Date.now().toString(36)}`;
    const link = `https://meet.google.com/new?authuser=0&hs=181&pli=1&hl=en#${roomId}`;
    setMeetLink(link);
    setActiveCollab('meet');
  };

  // Copy meet link to clipboard
  const copyMeetLink = () => {
    if (meetLink) {
      navigator.clipboard.writeText(meetLink);
      setMeetCopied(true);
      setTimeout(() => setMeetCopied(false), 2000);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await messagesAPI.uploadFile(file);
      const uploadedFile = {
        name: file.name,
        size: file.size,
        url: res.data.url,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.id,
      };
      setFiles(prev => [...prev, uploadedFile]);
    } catch (err) {
      console.error('File upload failed:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Format file size
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get Telegram share URL
  const getTelegramShareUrl = () => {
    const text = encodeURIComponent(
      `🤝 Let's collaborate on Erq!\n\nOrder: ${order?.title || 'Project'}\nPrice: ETB ${order?.price?.toLocaleString() || '—'}\nPartner: ${partnerName || 'Freelancer'}\n\nDiscuss, share files, and track progress at erq.cc.cd/orders/${order?.id}`
    );
    return `https://t.me/share/url?url=${encodeURIComponent(`https://erq.cc.cd/orders/${order?.id}`)}&text=${text}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Video size={16} className="text-gebeya-500" />
          Collaboration Hub
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Meet, share files, and collaborate with {partnerName || 'your partner'}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <button onClick={() => { generateMeetLink(); }}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-100 transition-all group">
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Video size={16} className="text-white" />
          </div>
          <span className="text-[10px] font-medium text-blue-700">Google Meet</span>
        </button>
        <button onClick={() => { setActiveCollab('files'); fileInputRef.current?.click(); }}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 border border-emerald-100 transition-all group">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload size={16} className="text-white" />
          </div>
          <span className="text-[10px] font-medium text-emerald-700">Send File</span>
        </button>
        <a href={getTelegramShareUrl()} target="_blank" rel="noopener noreferrer"
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 hover:from-sky-100 hover:to-blue-100 border border-sky-100 transition-all group">
          <div className="w-9 h-9 rounded-lg bg-sky-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Send size={16} className="text-white" />
          </div>
          <span className="text-[10px] font-medium text-sky-700">Telegram</span>
        </a>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

      {/* Active Section */}
      <AnimatePresence>
        {activeCollab === 'meet' && meetLink && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Video size={12} /> Google Meet Link Generated
                </h4>
                <button onClick={() => setActiveCollab(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 mb-3">
                <p className="text-xs font-mono text-gray-600 break-all">{meetLink}</p>
              </div>
              <div className="flex gap-2">
                <a href={meetLink} target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1">
                  <ExternalLink size={12} /> Open Google Meet
                </a>
                <button onClick={copyMeetLink}
                  className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium transition-all flex items-center gap-1">
                  {meetCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  {meetCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                <Phone size={10} /> Share this link to start a video call with screenshare
              </p>
            </div>
          </motion.div>
        )}

        {activeCollab === 'files' && files.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <FileText size={12} /> Shared Files
                </h4>
                <button onClick={() => setActiveCollab(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gebeya-100 flex items-center justify-center shrink-0">
                        <FileText size={14} className="text-gebeya-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{file.name}</p>
                        <p className="text-[10px] text-gray-400">{formatSize(file.size)}</p>
                      </div>
                    </div>
                    <a href={file.url} target="_blank" rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-gebeya-600 hover:bg-gebeya-700 text-white text-[10px] font-medium transition-all flex items-center gap-1 shrink-0">
                      <Download size={10} /> Download
                    </a>
                  </div>
                ))}
              </div>
              <button onClick={() => fileInputRef.current?.click()}
                className="mt-2 w-full py-2 rounded-lg border-2 border-dashed border-gray-200 hover:border-gebeya-400 text-gray-400 hover:text-gebeya-600 text-xs font-medium transition-all flex items-center justify-center gap-1">
                <Upload size={12} /> Upload another file
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploading indicator */}
      {uploading && (
        <div className="border-t border-gray-100 p-3 flex items-center justify-center gap-2">
          <Loader2 size={14} className="animate-spin text-gebeya-600" />
          <span className="text-xs text-gray-500">Uploading file...</span>
        </div>
      )}

      {/* Bottom info */}
      <div className="px-4 pb-3 flex items-center justify-between text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <Monitor size={10} /> Screenshare supported via Meet
        </span>
        <span className="flex items-center gap-1">
          <Globe size={10} /> Works in any browser
        </span>
      </div>
    </div>
  );
}
