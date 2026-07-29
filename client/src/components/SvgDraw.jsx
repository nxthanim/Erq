// SVG Draw Animation Component
// Uses animejs v4's svg.createDrawable(target) API for path drawing animations

import { useEffect, useRef, useState } from 'react';
import { loadAnime } from '../lib/animeLoader';

// ====== REAL SVG PATH DATA for "Erq" letters ======
// Each letter is a stroke-based path that can be drawn with svg.createDrawable
const ERQ_PATHS = {
  E: [
    // Capital E - single continuous stroke
    'M5,5 L35,5 M5,5 L5,35 M5,20 L28,20 M5,35 L35,35',
  ],
  r: [
    // Lowercase r - single stroke
    'M40,12 L40,35 M40,12 Q40,5 48,5 L48,18 L40,22',
  ],
  q: [
    // Lowercase q - single stroke
    'M55,12 Q55,5 65,5 Q75,5 75,12 L75,30 Q75,37 65,37 Q55,37 55,30 M65,12 L65,37 M62,40 L68,50',
  ],
};

// Combine all paths into a single flat array
const ERQ_ALL_PATHS = [
  { d: 'M5,5 L35,5 M5,5 L5,35 M5,20 L28,20 M5,35 L35,35', delay: 0 },     // E
  { d: 'M40,12 L40,35 M40,12 Q40,5 48,5 L48,18 L40,22', delay: 600 },      // r
  { d: 'M55,12 Q55,5 65,5 Q75,5 75,12 L75,30 Q75,37 65,37 Q55,37 55,30 M65,12 L65,37 M62,40 L68,50', delay: 1200 }, // q
];

// ====== CLEANUP HELPER ======
function clearChildPaths(parent) {
  if (!parent) return;
  const paths = parent.querySelectorAll('path.svg-draw-path');
  paths.forEach(p => p.remove());
}

/**
 * SvgDrawLine — Animate an SVG path drawing itself
 */
export default function SvgDrawLine({
  path,
  duration = 1500,
  strokeColor = '#1a1a1a',
  strokeWidth = 2,
  easing = 'easeInOutCubic',
  scroll = false,
  loop = false,
  reverse = false,
  className = '',
  viewBox = '0 0 300 50',
  width = '100%',
  height = '100%',
}) {
  const pathRef = useRef(null);
  const [ready, setReady] = useState(false);
  const animRef = useRef(null);

  useEffect(() => { loadAnime().then(() => setReady(true)); }, []);

  useEffect(() => {
    if (!ready || !pathRef.current || !window.anime) return;

    const { svg } = window.anime;

    const startDraw = () => {
      try {
        const [drawable] = svg.createDrawable(pathRef.current);
        const f = reverse ? '0 1' : '0 0';
        const t = reverse ? '0 0' : '0 1';
        animRef.current = window.anime.animate(drawable, {
          draw: [f, t],
          duration,
          easing,
          direction: loop ? 'alternate' : 'normal',
          loop: loop ? true : false,
        });
      } catch (e) {
        if (pathRef.current) pathRef.current.style.opacity = '1';
      }
    };

    if (!scroll) { startDraw(); return () => { if (animRef.current) animRef.current.pause(); }; }

    const el = pathRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { startDraw(); observer.unobserve(el); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => { observer.disconnect(); if (animRef.current) animRef.current.pause(); };
  }, [ready, path, duration, easing, loop, reverse, scroll]);

  return (
    <svg className={`${className} svg-draw-line`} viewBox={viewBox} width={width} height={height} style={{ overflow: 'visible' }}>
      <path
        ref={pathRef}
        d={path}
        fill="none"
        className="svg-draw-path"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.01 }}
      />
    </svg>
  );
}

/**
 * SvgDrawErq — Animate drawing the actual "Erq" word using real letter paths
 * Uses animejs v4's svg.createDrawable(target) on each letter path segment
 */
