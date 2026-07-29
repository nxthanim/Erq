// Animejs-powered animation components
// Uses shared loader from lib/animeLoader

import { useRef, useEffect, useState } from 'react';
import { loadAnime } from '../lib/animeLoader';

/**
 * AnimeReveal — Scroll-triggered reveal with advanced easing
 */
export function AnimeReveal({
  children,
  animation = 'fadeUp',
  duration = 800,
  delay = 0,
  stagger = 0,
  easing = 'easeOutCubic',
  once = true,
  className = '',
  style = {},
}) {
  const ref = useRef(null);
  const [state, setState] = useState('loading');
  const revealedRef = useRef(false);
  const animeReadyRef = useRef(false);

  useEffect(() => {
    loadAnime().then(() => {
      animeReadyRef.current = true;
      setState('ready');
    });

    // Fallback: if animejs fails to load within 4s, reveal content anyway
    const fallback = setTimeout(() => {
      if (!animeReadyRef.current) {
        setState('revealed');
      }
    }, 4000);
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (state !== 'ready' || !ref.current || revealedRef.current) return;

    const el = ref.current;
    const targets = stagger > 0 && el.children.length > 0
      ? Array.from(el.children)
      : el;

    const variants = {
      fadeUp:    { translateY: [60, 0], opacity: [0, 1] },
      fadeDown:  { translateY: [-60, 0], opacity: [0, 1] },
      fadeLeft:  { translateX: [-80, 0], opacity: [0, 1] },
      fadeRight: { translateX: [80, 0], opacity: [0, 1] },
      scaleIn:   { scale: [0.8, 1], opacity: [0, 1] },
      zoomIn:    { scale: [0.3, 1], opacity: [0, 1] },
      flipIn:    { rotateY: [90, 0], opacity: [0, 1] },
      elastic:   { translateY: [80, 0], scale: [0.5, 1], opacity: [0, 1], easing: 'easeOutElastic(1, .5)' },
      spring:    { translateY: [50, 0], scale: [0.9, 1], opacity: [0, 1], easing: 'spring(1, 80, 10, 0)' },
      bounce:    { translateY: [100, 0], opacity: [0, 1], easing: 'easeOutBounce' },
      rotateIn:  { rotate: [-180, 0], opacity: [0, 1], easing: 'easeOutBack' },
      skewIn:    { skewX: [20, 0], opacity: [0, 1] },
    };

    const anim = variants[animation] || variants.fadeUp;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealedRef.current = true;
            setState('revealed');

            window.anime.set(targets, {
              opacity: 0,
              translateY: animation.includes('fadeUp') || ['elastic','spring','bounce'].includes(animation) ? 60 : 0,
              translateX: animation === 'fadeRight' ? 80 : animation === 'fadeLeft' ? -80 : 0,
              scale: ['scaleIn','zoomIn','elastic','spring'].includes(animation) ? 0.8 : 1,
            });

            window.anime({
              targets,
              ...anim,
              duration,
              delay: stagger ? window.anime.stagger(stagger) : delay,
              easing,
            });

            if (once) observer.unobserve(el);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [state, animation, duration, delay, stagger, easing, once]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: state === 'revealed' ? 1 : 0, ...style }}
    >
      {children}
    </div>
  );
}

/**
 * AnimeCounter — Animated number counter
 */
export function AnimeCounter({ value, suffix = '', prefix = '', duration = 2000, easing = 'easeOutCubic', decimals = 0, scroll = true, className = '' }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);
  const [ready, setReady] = useState(false);
  const hasAnimated = useRef(false);

  useEffect(() => { loadAnime().then(() => setReady(true)); }, []);

  useEffect(() => {
    if (!ready || !ref.current) return;

    const animate = () => {
      const obj = { val: 0 };
      window.anime({
        targets: obj,
        val: value,
        duration,
        easing,
        round: decimals ? Math.pow(10, decimals) : 1,
        update: () => setDisplay(obj.val),
      });
    };

    if (!scroll) { animate(); return; }

    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          animate();
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ready, value, duration, easing, decimals, scroll]);

  const formatted = decimals > 0
    ? Number(display).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    : Math.round(display).toLocaleString();

  return <span ref={ref} className={className}>{prefix}{formatted}{suffix}</span>;
}

/**
 * AnimeStagger — Staggered reveal for children
 */
export function AnimeStagger({ children, stagger = 80, from = 'start', direction = 'normal', animation = {}, className = '' }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { loadAnime().then(() => setReady(true)); }, []);

  useEffect(() => {
    if (!ready || !ref.current || !ref.current.children.length) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const targets = Array.from(ref.current.children);
          window.anime({
            targets,
            translateY: [40, 0],
            opacity: [0, 1],
            scale: [0.95, 1],
            duration: 600,
            delay: window.anime.stagger(stagger, { from, direction }),
            easing: 'easeOutCubic',
            ...animation,
          });
          observer.unobserve(ref.current);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ready, stagger, from, direction, animation]);

  return <div ref={ref} className={className}>{children}</div>;
}

/**
 * AnimeMorph — SVG path morphing
 */
export function AnimeMorph({ paths, duration = 1500, easing = 'easeInOutCubic', loop = false, viewBox = '0 0 24 24', className = '' }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { loadAnime().then(() => setReady(true)); }, []);

  useEffect(() => {
    if (!ready || !ref.current || !paths || paths.length < 2) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          window.anime({
            targets: ref.current,
            d: paths,
            duration,
            easing,
            direction: loop ? 'alternate' : 'normal',
            loop: loop ? true : false,
          });
          observer.unobserve(ref.current);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ready, paths, duration, easing, loop]);

  return (
    <svg className={className} viewBox={viewBox} width="24" height="24">
      <path ref={ref} d={paths?.[0] || ''} fill="currentColor" />
    </svg>
  );
}

/**
 * AnimeText — Character-by-character text reveal
 */
export function AnimeText({ text, delay = 50, duration = 500, easing = 'easeOutCubic', mode = 'chars', scroll = true, className = '' }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { loadAnime().then(() => setReady(true)); }, []);

  useEffect(() => {
    if (!ready || !ref.current) return;

    const el = ref.current;
    const split = mode === 'words' ? text.split(' ') : text.split('');
    el.innerHTML = split
      .map((c, i) => {
        const content = c === ' ' ? '&nbsp;' : c;
        const spacer = mode === 'words' && i < split.length - 1 ? '&nbsp;' : '';
        return `<span style="display:inline-block;opacity:0">${content}${spacer}</span>`;
      })
      .join('');

    const animate = () => {
      window.anime({
        targets: el.querySelectorAll('span'),
        opacity: [0, 1],
        translateY: [10, 0],
        duration,
        delay: window.anime.stagger(delay),
        easing,
      });
    };

    if (!scroll) { animate(); return; }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate();
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ready, text, delay, duration, easing, mode, scroll]);

  return <span ref={ref} className={className} />;
}
