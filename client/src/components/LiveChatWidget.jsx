import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Bot, User, ChevronDown } from 'lucide-react';

const AUTO_REPLIES = [
  { keywords: ['hello', 'hi', 'hey', 'help'], reply: 'Hi there! 👋 Welcome to Erq support. How can I help you today? You can ask about gigs, payments, or account issues.' },
  { keywords: ['payment', 'pay', 'escrow', 'telebirr'], reply: '💳 Erq uses secure escrow payments with TeleBirr integration. Funds are held safely until work is completed. Need help with a specific payment?' },
  { keywords: ['gig', 'service', 'freelancer', 'hire'], reply: '🎯 Browse thousands of services in our marketplace! You can search by category, read reviews, and hire top freelancers. What kind of service are you looking for?' },
  { keywords: ['account', 'login', 'signup', 'register', 'profile'], reply: '🔐 Creating an account is free! Sign up as a freelancer or client. You can manage your profile, view transactions, and track your activity.' },
  { keywords: ['refund', 'cancel', 'dispute'], reply: '⚖️ For disputes or cancellations, please visit our Dispute Center in your dashboard. We\'ll help mediate and find a fair solution.' },
];

function getAutoReply(message) {
  const lower = message.toLowerCase();
  for (const item of AUTO_REPLIES) {
    if (item.keywords.some(k => lower.includes(k))) {
      return item.reply;
    }
  }
  return null;
}

const QUICK_ACTIONS = [
  { label: '💳 Payments', message: 'How do payments work?' },
  { label: '🎯 Find Gigs', message: 'How do I find gigs?' },
  { label: '🔐 Account', message: 'Help with my account' },
  { label: '⚖️ Disputes', message: 'I need help with a dispute' },
];

export default function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'bot', content: '👋 Hi! Welcome to Erq! How can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (text) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    // Add user message
    const userMsg = { id: Date.now(), role: 'user', content: messageText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate bot thinking
    setTimeout(() => {
      const autoReply = getAutoReply(messageText);
      const reply = autoReply || '🤔 Thanks for your message! Our team will get back to you shortly. For immediate help, check our Help Center or email support@erq.com.';
      const botMsg = { id: Date.now() + 1, role: 'bot', content: reply };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1500);
  };

  const handleQuickAction = (action) => {
    handleSend(action.message);
  };

  return (
    <>
      {/* Chat bubble button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-gray-900 text-white shadow-xl flex items-center justify-center hover:bg-gray-800 transition-all"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={isOpen ? { rotate: 45 } : { rotate: 0 }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-24 right-8 z-40 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden"
            style={{ maxHeight: '500px' }}
          >
            {/* Header */}
            <div className="bg-gray-900 text-white p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Erq Support</h3>
                  <p className="text-xs text-white/60">Typically replies instantly</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: '320px', minHeight: '250px' }}>
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      msg.role === 'user' 
                        ? 'bg-gray-200' 
                        : 'bg-gray-900 text-white'
                    }`}>
                      {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                    </div>
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gray-900 text-white rounded-tr-md'
                        : 'bg-gray-100 text-gray-800 rounded-tl-md'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
                      <Bot size={12} className="text-white" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <motion.div key={i}
                            animate={{ opacity: [0, 1, 0], y: [0, -3, 0] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                            className="w-1.5 h-1.5 rounded-full bg-gray-400"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick actions */}
            {messages.length <= 2 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map(action => (
                  <button key={action.label} onClick={() => handleQuickAction(action)}
                    className="text-[10px] px-2.5 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-gray-100">
              <div className="flex items-center gap-2 p-1.5 rounded-xl bg-gray-50 border border-gray-200 focus-within:border-gray-400 transition-all">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent px-2 py-1 text-sm outline-none text-gray-800 placeholder-gray-400"
                />
                <button onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center disabled:opacity-40 hover:bg-gray-800 transition-all shrink-0"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