export function SvgDrawErq({
  duration = 2500,
  strokeColor = '#1a1a1a',
  strokeWidth = 1.5,
  easing = 'easeOutCubic',
  scroll = false,
  loop = false,
  className = '',
  viewBox = '0 0 80 55',
  width = '100%',
  height = '100%',
}) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const animRefs = useRef([]);

  useEffect(() => { loadAnime().then(() => setReady(true)); }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.anime?.svg) return;

    const { svg } = window.anime;

    // Clean up previous paths
    clearChildPaths(containerRef.current);
    animRefs.current.forEach(a => a?.pause());
    animRefs.current = [];

    // Create a path element for each segment
    const startDraw = () => {
      ERQ_ALL_PATHS.forEach((seg) => {
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', seg.d);
        pathEl.setAttribute('fill', 'none');
        pathEl.setAttribute('stroke', strokeColor);
        pathEl.setAttribute('stroke-width', strokeWidth);
        pathEl.setAttribute('stroke-linecap', 'round');
        pathEl.setAttribute('stroke-linejoin', 'round');
        pathEl.classList.add('svg-draw-path');
        containerRef.current.appendChild(pathEl);

        try {
          const [drawable] = svg.createDrawable(pathEl);
          const anim = window.anime.animate(drawable, {
            draw: ['0 0', '0 1'],
            duration: duration * 0.4,
            delay: seg.delay || 0,
            easing,
          });
          animRefs.current.push(anim);
        } catch (e) {
          pathEl.style.opacity = '1';
        }
      });
    };

    if (!scroll) { startDraw(); return () => { animRefs.current.forEach(a => a?.pause()); }; }

    const el = containerRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { startDraw(); observer.unobserve(el); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => { observer.disconnect(); animRefs.current.forEach(a => a?.pause()); };
  }, [ready, duration, easing, strokeColor, strokeWidth, loop, scroll]);

  return (
    <svg ref={containerRef} className={className} viewBox={viewBox} width={width} height={height} style={{ overflow: 'visible' }} />
  );
}

/**
 * SvgDrawTabIndicator — Animated tab indicator using <rect> (createDrawable supports <rect>)
 * Uses a rect that draws itself horizontally to indicate active tab
 */
export function SvgDrawTabIndicator({ activeIndex, tabCount = 6, duration = 800, className = '' }) {
  const rectRef = useRef(null);
  const [ready, setReady] = useState(false);
  const animRef = useRef(null);

  useEffect(() => { loadAnime().then(() => setReady(true)); }, []);

  useEffect(() => {
    if (!ready || !rectRef.current || !window.anime?.svg) return;

    const { svg } = window.anime;

    // Use percentage-based x position on the rect (SVG supports % on rect x, width)
    const tabPct = 100 / tabCount;
    const xPct = activeIndex * tabPct;
    const wPct = tabPct * 0.8;
    const centerOffset = tabPct * 0.1;

    // Set rect position: x as percentage, width as percentage
    rectRef.current.setAttribute('x', `${xPct + centerOffset}%`);

    try {
      const [drawable] = svg.createDrawable(rectRef.current);
      if (animRef.current) animRef.current.pause();
      animRef.current = window.anime.animate(drawable, {
        draw: ['0 0', '0 1'],
        duration,
        easing: 'easeOutCubic',
      });
    } catch (e) {
      // Fallback: just show the rect
      rectRef.current.style.opacity = '1';
    }

    return () => { if (animRef.current) animRef.current.pause(); };
  }, [ready, activeIndex, tabCount, duration]);

  return (
    <svg className={className} width="100%" height="3" style={{ overflow: 'visible', position: 'absolute', bottom: 0, left: 0 }}>
      <rect
        ref={rectRef}
        y="0"
        height="3"
        width={`${(100 / tabCount) * 0.8}%`}
        rx="1.5"
        ry="1.5"
        fill="#1a1a1a"
        style={{ opacity: 0.01 }}
      />
    </svg>
  );
}
