import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { agentsAPI } from '../utils/api';
import { useToast } from '../context/ToastContext';
import {
  Bot, Plus, X, Edit2, Trash2, Send, ChevronRight,
  Sparkles, Zap, Palette, Brain, UserPlus, Users, ChevronDown, ChevronUp,
  MessageCircle, Star, ChevronLeft, Paperclip, FileText, Image, Download,
} from 'lucide-react';

// ====== AGENT ICON ======
const agentIcons = {
  'General Assistant': <Bot size={18} />,
  'Content Creator': <Sparkles size={18} />,
  'Design Consultant': <Palette size={18} />,
  'Analytics Expert': <Brain size={18} />,
};

const defaultColors = ['#1a1a1a', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

const ROLE_OPTIONS = [
  { value: 'General Assistant', icon: Bot, label: 'General Assistant' },
  { value: 'Content Creator', icon: Sparkles, label: 'Content Creator' },
  { value: 'Design Consultant', icon: Palette, label: 'Design Consultant' },
  { value: 'Analytics Expert', icon: Brain, label: 'Analytics Expert' },
  { value: 'Customer Support', icon: MessageCircle, label: 'Customer Support' },
  { value: 'Sales Agent', icon: Zap, label: 'Sales Agent' },
  { value: 'Custom', icon: Star, label: 'Custom Role' },
];

// ====== CLAUDE-STYLE TYPING ANIMATION ======
function TypingAnimation({ text, speed = 30, onComplete }) {
  const [displayed, setDisplayed] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');
    setIsComplete(false);

    if (!text) {
      setIsComplete(true);
      onComplete?.();
      return;
    }

    // Split into words for word-by-word reveal
    const words = text.split(/(\s+)/);

    timerRef.current = setInterval(() => {
      if (indexRef.current < words.length) {
        setDisplayed(prev => prev + words[indexRef.current]);
        indexRef.current++;
      } else {
        clearInterval(timerRef.current);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(timerRef.current);
  }, [text, speed]);

  return (
    <span className="whitespace-pre-wrap">
      {displayed}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
          className="inline-block w-[2px] h-[1em] bg-[#1a1a1a] ml-0.5 align-middle"
        />
      )}
    </span>
  );
}

// ====== CUSTOM ROLE SELECT ======
function RoleSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = ROLE_OPTIONS.find(r => r.value === value);
  const Icon = selected?.icon || Bot;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#ebe0d0] text-sm bg-white outline-none focus:border-[#1a1a1a] transition-all">
        <Icon size={16} className="text-[#75644f]" />
        <span className="flex-1 text-left text-[#433930]">{selected?.label || 'Select Role'}</span>
        <ChevronDown size={14} className={`text-[#a6967e] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-[#ebe0d0] shadow-lg overflow-hidden">
            {ROLE_OPTIONS.map(({ value: v, icon: IconComp, label }) => (
              <button key={v} type="button" onClick={() => { onChange(v); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all ${
                  value === v ? 'bg-[#e8e8e8] text-[#1a1a1a] font-semibold' : 'text-[#433930] hover:bg-[#faf7f2]'
                }`}>
                <IconComp size={16} />
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ====== AGENT CARD ======
function AgentCard({ agent, onEdit, onDelete, onChat, isActive }) {
  const isSystem = agent.user_id === 'system';

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className={`rounded-2xl p-5 bg-white border transition-all cursor-pointer group relative overflow-hidden ${
        isActive ? 'border-[#1a1a1a] shadow-md' : 'border-[#ebe0d0] hover:shadow-sm'
      }`}
      onClick={() => onChat(agent)}
    >
      <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, ${agent.color}, ${agent.color}88)` }} />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shadow-sm"
            style={{ background: `${agent.color}18`, color: agent.color }}>
            {agentIcons[agent.role] || <Bot size={18} />}
          </div>
          <div>
            <p className="font-semibold text-[#433930] text-sm flex items-center gap-1.5">
              {agent.name}
              {agent.parent_agent_id && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${agent.color}12`, color: agent.color }}>Sub</span>
              )}
            </p>
            <p className="text-[10px] text-[#a6967e]">{agent.role}</p>
          </div>
        </div>
        {agent.subagent_count > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-[#a6967e] bg-[#faf7f2] px-2 py-1 rounded-full">
            <Users size={10} /> {agent.subagent_count}
          </div>
        )}
      </div>

      {agent.instructions && (
        <p className="text-[11px] text-[#75644f] line-clamp-2 leading-relaxed mb-3">{agent.instructions}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          {!isSystem && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onEdit(agent); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#f5efe6] text-[#75644f]"><Edit2 size={11} /></button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(agent); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-400"><Trash2 size={11} /></button>
            </>
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onChat(agent); }}
          className="flex items-center gap-1 text-[11px] font-semibold transition-all"
          style={{ color: agent.color }}>
          Chat <ChevronRight size={12} />
        </button>
      </div>
    </motion.div>
  );
}

