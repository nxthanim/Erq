import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge-progress-dialog';
import { Image, Palette, Bot, ClipboardCopy, Rocket, Sparkles, Camera, Type, FileText, X, Smartphone, Check, RefreshCw, Circle, Flag, PenTool, Shield, CheckCircle, Loader, Eye, Monitor } from 'lucide-react';

// ====== PLACEHOLDER IMAGE COMPONENT ======
function ScreenshotSlot({ label, prompt, status, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group cursor-pointer"
      onClick={onClick}
    >
      <div
        className="rounded-clay overflow-hidden transition-all duration-300 group-hover:-translate-y-1"
        style={{
          boxShadow: '10px 10px 30px rgba(0,0,0,0.06), inset -5px -5px 15px rgba(0,0,0,0.02), inset 5px 5px 15px rgba(255,255,255,0.7)',
          backgroundColor: status === 'generated' ? '#f5efe6' : '#faf7f2',
          minHeight: 200,
        }}
      >
        {/* Image area */}
        <div className="relative aspect-[16/10] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#f5efe6] to-[#ebe0d0]">
          {status === 'generated' ? (
            <div className="w-full h-full flex items-center justify-center">
              <Image size={48} className="opacity-40 text-[#a6967e]" />
            </div>
          ) : status === 'generating' ? (
            <motion.div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: '#f5efe6', boxShadow: 'inset 3px 3px 8px rgba(0,0,0,0.04), inset -2px -2px 5px rgba(255,255,255,0.7)' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Loader size={24} className="text-[#a6967e]" />
            </motion.div>
          ) : (
            <div className="text-center p-6">
              <motion.div
                className="w-20 h-20 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: '#f5efe6', boxShadow: '8px 8px 24px rgba(0,0,0,0.06), inset -4px -4px 12px rgba(0,0,0,0.02), inset 4px 4px 12px rgba(255,255,255,0.6)' }}
                whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
              >
                <Bot size={36} className="text-[#a6967e]" />
              </motion.div>
              <p className="text-xs text-[#a6967e] font-medium">Generate with Pika</p>
            </div>
          )}

          {/* Status overlay */}
          <div className="absolute top-3 right-3">
            <Badge variant={status === 'generated' ? 'success' : status === 'generating' ? 'warning' : 'default'} className="text-[9px]">
              {status === 'generated' ? <><Check size={8} className="inline mr-0.5" /> Generated</> : status === 'generating' ? <><RefreshCw size={8} className="inline mr-0.5 animate-spin" /> Generating</> : 'Pending'}
            </Badge>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h4 className="text-sm font-semibold text-[#433930]">{label}</h4>
          <p className="text-[10px] text-[#a6967e] mt-1 line-clamp-2 leading-relaxed">{prompt}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ====== PROMPT CARD ======
function PromptCard({ prompt, onCopy }) {
  return (
    <div className="p-3 rounded-xl text-[11px] leading-relaxed font-mono cursor-pointer hover:-translate-y-0.5 transition-all"
      style={{
        backgroundColor: '#f5efe6',
        boxShadow: 'inset 3px 3px 8px rgba(0,0,0,0.04), inset -2px -2px 5px rgba(255,255,255,0.7)',
        color: '#5f5140',
      }}
      onClick={() => { navigator.clipboard?.writeText(prompt); onCopy?.(); }}
      title="Click to copy"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] uppercase tracking-wider font-semibold text-[#a6967e]">Pika Prompt</span>
        <span className="text-[9px] text-[#1a1a1a] flex items-center gap-1">
          <ClipboardCopy size={9} /> Copy
        </span>
      </div>
      {prompt}
    </div>
  );
}

// ====== MAIN PAGE ======
export default function BrandPage() {
  const [activeTab, setActiveTab] = useState('screenshots');
  const [copyFeedback, setCopyFeedback] = useState('');

  const handleCopy = () => {
    setCopyFeedback('Copied!');
    setTimeout(() => setCopyFeedback(''), 2000);
  };

  // Logo generation prompts
  const logoScreenshots = [
    {
      label: 'Main Logo',
      status: 'pending',
      prompt: 'Modern minimalist logo for "Erq" marketplace. Clean sans-serif typography with the word "Erq" in bold green (#1a1a1a). A subtle Ethiopian cross or star motif integrated into the letter "E". Warm earth-tone background (#f5efe6). Professional tech-startup aesthetic with Ethiopian identity. SVG-friendly flat design. No photos, just logo mark.',
    },
    {
      label: 'Logo Icon Mark',
      status: 'pending',
      prompt: 'Standalone icon mark for Erq marketplace. A stylized Ethiopian "E" with green gradient (#1a1a1a to #333333). Geometric and modern, inspired by Ethiopian cross patterns. Simple enough for favicon usage. Glossy claymorphism texture. Isolated on transparent background. Tech startup aesthetic.',
    },
    {
      label: 'Logo - Dark Variant',
      status: 'pending',
      prompt: 'Dark mode variant of Erq marketplace logo. The word "Erq" in bright green (#555555) on dark clay background (#433930). Subtle glow effect. Same Ethiopian cross/star motif. Professional and premium feel. For dark-themed landing pages and dashboards.',
    },
    {
      label: 'Social Media Kit',
      status: 'pending',
      prompt: 'Social media brand kit for Erq marketplace. A flat lay showing: logo on business card, laptop screen showing homepage, phone showing mobile app, green notebook with brand sketches, Ethiopian coffee beans. Warm clay tones. Professional photography style with warm lighting. Perfect for LinkedIn and Twitter banner.',
    },
  ];

  // Screenshot data
  const screenshots = [
    {
      label: 'Homepage Hero',
      status: 'pending',
      prompt: 'A modern Ethiopian freelance marketplace homepage hero — warm clay tones (#faf7f2, #f5efe6), green accents (#1a1a1a). Show a diverse team of freelancers collaborating around a glowing laptop. The Erq logo is in the top-left. Clean UI with search bar. Claymorphism card style. Ethiopian-inspired pattern subtle background.',
    },
    {
      label: 'Marketplace Grid',
      status: 'pending',
      prompt: 'Erq marketplace gig listing grid with claymorphism card design. Warm beige backgrounds (#f5efe6), green CTA buttons. Show 6 gig cards with profile avatars, prices in ETB, star ratings. Categories sidebar on left. Ethiopian cultural patterns subtly in background.',
    },
    {
      label: 'Analytics Dashboard',
      status: 'pending',
      prompt: 'Financial analytics dashboard for Erq marketplace. SVG line charts showing revenue growth (MRR, ARR), bar charts for daily balance. Claymorphism cards with warm clay tones. Green gradient accents. Time range selectors. Modern data visualization with soft shadows.',
    },
    {
      label: 'Profile - Freelancer',
      status: 'pending',
      prompt: 'Erq freelancer profile page with claymorphism design. Portfolio gallery grid, skill badges in green tones, rating stars, completed jobs count. Avatar with online status dot. Warm beige and cream palette. Ethiopian-inspired UI elements.',
    },
    {
      label: 'AI Store Builder',
      status: 'pending',
      prompt: 'AI-powered store builder interface for Erq marketplace. Step-by-step wizard with claymorphism cards. Preview pane showing an online store with Ethiopian products. AI suggestions panel on right. Green accent buttons. Clean modern layout.',
    },
    {
      label: 'Mobile App',
      status: 'pending',
      prompt: 'Mobile view of Erq freelance marketplace. iPhone mockup showing the gig details page with claymorphism card design. Bottom navigation dock. Green notification badges. Ethiopian flag colors subtly in the brand elements. Warm clay backgrounds.',
    },
    {
      label: 'Dispute Resolution',
      status: 'pending',
      prompt: 'Erq dispute resolution center with admin panel. Split-screen view showing client and freelancer evidence. Resolution buttons: Refund, Release, Split 50/50. Claymorphism cards, warm tones, green accents. Escrow balance widget.',
    },
    {
      label: 'Referral System',
      status: 'pending',
      prompt: 'Erq referral system page with shareable link, stats counter showing signups and earnings. Confetti celebration effect. Friend referral card with avatar. Warm clay background with green accent buttons. Ethiopian "Habesha" aesthetic modernized.',
    },
  ];

  // Brand colors
  const brandColors = [
    { name: 'Clay 50', hex: '#faf7f2', usage: 'Page background' },
    { name: 'Clay 100', hex: '#f5efe6', usage: 'Cards, surfaces' },
    { name: 'Clay 200', hex: '#ebe0d0', usage: 'Borders, dividers' },
    { name: 'Clay 300', hex: '#dcc8ae', usage: 'Subtle accents' },
    { name: 'Ice 900', hex: '#433930', usage: 'Headings, primary text' },
    { name: 'Ice 700', hex: '#5f5140', usage: 'Body text' },
    { name: 'Ice 500', hex: '#75644f', usage: 'Secondary text' },
    { name: 'Ice 400', hex: '#a6967e', usage: 'Disabled, placeholder' },
    { name: 'Gebeya 500', hex: '#555555', usage: 'Primary buttons, accents' },
    { name: 'Gebeya 600', hex: '#1a1a1a', usage: 'Hover states' },
    { name: 'Gebeya 700', hex: '#333333', usage: 'Active, dark accents' },
    { name: 'Gebeya 100', hex: '#e0e0e0', usage: 'Success badges, bg' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-[#433930] flex items-center gap-2">
            <Palette size={24} className="text-[#433930]" /> Brand Identity
            <Badge variant="info" className="text-[10px]">Pika AI</Badge>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#75644f' }}>
            AI-generated product screenshots & brand assets — powered by Pika
          </p>
        </div>
        {copyFeedback && (
          <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-[#1a1a1a] font-medium flex items-center gap-1">
            <CheckCircle size={12} /> {copyFeedback}
          </motion.span>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="screenshots"><Camera size={14} className="mr-1" /> Screenshots</TabsTrigger>
          <TabsTrigger value="logo"><Type size={14} className="mr-1" /> Logo Kit</TabsTrigger>
          <TabsTrigger value="palette"><Palette size={14} className="mr-1" /> Color Palette</TabsTrigger>
          <TabsTrigger value="prompts"><FileText size={14} className="mr-1" /> All Prompts</TabsTrigger>
        </TabsList>

        {/* Tab 1: Logo Kit */}
        <TabsContent value="logo">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type size={18} /> Logo & Brand Kit
                <Badge variant="info" className="text-[9px]">Pika AI</Badge>
              </CardTitle>
              <CardDescription>
                Generate your Erq marketplace logo, icon mark, dark variant, and social media kit using Pika AI.
                Each logo asset is designed to match the claymorphism aesthetic.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {logoScreenshots.map((shot, i) => (
                  <ScreenshotSlot key={i} {...shot} onClick={() => {}} />
                ))}
              </div>
              <div className="mt-6 p-5 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #faf7f2, #f5efe6)', border: '1px solid rgba(235,224,208,0.5)' }}>
                <h4 className="text-sm font-bold text-[#433930] mb-3 flex items-center gap-2">
                  <PenTool size={16} /> Logo Usage Guidelines
                </h4>
                <div className="grid grid-cols-4 gap-4 text-xs">
                  {[
                    { icon: <PenTool size={20} />, title: 'Minimum Size', desc: '32px for icon, 120px for full logo' },
                    { icon: <Palette size={20} />, title: 'Colors', desc: 'Green (#1a1a1a) on clay (#f5efe6) or white' },
                    { icon: <X size={20} />, title: 'Donts', desc: 'No stretching, no recoloring, no effects' },
                    { icon: <Smartphone size={20} />, title: 'Formats', desc: 'SVG for web, PNG for social, favicon for browser' },
                  ].map((g, i) => (
                    <div key={i} className="p-3 rounded-xl text-center" style={{ backgroundColor: '#faf7f2', boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.03)' }}>
                      <span className="text-xl block mb-1 flex justify-center">{g.icon}</span>
                      <p className="font-semibold text-[#433930]">{g.title}</p>
                      <p className="text-[#a6967e] mt-0.5">{g.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Screenshots Grid */}
        <TabsContent value="screenshots">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot size={18} /> Generate with Pika
                </CardTitle>
                <CardDescription>Generate product screenshots. Click any slot and run its prompt in Pika.
                  Each image will be used across the website as product branding.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {screenshots.map((shot, i) => (
                    <ScreenshotSlot key={i} {...shot} onClick={() => {}} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* How to generate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket size={18} /> How to Generate
                </CardTitle>
                <CardDescription>Two ways to generate all 8 brand screenshots</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {/* Option 1: Script */}
                  <div className="p-5 rounded-xl"
                    style={{ background: 'linear-gradient(135deg, #faf7f2, #f5efe6)', border: '1px solid rgba(235,224,208,0.5)',
                      boxShadow: '8px 8px 24px rgba(0,0,0,0.04), inset -4px -4px 12px rgba(0,0,0,0.02), inset 4px 4px 12px rgba(255,255,255,0.5)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: '#f5efe6', boxShadow: '6px 6px 18px rgba(0,0,0,0.06), inset -3px -3px 10px rgba(0,0,0,0.02), inset 3px 3px 10px rgba(255,255,255,0.6)' }}>
                        <Rocket size={22} className="text-[#433930]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#433930]">Option 1: Run the Script</p>
                        <p className="text-[10px] text-[#a6967e]">One command generates all 8 images</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg text-xs font-mono"
                      style={{ backgroundColor: '#433930', color: '#555555' }}>
                      <p className="mb-1"># Install Pika skills first:</p>
                      <p className="mb-2 text-[#a6967e]">npx skills add Pika-Labs/Pika-Plugins -all -y</p>
                      <p className="mb-1"># Then run the generator:</p>
                      <p className="text-[#555555]">bash scripts/generate-brand-images.sh</p>
                    </div>
                    <p className="text-[10px] text-[#a6967e] mt-2">
                      Images saved to <code className="text-[#433930] font-semibold">/public/brand/</code>
                    </p>
                  </div>

                  {/* Option 2: Manual */}
                  <div className="p-5 rounded-xl"
                    style={{ background: 'linear-gradient(135deg, #faf7f2, #f5efe6)', border: '1px solid rgba(235,224,208,0.5)',
                      boxShadow: '8px 8px 24px rgba(0,0,0,0.04), inset -4px -4px 12px rgba(0,0,0,0.02), inset 4px 4px 12px rgba(255,255,255,0.5)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: '#f5efe6', boxShadow: '6px 6px 18px rgba(0,0,0,0.06), inset -3px -3px 10px rgba(0,0,0,0.02), inset 3px 3px 10px rgba(255,255,255,0.6)' }}>
                        <ClipboardCopy size={22} className="text-[#433930]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#433930]">Option 2: One by One</p>
                        <p className="text-[10px] text-[#a6967e]">Copy prompts from the Prompts tab</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { step: '1', title: 'Copy the Prompt', desc: 'Switch to the Prompts tab and click any prompt to copy.' },
                        { step: '2', title: 'Generate in Pika', desc: 'Open Pika.me or your MCP client and paste the prompt.' },
                        { step: '3', title: 'Save to /public/brand/', desc: 'Name the file matching the screenshot label (e.g. hero-homepage.png).' },
                      ].map((s, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
                            style={{ backgroundColor: '#e0e0e0', color: '#333333' }}>{s.step}</span>
                          <div>
                            <p className="text-xs font-semibold text-[#433930]">{s.title}</p>
                            <p className="text-[9px] text-[#a6967e]">{s.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Color Palette */}
        <TabsContent value="palette">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette size={18} /> Brand Color Palette
              </CardTitle>
              <CardDescription>Claymorphism warm tones with green accents for Erq marketplace</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {brandColors.map((c, i) => (
                  <motion.div key={c.hex} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#faf7f2] transition-all">
                    <div className="w-12 h-12 rounded-xl shrink-0" style={{ backgroundColor: c.hex, boxShadow: '3px 3px 8px rgba(0,0,0,0.06), inset -2px -2px 5px rgba(0,0,0,0.02), inset 2px 2px 5px rgba(255,255,255,0.5)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#433930]">{c.name}</p>
                      <p className="text-[10px] text-[#a6967e]">{c.usage}</p>
                    </div>
                    <code className="text-xs font-mono text-[#75644f] bg-[#faf7f2] px-2 py-1 rounded-lg">{c.hex}</code>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card className="mt-5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type size={18} /> Typography
              </CardTitle>
              <CardDescription>The Erq brand uses rounded, friendly fonts for claymorphism aesthetic</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#faf7f2', boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.03)' }}>
                <p className="text-xs text-[#a6967e] mb-1">Headings</p>
                <p className="text-2xl font-bold text-[#433930]" style={{ fontFamily: "'Nunito', sans-serif" }}>Nunito Bold — The Quick Brown Fox</p>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#faf7f2', boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.03)' }}>
                <p className="text-xs text-[#a6967e] mb-1">Body</p>
                <p className="text-base text-[#5f5140]" style={{ fontFamily: "'Quicksand', sans-serif" }}>Quicksand Regular — The quick brown fox jumps over the lazy dog. የኔ ስም ናትናኤል ነው።</p>
              </div>
            </CardContent>
          </Card>

          {/* Design Principles */}
          <Card className="mt-5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool size={18} /> Design Principles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { icon: <Circle size={24} className="text-amber-800" fill="#dcc8ae" />, title: 'Claymorphism', desc: 'Warm beige surfaces with dual shadows creating a puffy, tactile feel' },
                  { icon: <Circle size={24} className="text-green-600" fill="#1a1a1a" />, title: 'Green Accents', desc: 'Gebeya green (#1a1a1a) for CTAs, active states, and success indicators' },
                  { icon: <RefreshCw size={22} className="text-[#433930]" />, title: 'Magnetic Motion', desc: 'Spring-based animations for hover effects, magnetic dock, and transitions' },
                  { icon: <Flag size={22} className="text-[#433930]" />, title: 'Ethiopian Identity', desc: 'Subtle cultural patterns, warm earth tones, TeleBirr integration' },
                ].map((p, i) => (
                  <div key={i} className="p-4 rounded-xl text-center"
                    style={{ background: 'linear-gradient(135deg, #faf7f2, #f5efe6)', border: '1px solid rgba(235,224,208,0.5)' }}>
                    <span className="text-2xl block mb-2 flex justify-center">{p.icon}</span>
                    <p className="text-sm font-semibold text-[#433930]">{p.title}</p>
                    <p className="text-[10px] text-[#a6967e] mt-1">{p.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: All Prompts */}
        <TabsContent value="prompts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={18} /> All Pika Generation Prompts
              </CardTitle>
              <CardDescription>Click any prompt to copy. Run in Pika to generate your brand assets.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {screenshots.map((shot, i) => (
                  <div key={i}>
                    <h4 className="text-sm font-semibold text-[#433930] mb-2 flex items-center gap-2">
                      <Badge variant="info" className="text-[9px]">{i + 1}</Badge>
                      {shot.label}
                    </h4>
                    <PromptCard prompt={shot.prompt} onCopy={handleCopy} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
