import { useState, useEffect } from 'react';
import { Play, Menu, X } from 'lucide-react';

const NAV_LINKS = ['ABOUT', 'PROCESS', 'PROJECTS', 'CATALOG', 'D.O.T', 'TALK'];

export default function PortfolioLanding() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Adam Roberts - Design & Engineering';
    return () => { document.title = prev; };
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black text-white">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover lg:scale-[1.2]"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260725_114042_d2ed2a89-f2fa-449b-9609-da456344257b.mp4"
      />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col px-5 sm:px-6 md:px-10 lg:px-14">
        {/* ── 1. NAVBAR ── */}
        <nav className="flex items-center justify-between py-6">
          {/* Logo */}
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256" fill="none" className="shrink-0">
            <path d="M 160 88 L 194 34 L 216 0 L 256 0 L 256 40 L 221.5 93.5 L 200 128 L 256 128 L 256 256 L 96 256 L 96 168 L 64.246 220 L 40 256 L 0 256 L 0 216 L 34 162 L 56 128 L 0 128 L 0 0 L 160 0 Z" fill="white" />
          </svg>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <a key={link} href="#" className="text-sm tracking-wide hover:opacity-70 transition-opacity">
                {link}
              </a>
            ))}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden p-2 hover:opacity-70 transition-opacity"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </nav>

        {/* ── 2. FOUR-COLUMN META GRID ── */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* COL 1 */}
          <div>
            <h2 className="text-lg md:text-xl tracking-wide leading-tight">
              <div className="font-normal" style={{ fontFamily: 'Inter, sans-serif' }}>ADAM</div>
              <div className="font-pixel text-2xl md:text-3xl">ROBERTS</div>
            </h2>
            <p className="text-[10px] text-white/50 mt-3">*</p>
            <p className="font-pixel mt-1 text-xs text-white/60 leading-relaxed">
              Grilled Pixels is my<br />
              personal brand - I came up<br />
              with it in 2004 based on<br />
              "cooking up ideas"
            </p>
          </div>

          {/* COL 2 */}
          <div className="text-right lg:text-left">
            <h2 className="text-lg md:text-xl tracking-wide leading-tight">
              <div className="font-normal" style={{ fontFamily: 'Inter, sans-serif' }}>DESIGN &</div>
              <div className="font-pixel text-2xl md:text-3xl">ENGINEERING</div>
            </h2>
          </div>

          {/* COL 3 */}
          <div>
            <p className="font-pixel text-base tracking-widest text-white/50 uppercase mb-3">What I Do</p>
            <p className="text-sm text-white/90 leading-relaxed max-w-[220px]">
              I create the top 1% of experiences for brands and digital products
            </p>
          </div>

          {/* COL 4 */}
          <div className="text-right lg:text-left">
            <p className="font-pixel text-base tracking-widest text-white/50 uppercase mb-3">Services</p>
            <ul className="text-sm text-white/90 leading-relaxed space-y-0.5">
              <li>Branding</li>
              <li>Creative Direction & Strategy</li>
              <li>UX/UI Design</li>
              <li>Web Development (React/Nextjs)</li>
              <li>3D, WebGL / Photography</li>
              <li>Video & Animation</li>
            </ul>
          </div>
        </div>

        {/* ── 3. FLEX SPACER ── */}
        <div className="flex-1" />

        {/* ── 4. BOTTOM SECTION ── */}
        <div className="pb-4">
          {/* ROW A */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-end">
            {/* LEFT — Hero headline */}
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.75rem] xl:text-[4.25rem] tracking-wide uppercase font-normal"
              style={{ lineHeight: 0.72, fontFamily: 'Inter, sans-serif' }}
            >
              I BRING THE<br />
              <span className="font-pixel font-normal text-[1.25em] inline-block leading-none align-baseline">UNEXPECTED</span> TO<br />
              BRAND &amp; DIGITAL<br />
              <span className="font-pixel font-normal text-[1.25em] inline-block leading-none align-baseline">EXPERIENCES</span>
            </h1>

            {/* RIGHT */}
            <div className="flex flex-col gap-4 sm:gap-6 justify-end">
              {/* PLAY SHOWREEL button */}
              <button
                className="self-start flex items-center gap-3 border border-white/30 px-6 py-3 backdrop-blur-sm bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Play size={14} fill="white" />
                <span className="text-sm tracking-wider">PLAY SHOWREEL</span>
              </button>

              {/* Awards row */}
              <div className="self-start lg:self-end flex flex-wrap items-stretch gap-2 sm:gap-3 text-sm text-white/80">
                <div className="bg-[#0B0B0B] px-3 sm:px-4 py-2 flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base tracking-tight">FWA</span>
                  <span className="text-white/50 text-xs">x1</span>
                </div>
                <div className="bg-[#0B0B0B] px-3 sm:px-4 py-2 flex items-center gap-2">
                  <span className="font-bold text-lg sm:text-xl">W.</span>
                  <span className="text-white/50 text-xs">x7</span>
                </div>
                <div className="bg-[#0B0B0B] px-3 sm:px-4 py-2 flex items-center gap-2">
                  <span className="font-bold text-[10px] sm:text-xs tracking-tight">CSSDesignAwards</span>
                  <span className="text-white/50 text-xs">x22</span>
                </div>
              </div>
            </div>
          </div>

          {/* ROW B — Footer strip */}
          <div className="mt-4 sm:mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 pt-4 border-t border-white/10">
            <p className="text-xs text-white/60">
              Open to freelance, contract or full-time.{' '}
              <a href="#" className="text-red-500 hover:text-red-400 transition-colors">Schedule a call</a>
            </p>
            <p className="text-xs text-white/60 sm:text-right">
              5 full cases • 82 archive fragments • 22 catalog items
            </p>
          </div>
        </div>
      </div>

      {/* ── MOBILE FULLSCREEN MENU ── */}
      <div
        className={`fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Menu header */}
        <div className="flex items-center justify-between px-6 py-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256" fill="none">
            <path d="M 160 88 L 194 34 L 216 0 L 256 0 L 256 40 L 221.5 93.5 L 200 128 L 256 128 L 256 256 L 96 256 L 96 168 L 64.246 220 L 40 256 L 0 256 L 0 216 L 34 162 L 56 128 L 0 128 L 0 0 L 160 0 Z" fill="white" />
          </svg>
          <button
            onClick={() => setMenuOpen(false)}
            className="p-2 hover:opacity-70 transition-opacity"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Nav links */}
        <div className="flex flex-col items-center justify-center flex-1 gap-8">
          {NAV_LINKS.map((link, i) => (
            <a
              key={link}
              href="#"
              onClick={() => setMenuOpen(false)}
              className="text-2xl tracking-widest transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? 'translateY(0)' : 'translateY(1rem)',
                transitionDelay: menuOpen ? `${100 + i * 60}ms` : '0ms',
              }}
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
