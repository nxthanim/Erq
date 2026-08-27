import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { messagesAPI, usersAPI } from '../utils/api';
import VideoCallModal from '../components/VideoCallModal';
import { Search, Plus, X, MessageCircle, Phone, Video, Paperclip, FileText, Download, Loader2, ChevronRight, Send, MessageSquare } from 'lucide-react';
import AppAvatar from '../components/ui/avatar';

function SteepButton({ style: extraStyle, className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${className}`}
      {...props}
      style={{ backgroundColor: '#173a32', color: '#ffffff', ...extraStyle }}
    >
      {children}
    </button>
  );
}

function GhostButton({ style: extraStyle, className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${className}`}
      {...props}
      style={{ backgroundColor: 'transparent', color: '#173a32', border: '1px solid #173a32', ...extraStyle }}
    >
      {children}
    </button>
  );
}

export default function Messages() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { socket, isUserOnline, socketConnected } = useSocket();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [videoCall, setVideoCall] = useState({ open: false, type: 'video', title: '', participant: '' });

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const refreshConversations = useCallback(() => {
    messagesAPI.getConversations()
      .then(res => setConversations(res.data.conversations || []))
      .catch(() => {});
  }, []);

  const hasAutoStarted = useRef(false);
  useEffect(() => {
    const userId = searchParams.get('userId');
    const userName = searchParams.get('userName');
    if (userId && userName && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      const existing = conversations.find(c => c.other_user_id === userId);
      if (existing) {
        setActiveChat(existing);
      } else {
        const decodedName = decodeURIComponent(userName);
        const newConv = {
          other_user_id: userId,
          other_user_name: decodedName,
          other_user_picture: '',
          other_user_role: 'client',
          unread_count: 0,
          last_message: '',
        };
        setActiveChat(newConv);
        setConversations(prev => [newConv, ...prev]);
      }
    }
  }, [searchParams, conversations]);

  useEffect(() => {
    refreshConversations();
    setLoading(false);
  }, [refreshConversations]);

  useEffect(() => {
    if (!activeChat) return;
    messagesAPI.getMessages(activeChat.other_user_id)
      .then(res => {
        setMessages(res.data.messages || []);
        socket?.emit('messages:read', { userId: user.id, otherUserId: activeChat.other_user_id });
      })
      .catch(() => {});
  }, [activeChat?.other_user_id]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg) => {
      if (activeChat && (msg.sender_id === activeChat.other_user_id || msg.sender_id === user.id)) {
        setMessages(prev => [...prev, msg]);
      }
      refreshConversations();
    };
    socket.on('message:new', handleNewMessage);
    socket.on('message:sent', handleNewMessage);
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:sent', handleNewMessage);
    };
  }, [socket, activeChat, user, refreshConversations]);

  const pollIntervalRef = useRef(null);
  useEffect(() => {
    if (!activeChat || socketConnected) {
      if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
      return;
    }
    const pollMessages = async () => {
      try {
        const res = await messagesAPI.getMessages(activeChat.other_user_id);
        const newMsgs = res.data?.messages || [];
        setMessages(prev => newMsgs.length > prev.length ? newMsgs : prev);
      } catch {}
    };
    pollIntervalRef.current = setInterval(pollMessages, 3000);
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [activeChat?.other_user_id, socketConnected]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (showSearch && searchInputRef.current) searchInputRef.current.focus(); }, [showSearch]);
  useEffect(() => {
    if (!showSearch) return;
    const handleClick = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) { setShowSearch(false); setSearchQuery(''); setSearchResults([]); } };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSearch]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query.trim() || query.trim().length < 2) { setSearchResults([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await usersAPI.searchUsers(query.trim());
        setSearchResults(res.data.users || []);
      } catch { setSearchResults([]); } finally { setSearching(false); }
    }, 300);
  }, []);

  useEffect(() => () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); }, []);

  const startConversation = (searchedUser) => {
    setShowSearch(false); setSearchQuery(''); setSearchResults([]);
    const existing = conversations.find(c => c.other_user_id === searchedUser.id);
    if (existing) { setActiveChat(existing); return; }
    const newConv = {
      other_user_id: searchedUser.id, other_user_name: searchedUser.full_name,
      other_user_picture: searchedUser.profile_picture, other_user_role: searchedUser.role,
      unread_count: 0, last_message: '',
    };
    setActiveChat(newConv);
    setConversations(prev => [newConv, ...prev]);
  };

  const sendMessage = async (attachment) => {
    if ((!messageText.trim() && !attachment) || !activeChat) return;
    const msg = {
      senderId: user.id, receiverId: activeChat.other_user_id, message: messageText.trim() || '',
      jobId: null, attachmentUrl: attachment?.url || null, attachmentName: attachment?.name || null,
      attachmentSize: attachment?.size || null, attachmentType: attachment?.mimetype || null,
    };
    if (socket?.connected) {
      socket.emit('message:send', msg);
    } else {
      try {
        const res = await messagesAPI.send({ receiverId: activeChat.other_user_id, message: messageText.trim() || '',
          attachmentUrl: attachment?.url || null, attachmentName: attachment?.name || null,
          attachmentSize: attachment?.size || null, attachmentType: attachment?.mimetype || null });
        if (res.data?.message) setMessages(prev => [...prev, res.data.message]);
        refreshConversations();
      } catch (err) { console.error('Failed to send message:', err); }
    }
    setMessageText('');
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    setUploading(true);
    try { const res = await messagesAPI.uploadFile(file); sendMessage(res.data); }
    catch (err) { console.error('Failed to upload file:', err); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const startVideoCall = () => setVideoCall({ open: true, type: 'video', title: `Call with ${activeChat?.other_user_name || 'User'}`, participant: activeChat?.other_user_name || 'User' });
  const startAudioCall = () => setVideoCall({ open: true, type: 'audio', title: `Audio Call with ${activeChat?.other_user_name || 'User'}`, participant: activeChat?.other_user_name || 'User' });

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!messageText.trim() && !uploading) return; sendMessage(); }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageType = (type) => type?.startsWith('image/');
  const isPdfType = (type) => type === 'application/pdf';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#173a32]/20 border-t-[#173a32]"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-0 -m-6 lg:-m-8">
      {/* Conversations List */}
      <div className="w-80 flex flex-col" style={{ backgroundColor: '#ffffff', borderRight: '1px solid #ececec' }}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #ececec' }}>
          <h2 className="text-lg font-bold" style={{ color: '#173a32' }}>{t('messages.title')}</h2>
          <button onClick={() => setShowSearch(!showSearch)}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-all"
            style={{ backgroundColor: showSearch ? '#f2f2f3' : 'transparent', color: '#173a32' }}
            title="New Message">
            {showSearch ? <X size={18} /> : <Plus size={18} />}
          </button>
        </div>

        {/* Search Panel */}
        {showSearch && (
          <div ref={searchRef} className="p-3" style={{ backgroundColor: '#fafafb', borderBottom: '1px solid #ececec' }}>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#979799' }} />
              <input ref={searchInputRef} type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)}
                placeholder="Search users by name..."
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
                style={{ border: '1px solid #ececec', color: '#173a32', backgroundColor: '#ffffff' }}
                onFocus={e => e.target.style.borderColor = '#173a32'}
                onBlur={e => e.target.style.borderColor = '#ececec'} />
              {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-[#173a32]/30 border-t-[#173a32] rounded-full animate-spin" /></div>}
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {searchResults.map(u => (
                  <button key={u.id} onClick={() => startConversation(u)}
                    className="w-full p-2.5 flex items-center gap-3 rounded-2xl transition-all text-left group hover:bg-white">
                    <div className="relative shrink-0">
                      <AppAvatar src={u.profile_picture} name={u.full_name} size="sm" showStatus isOnline={isUserOnline(u.id)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate transition-colors group-hover:opacity-70" style={{ color: '#173a32' }}>{u.full_name}</p>
                      <p className="text-[11px]" style={{ color: '#979799' }}>{u.role} {u.city ? `• ${u.city}` : ''}</p>
                    </div>
                    <MessageCircle size={14} className="shrink-0" style={{ color: '#d0d0d0' }} />
                  </button>
                ))}
              </div>
            )}
            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <p className="text-xs mt-2 text-center py-2" style={{ color: '#979799' }}>No users found matching "{searchQuery}"</p>
            )}
            {searchQuery.length > 0 && searchQuery.length < 2 && (
              <p className="text-xs mt-2 text-center" style={{ color: '#979799' }}>Type at least 2 characters to search</p>
            )}
          </div>
        )}

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center">
              <MessageCircle size={40} className="mx-auto mb-3" style={{ color: '#d0d0d0' }} />
              <p className="text-sm" style={{ color: '#777b86' }}>{t('messages.no.conversations')}</p>
              <p className="text-xs mt-2" style={{ color: '#979799' }}>{t('messages.start')}</p>
              <button onClick={() => setShowSearch(true)}
                className="mt-4 text-sm font-medium inline-flex items-center gap-1.5 mx-auto hover:underline"
                style={{ color: '#173a32' }}>
                <Plus size={14} /> Find someone to message
              </button>
            </div>
          ) : (
            conversations.map(conv => (
              <button key={conv.other_user_id} onClick={() => setActiveChat(conv)}
                className="w-full p-4 flex items-start gap-3 text-left transition-colors"
                style={{
                  borderBottom: '1px solid #f2f2f3',
                  backgroundColor: activeChat?.other_user_id === conv.other_user_id ? '#fafafb' : 'transparent',
                  borderLeft: activeChat?.other_user_id === conv.other_user_id ? '3px solid #1f6f5c' : '3px solid transparent'
                }}>
                <div className="relative shrink-0">
                  <AppAvatar src={conv.other_user_picture} name={conv.other_user_name} size="md" showStatus isOnline={isUserOnline(conv.other_user_id)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate" style={{ color: '#173a32' }}>{conv.other_user_name}</p>
                    {conv.unread_count > 0 && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                        style={{ backgroundColor: '#1f6f5c', color: '#ffffff' }}>
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs capitalize mb-0.5" style={{ color: '#979799' }}>{conv.other_user_role}</p>
                  <p className="text-xs truncate" style={{ color: '#777b86' }}>{conv.last_message}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {activeChat ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid #ececec', backgroundColor: '#ffffff' }}>
            <div className="relative">
              <AppAvatar src={activeChat.other_user_picture} name={activeChat.other_user_name} size="md" showStatus isOnline={isUserOnline(activeChat.other_user_id)} />
            </div>
            <div className="flex-1">
              <p className="font-semibold" style={{ color: '#173a32' }}>{activeChat.other_user_name}</p>
              <p className="text-xs" style={{ color: '#777b86' }}>
                {isUserOnline(activeChat.other_user_id) ? t('messages.online') : t('messages.offline')}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={startAudioCall}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{ color: '#777b86' }}>
                <Phone size={16} />
              </button>
              <button onClick={startVideoCall}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{ color: '#777b86' }}>
                <Video size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ backgroundColor: '#fafafb' }}>
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare size={32} className="mx-auto mb-2" style={{ color: '#d0d0d0' }} />
                  <p className="text-sm" style={{ color: '#979799' }}>Start a conversation with {activeChat.other_user_name}</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-2.5 space-y-1.5 ${
                    msg.sender_id === user.id
                      ? 'rounded-2xl rounded-br-md'
                      : 'rounded-2xl rounded-bl-md'
                  }`} style={{
                    backgroundColor: msg.sender_id === user.id ? '#173a32' : '#ffffff',
                    color: msg.sender_id === user.id ? '#ffffff' : '#173a32',
                    boxShadow: msg.sender_id !== user.id ? '0 0 0 1px rgba(0,0,0,0.04)' : 'none'
                  }}>
                    {msg.attachment_url && (
                      <div className={`rounded-xl overflow-hidden ${msg.sender_id === user.id ? '' : ''}`}
                        style={{ backgroundColor: msg.sender_id === user.id ? 'rgba(255,255,255,0.1)' : '#f2f2f3' }}>
                        {isImageType(msg.attachment_type) ? (
                          <div className="relative group">
                            <img src={msg.attachment_url} alt={msg.attachment_name}
                              className="max-h-48 w-full object-contain cursor-pointer"
                              onClick={() => window.open(msg.attachment_url, '_blank')} />
                            <a href={msg.attachment_url} download={msg.attachment_name || 'image'}
                              target="_blank" rel="noopener noreferrer"
                              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                              style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#ffffff' }}
                              title="Open image"
                              onClick={e => e.stopPropagation()}>
                              <Download size={14} />
                            </a>
                          </div>
                        ) : (
                          <a href={msg.attachment_url} download={msg.attachment_name}
                            className={`flex items-center gap-3 p-3 hover:opacity-80 transition-opacity`}
                            style={{ color: msg.sender_id === user.id ? '#ffffff' : '#173a32' }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                              style={{ backgroundColor: msg.sender_id === user.id ? 'rgba(255,255,255,0.2)' : '#e7f5ef', color: msg.sender_id === user.id ? '#ffffff' : '#1f6f5c' }}>
                              {isPdfType(msg.attachment_type) ? <FileText size={18} /> : <FileText size={18} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{msg.attachment_name}</p>
                              <p className="text-[10px]" style={{ opacity: 0.6 }}>{formatFileSize(msg.attachment_size)}</p>
                            </div>
                            <Download size={14} className="shrink-0 opacity-60" />
                          </a>
                        )}
                      </div>
                    )}
                    {msg.message && <p className="text-sm leading-relaxed">{msg.message}</p>}
                    <p className="text-[10px]" style={{ opacity: 0.6 }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4" style={{ backgroundColor: '#ffffff', borderTop: '1px solid #ececec' }}>
            <div className="flex gap-3 items-end">
              <div className="relative">
                <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.mp3,.mp4" />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
                  style={{ color: '#979799' }} title="Attach File">
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                </button>
              </div>
              <textarea value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={handleKeyPress}
                placeholder={t('common.type.message')} rows={1}
                className="flex-1 px-4 py-2.5 rounded-2xl text-sm outline-none transition-all resize-none"
                style={{ border: '1px solid #ececec', color: '#173a32', backgroundColor: '#ffffff' }}
                onFocus={e => e.target.style.borderColor = '#173a32'}
                onBlur={e => e.target.style.borderColor = '#ececec'} />
              <button onClick={() => sendMessage()} disabled={!messageText.trim()}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
                style={{ backgroundColor: messageText.trim() ? '#173a32' : '#f2f2f3', color: messageText.trim() ? '#ffffff' : '#d0d0d0' }}>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#fafafb' }}>
          <div className="text-center">
            <MessageCircle size={56} className="mx-auto mb-4" style={{ color: '#d0d0d0' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#173a32', fontFamily: 'var(--font-signifier)', fontWeight: 400 }}>
              Select a Conversation
            </h3>
            <p style={{ color: '#777b86' }}>{t('messages.start')}</p>
          </div>
        </div>
      )}

      <VideoCallModal
        isOpen={videoCall.open}
        onClose={() => setVideoCall({ open: false, type: 'video', title: '', participant: '' })}
        meetingTitle={videoCall.title}
        participantName={videoCall.participant}
      />
    </div>
  );
}
