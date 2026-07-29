import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { gigsAPI } from '../utils/api';
import { FileText, User, Briefcase, Megaphone, Package, PenTool, Bot, Sparkles, Globe, Palette, MessageCircle, Zap, RefreshCw, Send, Loader, CheckCircle, Clock, Star, ArrowRight, Layout } from 'lucide-react';
import WebsiteBuilder from '../components/WebsiteBuilder';

// Pre-made prompt templates
const promptTemplates = [
  { name: 'Gig Description', icon: <FileText size={18} />, prompt: 'Write a compelling gig description for a freelance service on Erq marketplace. Make it professional and attractive to Ethiopian clients.' },
  { name: 'Business Bio', icon: <User size={18} />, prompt: 'Write a professional bio for a freelancer on Gebeya. Highlight skills, experience, and what makes them unique.' },
  { name: 'Job Post', icon: <Briefcase size={18} />, prompt: 'Create a detailed job posting for a client on Erq marketplace. Include requirements, budget range, and project scope.' },
  { name: 'Marketing Copy', icon: <Megaphone size={18} />, prompt: 'Write marketing copy promoting Erq marketplace to Ethiopian freelancers and clients.' },
  { name: 'Service Package', icon: <Package size={18} />, prompt: 'Create a tiered service package (Basic, Standard, Premium) with pricing in ETB for a freelance service.' },
  { name: 'Cover Letter', icon: <PenTool size={18} />, prompt: 'Write a professional cover letter for a freelancer applying to a job on Erq.' },
];

// GLM 5.2 is the only AI model used
const AI_MODELS = [
  { index: 0, name: 'z-ai/glm-5.2', label: 'GLM 5.2', desc: 'Primary AI model' },
];