// ====== AGENT FORM MODAL ======
function AgentFormModal({ isOpen, onClose, onSave, editAgent }) {
  const [form, setForm] = useState({ name: '', role: 'General Assistant', instructions: '', color: '#1a1a1a', parentAgentId: '' });
  const [parentAgents, setParentAgents] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editAgent) {
        setForm({ name: editAgent.name, role: editAgent.role || 'General Assistant', instructions: editAgent.instructions || '', color: editAgent.color || '#1a1a1a', parentAgentId: editAgent.parent_agent_id || '' });
      } else {
        setForm({ name: '', role: 'General Assistant', instructions: '', color: '#1a1a1a', parentAgentId: '' });
      }
      agentsAPI.list().then(res => setParentAgents(res.data.agents.filter(a => !a.parent_agent_id))).catch(() => {});
    }
  }, [isOpen, editAgent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave({ ...form, parentAgentId: form.parentAgentId || null });
      onClose();
    } catch {} finally { setSaving(false); }
  };

  const agents = parentAgents.filter(a => !editAgent || a.id !== editAgent.id);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(67,57,48,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl border border-[#ebe0d0]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#433930] flex items-center gap-2">
                {editAgent ? <Edit2 size={16} /> : <Bot size={16} />}
                {editAgent ? 'Edit Agent' : 'Create New Agent'}
              </h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f5efe6]"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Agent Name *"
                className="w-full px-4 py-2.5 rounded-xl border border-[#ebe0d0] text-sm outline-none focus:border-[#1a1a1a]" />
              <div className="grid grid-cols-2 gap-3">
                <RoleSelect value={form.role} onChange={role => setForm({...form, role})} />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#75644f]">Color:</span>
                  <div className="flex gap-1">
                    {defaultColors.map(c => (
                      <button key={c} type="button" onClick={() => setForm({...form, color: c })}
                        className={`w-7 h-7 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-offset-2 scale-110' : ''}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
              {agents.length > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#faf7f2]">
                  <UserPlus size={14} className="text-[#75644f]" />
                  <select value={form.parentAgentId} onChange={e => setForm({...form, parentAgentId: e.target.value})}
                    className="flex-1 bg-transparent text-sm outline-none text-[#75644f]">
                    <option value="">â€” No parent (main agent) â€”</option>
                    {agents.map(a => <option key={a.id} value={a.id}>Subagent of: {a.name}</option>)}
                  </select>
                </div>
              )}
              <textarea value={form.instructions} onChange={e => setForm({...form, instructions: e.target.value})}
                placeholder="Instructions â€” what should this agent do?"
                rows={3} className="w-full px-4 py-2.5 rounded-xl border border-[#ebe0d0] text-sm outline-none focus:border-[#1a1a1a] resize-none" />
              <button type="submit" disabled={saving || !form.name.trim()}
                className="w-full bg-[#1a1a1a] text-white font-semibold py-2.5 rounded-xl hover:bg-[#333333] transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? (
                  <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Creating...</>
                ) : editAgent ? 'Update Agent' : 'Create Agent'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ====== FILE ATTACHMENT PREVIEW ======
function FileAttachment({ file }) {
  const isImage = /\.(jpe?g|png|gif|webp)$/i.test(file.name);

  if (isImage) {
    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer"
        className="block rounded-xl overflow-hidden border border-[#ebe0d0] group">
        <img src={file.url} alt={file.name} className="max-h-48 w-full object-cover" />
        <div className="px-3 py-2 text-[10px] text-[#a6967e] bg-[#faf7f2] flex items-center gap-1.5">
          <Image size={10} /> {file.name}
        </div>
      </a>
    );
  }

  return (
    <a href={file.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2.5 p-3 rounded-xl bg-[#faf7f2] border border-[#ebe0d0] hover:bg-[#f5efe6] transition-all group">
      <FileText size={16} className="text-[#75644f]" />
      <span className="flex-1 text-xs text-[#433930] truncate">{file.name}</span>
      <Download size={12} className="text-[#a6967e] group-hover:text-[#1a1a1a]" />
    </a>
  );
}

// ====== CHAT MESSAGE ======
function ChatMessage({ msg, agent, isTyping }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
      {msg.role !== 'user' && (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
          style={{ backgroundColor: `${agent.color}18`, color: agent.color }}>
          {agentIcons[agent.role] || <Bot size={14} />}
        </div>
      )}
      <div className={`max-w-[70%] space-y-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
        {/* File attachments */}
        {msg.files?.length > 0 && (
          <div className={`grid gap-1.5 ${msg.files.length > 1 ? 'grid-cols-2' : ''}`}>
            {msg.files.map((f, i) => <FileAttachment key={i} file={f} />)}
          </div>
        )}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          msg.role === 'user'
            ? 'bg-[#1a1a1a] text-white rounded-br-md'
            : 'bg-[#faf7f2] text-[#433930] rounded-bl-md'
        }`}>
          {msg.role === 'user' ? (
            <div className="whitespace-pre-wrap">{msg.content}</div>
          ) : isTyping && msg._isStreaming ? (
            <TypingAnimation text={msg.content} speed={20} />
          ) : (
            <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
              __html: msg.content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br/>')
                .replace(/^- (.*)/gm, 'â€¢ $1')
            }} />
          )}
          <p className={`text-[9px] mt-1.5 ${msg.role === 'user' ? 'text-white/60' : 'text-[#a6967e]'}`}>
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
      {msg.role === 'user' && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#333333] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">U</div>
      )}
    </motion.div>
  );
}

// ====== CHAT INTERFACE ======
function AgentChat({ agent, onBack }) {
  const agentId = agent?.id;
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (agentId) fetchConversations();
    else {
      setConversations([]);
      setActiveConv(null);
      setMessages([]);
    }
  }, [agentId]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeConv]);

  const fetchConversations = async () => {
    if (!agentId) return;
    try {
      const res = await agentsAPI.getConversations(agentId);
      setConversations(res.data.conversations || []);
      if (res.data.conversations?.length > 0 && !activeConv) {
        setActiveConv(res.data.conversations[0]);
      }
    } catch {}
  };

  const fetchMessages = async (convId) => {
    if (!agentId || !convId) return;
    try {
      const res = await agentsAPI.getMessages(agentId, convId);
      setMessages(res.data.messages || []);
    } catch {}
  };

  const selectConversation = (conv) => {
    setActiveConv(conv);
    fetchMessages(conv.id);
  };

  const createConversation = async () => {
    if (!agentId) {
      toast?.error?.('This AI agent is unavailable. Please choose another agent.', { title: 'Agent unavailable' });
      return;
    }
    try {
      const res = await agentsAPI.createConversation(agentId, { title: 'New Conversation' });
      setActiveConv(res.data.conversation);
      setMessages([]);
      fetchConversations();
    } catch {
      toast?.error?.('Failed to create conversation', { title: 'Error' });
    }
  };

  const deleteConversation = async (e, convId) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    try {
      if (!agentId || !convId) return;
      await agentsAPI.deleteConversation(agentId, convId);
      if (activeConv?.id === convId) { setActiveConv(null); setMessages([]); }
      fetchConversations();
    } catch {}
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachedFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeAttachedFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (name) => {
    if (/\.(jpe?g|png|gif|webp)$/i.test(name)) return <Image size={14} />;
    return <FileText size={14} />;
  };

  const sendMessage = async () => {
    const hasText = input.trim().length > 0;
    const hasFiles = attachedFiles.length > 0;
    if ((!hasText && !hasFiles) || sending || !agentId || !activeConv?.id) return;

    const msgText = input.trim() || '(File attachment)';
    setInput('');
    setSending(true);

    // Upload files first
    let uploadedFiles = [];
    if (hasFiles) {
      setUploadingFile(true);
      try {
        const uploadResults = await Promise.all(
          attachedFiles.map(file => agentsAPI.uploadFile(file).then(r => r.data))
        );
        uploadedFiles = uploadResults;
      } catch {
        toast?.error?.('Failed to upload files', { title: 'Error' });
        setUploadingFile(false);
        setSending(false);
        setAttachedFiles([]);
        return;
      }
      setUploadingFile(false);
      setAttachedFiles([]);
    }

    // Optimistic user message
    const tempMsg = {
      id: 'temp-' + Date.now(), role: 'user', content: msgText,
      created_at: new Date().toISOString(),
      files: uploadedFiles,
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await agentsAPI.sendMessage(agentId, activeConv.id, {
        content: msgText,
        files: uploadedFiles,
      });

      // The API must return both persisted messages. Fail clearly instead of
      // dereferencing an undefined AI message and crashing the whole page.
      const userMessage = res.data?.userMessage;
      const agentMsg = res.data?.agentMessage;
      if (!userMessage?.id || !agentMsg?.id) {
        throw new Error('AI response was incomplete. Please try again.');
      }
      const agentMsgWithStream = { ...agentMsg, _isStreaming: true };
      setMessages(prev => [...prev.filter(m => m.id !== tempMsg.id), userMessage, agentMsgWithStream]);
      setStreamingMsgId(agentMsg.id);
      scrollToBottom();
      fetchConversations();

      // After a delay, mark as done streaming
      const wordCount = (agentMsg.content || '').split(/\s+/).length;
      const delay = Math.min(wordCount * 40, 8000);
      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === agentMsg.id ? { ...m, _isStreaming: false } : m));
        setStreamingMsgId(null);
        scrollToBottom();
      }, delay);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      toast?.error?.('Failed to send message', { title: 'Error' });
    } finally { setSending(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Conversations Sidebar */}
      <motion.div animate={{ width: showSidebar ? 280 : 0 }} className="shrink-0 overflow-hidden">
        <div className="rounded-2xl bg-white border border-[#ebe0d0] h-full flex flex-col overflow-hidden" style={{ minWidth: 280 }}>
          <div className="p-3 border-b border-[#ebe0d0]">
            <button onClick={createConversation}
              className="w-full bg-[#1a1a1a] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#333333] transition-all flex items-center justify-center gap-2">
              <Plus size={14} /> New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {conversations.map(conv => (
              <button key={conv.id} onClick={() => selectConversation(conv)}
                className={`w-full text-left p-2.5 rounded-xl text-sm transition-all group flex items-center gap-2 ${
                  activeConv?.id === conv.id ? 'bg-[#e8e8e8] text-[#1a1a1a] font-semibold' : 'hover:bg-[#faf7f2] text-[#75644f]'
                }`}>
                <MessageCircle size={12} className="shrink-0" />
                <span className="flex-1 truncate text-xs">{conv.title}</span>
                <span className="text-[9px] text-[#a6967e] shrink-0">{conv.message_count || 0}</span>
                <button onClick={(e) => deleteConversation(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 shrink-0"><X size={10} /></button>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col rounded-2xl bg-white border border-[#ebe0d0] overflow-hidden">
        {/* Chat Header */}
        <div className="px-5 py-3 border-b border-[#ebe0d0] flex items-center justify-between bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSidebar(!showSidebar)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#f5efe6] text-[#75644f] transition-all">
              {showSidebar ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{ backgroundColor: `${agent.color}18`, color: agent.color }}>
              {agentIcons[agent.role] || <Bot size={14} />}
            </div>
            <div>
              <p className="font-semibold text-[#433930] text-sm">{agent.name}</p>
              <p className="text-[10px] text-[#a6967e]">{agent.role}{agent.parent_agent_id ? ' - Subagent' : ''}</p>
            </div>
          </div>
          <button onClick={onBack}
            className="flex items-center gap-1 text-[10px] text-[#75644f] hover:text-[#433930] px-3 py-1.5 rounded-lg hover:bg-[#f5efe6] transition-all">
            <ChevronLeft size={12} /> All Agents
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollBehavior: 'smooth' }}>
          {!activeConv ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm"
                style={{ backgroundColor: `${agent.color}18`, color: agent.color }}>
                {agentIcons[agent.role] || <Bot size={24} />}
              </motion.div>
              <h3 className="text-lg font-bold text-[#433930] mb-1">Chat with {agent.name}</h3>
              <p className="text-sm text-[#75644f] mb-6 max-w-md">{agent.instructions || `${agent.role.toLowerCase()} assistant`}</p>
              <button onClick={createConversation}
                className="bg-[#1a1a1a] text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-[#333333] transition-all flex items-center gap-2 shadow-sm">
                <MessageCircle size={16} /> Start a Conversation
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Sparkles size={32} className="text-[#dcc8ae] mb-3" />
              <p className="text-[#75644f] text-sm">Start the conversation!</p>
              <p className="text-[10px] text-[#a6967e] mt-1">Ask {agent.name} anything</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <ChatMessage key={msg.id || `message-${index}`} msg={msg} agent={agent}
                isTyping={Boolean(msg.id) && msg.id === streamingMsgId && msg._isStreaming} />
            ))
          )}

          {/* Sending indicator */}
          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${agent.color}18`, color: agent.color }}>
                {agentIcons[agent.role] || <Bot size={14} />}
              </div>
              <div className="bg-[#faf7f2] rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i}
                      animate={{ opacity: [0, 1, 0], y: [0, -3, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                      className="w-2 h-2 rounded-full bg-[#1a1a1a]" />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        {activeConv && (
          <div className="border-t border-[#ebe0d0] bg-white">
            {/* Attached files preview */}
            {attachedFiles.length > 0 && (
              <div className="px-4 pt-3 flex flex-wrap gap-2">
                {attachedFiles.map((file, i) => (
                  <div key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#e8e8e8] border border-[#1a1a1a]/20 text-xs text-[#433930]">
                    {getFileIcon(file.name)}
                    <span className="max-w-[120px] truncate">{file.name}</span>
                    <button onClick={() => removeAttachedFile(i)}
                      className="text-red-400 hover:text-red-500 ml-1"><X size={10} /></button>
                  </div>
                ))}
                {uploadingFile && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#faf7f2] text-xs text-[#75644f]">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-3 h-3 border-2 border-[#1a1a1a]/30 border-t-[#1a1a1a] rounded-full" />
                    Uploading...
                  </div>
                )}
              </div>
            )}
            <div className="p-4">
              <div className="flex items-end gap-2 p-2 rounded-xl bg-[#faf7f2] border border-[#ebe0d0] focus-within:border-[#1a1a1a]/50 focus-within:bg-white transition-all">
                {/* File attach button */}
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#a6967e] hover:text-[#1a1a1a] hover:bg-[#e8e8e8] transition-all shrink-0 disabled:opacity-40">
                  <Paperclip size={16} />
                </button>
                <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx" className="hidden" />

                {/* Text input */}
                <div className="flex-1 relative">
                  <textarea ref={inputRef} value={input}
                    onChange={e => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${agent.name}...`}
                    rows={1}
                    className="w-full bg-transparent px-2 py-2 text-sm outline-none text-[#433930] placeholder-[#a6967e] resize-none max-h-32"
                  />
                </div>

                {/* Send button */}
                <button onClick={sendMessage} disabled={sending || (!input.trim() && attachedFiles.length === 0) || uploadingFile}
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#1a1a1a] text-white disabled:opacity-40 hover:bg-[#333333] transition-all shrink-0">
                  {sending || uploadingFile ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ====== MAIN PAGE ======
export default function MyAgents() {
  const [agents, setAgents] = useState([]);
  const [mainAgents, setMainAgents] = useState([]);
  const [subAgents, setSubAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editAgent, setEditAgent] = useState(null);
  const [chattingWith, setChattingWith] = useState(null);
  const [expandedParents, setExpandedParents] = useState({});
  const { toast } = useToast();

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await agentsAPI.list();
      const all = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.agents) ? res.data.agents : [];
      setAgents(all);
      setMainAgents(all.filter(a => !a.parent_agent_id));
      setSubAgents(all.filter(a => a.parent_agent_id));
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Failed to load agents';
      toast?.error?.(errMsg, { title: 'Error' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleSave = async (formData) => {
    try {
      if (editAgent) await agentsAPI.update(editAgent.id, formData);
      else await agentsAPI.create(formData);
      toast?.success?.(`"${formData.name}" is ready!`, { title: editAgent ? 'Agent Updated' : 'Agent Created' });
      fetchAgents();
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.message || 'Something went wrong';
      toast?.error?.(errMsg, { title: 'Error' });
      throw err;
    }
  };

  const handleDelete = async (agent) => {
    if (!confirm(`Delete "${agent.name}" and all its conversations?`)) return;
    try {
      await agentsAPI.delete(agent.id);
      toast?.success?.(`"${agent.name}" has been removed`, { title: 'Agent Deleted' });
      fetchAgents();
    } catch (err) {
      const errMsg = err?.response?.data?.error || 'Failed to delete agent';
      toast?.error?.(errMsg, { title: 'Error' });
    }
  };

  const handleEdit = (agent) => {
    setEditAgent(agent);
    setShowForm(true);
  };

  const toggleExpand = (id) => {
    setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (chattingWith) {
    return <AgentChat agent={chattingWith} onBack={() => setChattingWith(null)} />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bot size={22} className="text-[#1a1a1a]" />
            <h1 className="text-2xl font-bold text-[#433930]">My AI Agents</h1>
            <span className="text-[10px] bg-[#1a1a1a]/10 text-[#1a1a1a] px-2 py-0.5 rounded-full font-semibold">{agents.length} agents</span>
          </div>
          <p className="text-sm text-[#75644f] mt-1">Create custom AI agents and subagents to help with your business</p>
        </div>
        <button onClick={() => { setEditAgent(null); setShowForm(true); }}
          className="bg-[#1a1a1a] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#333333] transition-all flex items-center gap-2 shadow-sm">
          <Plus size={16} /> Create Agent
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-5">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-2xl p-5 bg-white border border-[#ebe0d0] animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-[#dcc8ae]/40" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-[#dcc8ae]/40 rounded w-2/3" />
                  <div className="h-3 bg-[#dcc8ae]/30 rounded w-1/3" />
                </div>
              </div>
              <div className="h-8 bg-[#dcc8ae]/30 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* System/Default Agents */}
          <div>
            <h3 className="font-semibold text-[#433930] mb-3 flex items-center gap-2">
              <Star size={14} className="text-yellow-500" /> Default Agents
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {mainAgents.filter(a => a.user_id === 'system').map(agent => (
                <AgentCard key={agent.id} agent={agent} onEdit={handleEdit} onDelete={handleDelete} onChat={setChattingWith} isActive={false} />
              ))}
            </div>
          </div>

          {/* User's Main Agents */}
          {mainAgents.filter(a => a.user_id !== 'system').length > 0 && (
            <div>
              <h3 className="font-semibold text-[#433930] mb-3 flex items-center gap-2">
                <Bot size={14} /> Your Agents
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {mainAgents.filter(a => a.user_id !== 'system').map(agent => {
                  const hasSubs = subAgents.filter(s => s.parent_agent_id === agent.id);
                  return (
                    <div key={agent.id}>
                      <AgentCard agent={agent} onEdit={handleEdit} onDelete={handleDelete} onChat={setChattingWith} isActive={false} />
                      {hasSubs.length > 0 && (
                        <div className="ml-6 mt-2">
                          <button onClick={() => toggleExpand(agent.id)}
                            className="flex items-center gap-1 text-[10px] text-[#a6967e] hover:text-[#75644f] mb-2">
                            {expandedParents[agent.id] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            {hasSubs.length} subagent{hasSubs.length > 1 ? 's' : ''}
                          </button>
                          <AnimatePresence>
                            {expandedParents[agent.id] && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="space-y-2">
                                {hasSubs.map(sub => (
                                  <AgentCard key={sub.id} agent={sub} onEdit={handleEdit} onDelete={handleDelete} onChat={setChattingWith} isActive={false} />
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {mainAgents.filter(a => a.user_id !== 'system').length === 0 && (
            <div className="rounded-2xl p-12 bg-white border border-[#ebe0d0] text-center">
              <Bot size={40} className="mx-auto mb-3 text-[#dcc8ae]" />
              <h3 className="text-lg font-bold text-[#433930] mb-1">Create Your First Agent</h3>
              <p className="text-sm text-[#75644f] mb-6 max-w-md mx-auto">Build custom AI agents with different roles. Each agent can have its own personality, expertise, and even subagents!</p>
              <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto mb-6">
                {[
                  { icon: <MessageCircle size={18} />, title: 'Customer Support', desc: 'Handle client inquiries', color: '#3b82f6' },
                  { icon: <Sparkles size={18} />, title: 'Content Creator', desc: 'Write gigs & proposals', color: '#8b5cf6' },
                  { icon: <Zap size={18} />, title: 'Sales Agent', desc: 'Help close deals', color: '#f59e0b' },
                ].map(t => (
                  <div key={t.title} className="text-center p-4 rounded-xl bg-[#faf7f2]">
                    <span className="block mb-2" style={{ color: t.color }}>{t.icon}</span>
                    <p className="text-xs font-semibold text-[#433930]">{t.title}</p>
                    <p className="text-[9px] text-[#a6967e]">{t.desc}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => { setEditAgent(null); setShowForm(true); }}
                className="bg-[#1a1a1a] text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-[#333333] transition-all inline-flex items-center gap-2">
                <Plus size={16} /> Create Your First Agent
              </button>
            </div>
          )}
        </>
      )}

      <AgentFormModal isOpen={showForm} onClose={() => setShowForm(false)} onSave={handleSave} editAgent={editAgent} />
    </motion.div>
  );
}