export default function AIStoreBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Welcome to the AI Store Builder! I can help you create gig descriptions, write business bios, draft job posts, and more. Try one of the templates below or ask me anything!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const selectedModel = 0;
  const [gigTopic, setGigTopic] = useState('');
  const [gigCategory, setGigCategory] = useState('');
  const [generatedGig, setGeneratedGig] = useState(null);
  const [generating, setGenerating] = useState(false);
  // User overrides for AI-generated values
  const [customPrice, setCustomPrice] = useState('');
  const [customDelivery, setCustomDelivery] = useState('');
  const [postingGig, setPostingGig] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content) => {
    if (!content?.trim() || loading) return;
    
    const userMsg = { role: 'user', content: content.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, { role: 'assistant', content: '', loading: true }]);

    const chatMessages = messages
      .filter(m => !m.loading)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      // Route through the server API — no API keys exposed in browser!
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('erq_token')}`
        },
        body: JSON.stringify({
          messages: [
            ...chatMessages,
            { role: 'user', content: content.trim() }
          ],
          systemPrompt: 'You are an AI assistant for Erq, an Ethiopian freelance marketplace. Help users create gigs, write descriptions, brainstorm ideas, and grow their freelance business. Be friendly, professional, and practical.',
          modelIndex: selectedModel
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content' && data.content) {
              fullContent += data.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: fullContent, loading: false };
                return updated;
              });
            } else if (data.type === 'error') {
              throw new Error(data.content);
            }
          } catch (e) {
            if (e.message !== 'Unexpected token') throw e;
          }
        }
      }

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: fullContent || 'No response generated.', loading: false };
        return updated;
      });

    } catch (err) {
      const msg = err.message === 'Failed to fetch'
        ? 'AI service is currently unavailable. Please try again later.'
        : err.message.includes('HTTP')
          ? 'AI service error. Please try again.'
          : `${err.message}`;
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: msg, loading: false };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateGig = async () => {
    if (!gigTopic.trim() || generating) return;
    setGenerating(true);
    setGeneratedGig(null);

    try {
      const res = await api.post('/ai/generate-gig', {
        topic: gigTopic.trim(),
        category: gigCategory || 'General'
      });
      setGeneratedGig(res.data.gig);
    } catch (err) {
      console.error('Failed to generate gig:', err);
    } finally {
      setGenerating(false);
    }
  };

  const useTemplate = (prompt) => {
    sendMessage(prompt);
  };

  const GeneratedGigCard = ({ gig }) => {
    if (!gig) return null;
    if (gig.raw) {
      return (
        <div className="card-3d p-6">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap">{gig.raw}</pre>
        </div>
      );
    }
    return (
      <div className="card-3d p-6 space-y-4" style={{ animation: 'slideUp 0.5s ease-out' }}>
        <div className="flex items-start justify-between">
          <div>
            <span className="badge-green text-xs mb-2 inline-block">AI Generated</span>
            <h3 className="text-xl font-bold text-gray-900">{gig.title}</h3>
          </div>
          {gig.price_range && (
            <span className="text-lg font-bold text-gebeya-600">{gig.price_range}</span>
          )}
        </div>
        <p className="text-gray-600 leading-relaxed">{gig.description}</p>
        {gig.delivery_time && (
          <p className="text-sm text-gray-400 flex items-center gap-1">
            <Clock size={14} /> Delivery: <strong>{gig.delivery_time}</strong>
          </p>
        )}
        {gig.tags && gig.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {gig.tags.map((tag, i) => (
              <span key={i} className="badge bg-gebeya-50 text-gebeya-700 text-xs">{tag}</span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot size={24} /> AI Store Builder
            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">GLM 5.2</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Generate gigs, write descriptions, and grow your freelance business</p>
        </div>

      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[
          { id: 'chat', label: 'AI Chat', desc: 'Chat with AI assistant', icon: <MessageCircle size={16} /> },
          { id: 'generator', label: 'Gig Generator', desc: 'Generate gig listings', icon: <Zap size={16} /> },
          { id: 'website', label: 'Website Builder', desc: 'Drag & drop website builder', icon: <Layout size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === tab.id ? 'bg-white text-gebeya-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            <span className="block">{tab.label}</span>
            <span className="text-[10px] text-gray-400 font-normal hidden md:inline">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* ====== CHAT TAB ====== */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-4 gap-5">
          {/* Prompt Templates */}
          <div className="col-span-1 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText size={14} /> Templates
            </h3>
            <div className="text-[10px] text-gray-400 mb-2 uppercase tracking-wider font-semibold">Content Templates</div>
            {promptTemplates.map((t, i) => (
              <button
                key={i}
                onClick={() => useTemplate(t.prompt)}
                disabled={loading}
                className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-gebeya-200 hover:bg-gebeya-50/30 transition-all group flex items-center gap-2"
              >
                <span className="text-gebeya-500">{t.icon}</span>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gebeya-600">{t.name}</span>
              </button>
            ))}
          </div>

          {/* Chat Area */}
          <div className="col-span-3 card-3d flex flex-col" style={{ height: '600px' }}>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                     style={{ animation: 'slideUp 0.3s ease-out' }}>
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-gebeya-500 text-white rounded-br-md'
                      : 'bg-gray-50 text-gray-900 border border-gray-100 rounded-bl-md'
                  }`}>
                    {msg.loading ? (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-gebeya-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gebeya-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gebeya-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendMessage(input)}
                  placeholder="Ask the AI Store Builder anything..."
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gebeya-500/30 focus:border-gebeya-500 text-sm"
                  disabled={loading}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim()}
                  className="bg-gebeya-600 text-white px-6 py-3 rounded-xl hover:bg-gebeya-700 transition-all disabled:opacity-50 font-medium shadow-sm flex items-center gap-2"
                >
                  {loading ? (
                    <Loader size={16} className="animate-spin" />
                  ) : (
                    <><Send size={16} /> Send</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== WEBSITE BUILDER TAB ====== */}
      {activeTab === 'website' && (
        <div className="card-3d overflow-hidden">
          <WebsiteBuilder />
        </div>
      )}

      {/* ====== GIG GENERATOR TAB ====== */}
      {activeTab === 'generator' && (
        <div className="grid grid-cols-2 gap-5">
          {/* Generator Form */}
          <div className="card-3d p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Generate a Gig Listing</h3>
              <p className="text-sm text-gray-500">Describe what you want and AI will create a complete gig</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">What service do you offer?</label>
              <textarea
                value={gigTopic}
                onChange={e => setGigTopic(e.target.value)}
                placeholder="e.g., Professional Amharic to English translation for business documents..."
                rows={4}
                className="input-field resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category (optional)</label>
              <select value={gigCategory} onChange={e => setGigCategory(e.target.value)} className="input-field">
                <option value="">Auto-detect</option>
                <option value="Translation">Translation</option>
                <option value="Graphic Design">Graphic Design</option>
                <option value="Video Editing">Video Editing</option>
                <option value="Web Development">Web Development</option>
                <option value="Virtual Assistant">Virtual Assistant</option>
                <option value="Social Media Management">Social Media Management</option>
                <option value="Digital Marketing">Digital Marketing</option>
                <option value="Writing">Writing</option>
              </select>
            </div>

            <button
              onClick={handleGenerateGig}
              disabled={generating || !gigTopic.trim()}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Generate Gig
                </>
              )}
            </button>

            <div className="text-xs text-gray-400 text-center">
              Powered by GLM 5.2
            </div>
          </div>

          {/* Generated Result */}
          <div className="space-y-4">
            {generating ? (
              <div className="card-3d p-12 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-gebeya-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-500 animate-pulse">AI is crafting your gig...</p>
                </div>
              </div>
            ) : generatedGig ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles size={16} /> Generated Gig
                  </h3>
                </div>
                <GeneratedGigCard gig={generatedGig} />

                {/* Editable Price & Delivery — user overrides AI values */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-amber-600 text-sm">✏️</span>
                    <p className="text-sm font-medium text-amber-800">Set Your Price & Delivery</p>
                    <span className="text-[10px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">AI suggested — you decide</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-amber-700 mb-1">
                        Price (ETB) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={customPrice}
                        onChange={e => setCustomPrice(e.target.value)}
                        placeholder={generatedGig.price_range?.replace(/[^0-9]/g, '') || 'e.g. 500'}
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white"
                      />
                      {generatedGig.price_range && !customPrice && (
                        <p className="text-[10px] text-amber-500 mt-0.5">
                          AI suggests {generatedGig.price_range}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-amber-700 mb-1">
                        Delivery Time (days) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={customDelivery}
                        onChange={e => setCustomDelivery(e.target.value)}
                        placeholder={generatedGig.delivery_time?.replace(/[^0-9]/g, '') || 'e.g. 3'}
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white"
                      />
                      {generatedGig.delivery_time && !customDelivery && (
                        <p className="text-[10px] text-amber-500 mt-0.5">
                          AI suggests {generatedGig.delivery_time}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        setPostingGig(true);
                        // Extract first number from price_range (handle ranges like "ETB 500 - 1500")
                        const priceFromAI = generatedGig.price_range?.match(/\d+/)?.[0] || '100';
                        const price = parseInt(customPrice) || parseInt(priceFromAI);
                        const deliveryFromAI = generatedGig.delivery_time?.match(/\d+/)?.[0] || '3';
                        const delivery = parseInt(customDelivery) || parseInt(deliveryFromAI);
                        if (price <= 0 || delivery <= 0) {
                          alert('Please enter a valid price and delivery time');
                          setPostingGig(false);
                          return;
                        }
                        const fd = new FormData();
                        fd.append('title', generatedGig.title || gigTopic);
                        fd.append('description', generatedGig.description || '');
                        fd.append('price', price);
                        fd.append('category', gigCategory || 'General');
                        fd.append('deliveryTime', delivery);
                        await gigsAPI.create(fd);
                        navigate('/my-gigs');
                      } catch (err) {
                        alert('Failed to create gig: ' + (err.response?.data?.error || err.message));
                      } finally {
                        setPostingGig(false);
                      }
                    }}
                    disabled={postingGig}
                    className="flex-1 btn-primary text-sm py-3 flex items-center justify-center gap-2"
                  >
                    {postingGig ? (
                      <>
                        <Loader size={14} className="animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        🚀 Post Gig — ETB {parseInt(customPrice || generatedGig.price_range?.match(/\d+/)?.[0] || '100').toLocaleString()}
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleGenerateGig}
                    disabled={postingGig}
                    className="btn-secondary text-sm flex items-center justify-center gap-2 px-6"
                  >
                    <RefreshCw size={14} /> Regenerate
                  </button>
                </div>
              </div>
            ) : (
              <div className="card-3d p-12 flex items-center justify-center h-full">
                <div className="text-center">
                  <Bot size={48} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Generate</h3>
                  <p className="text-gray-500 text-sm max-w-sm">
                    Describe your service and click "Generate Gig" to create a professional listing with AI.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
