// Reusable animejs animation hooks
// Uses shared loader from lib/animeLoader

import { useRef, useEffect, useState, useCallback } from 'react';
import { loadAnime } from '../lib/animeLoader';

/**
 * useAnime — Core hook for animejs-powered animations
 */
export function useAnime(options = {}) {
  const ref = useRef(null);
  const animeRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const hasAnimated = useRef(false);

  const { animation = {}, scroll = false, trigger = null, once = true, delay = 0 } = options;

  useEffect(() => { loadAnime().then(() => setReady(true)); }, []);

  const play = useCallback(() => {
    if (!ref.current || !window.anime) return;
    const targets = animation.targets || ref.current;
    animeRef.current = window.anime({
      targets,
      ...animation,
      begin: () => setIsPlaying(true),
      complete: () => setIsPlaying(false),
    });
  }, [animation]);

  const pause = useCallback(() => { if (animeRef.current) animeRef.current.pause(); }, []);
  const restart = useCallback(() => { animeRef.current ? animeRef.current.restart() : play(); }, [play]);
  const reverse = useCallback(() => { if (animeRef.current) { animeRef.current.reverse(); animeRef.current.play(); } }, []);

  useEffect(() => {
    if (!ready || !ref.current) return;
    if (delay) { const t = setTimeout(play, delay); return () => clearTimeout(t); }
    play();
    return () => { if (animeRef.current) animeRef.current.pause(); };
  }, [ready, play, delay]);

  useEffect(() => {
    if (!ready || !scroll || !ref.current) return;
    const el = trigger ? document.querySelector(trigger) : ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && (!once || !hasAnimated.current)) {
            hasAnimated.current = true;
            play();
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ready, scroll, trigger, once, play]);

  return { ref, play, pause, restart, reverse, isPlaying };
}

/**
 * useAnimeCounter — Animate a number from 0 to target
 */
export function useAnimeCounter({ target, duration = 2000, easing = 'easeOutCubic', scroll = true } = {}) {
  const ref = useRef(null);
  const [displayValue, setDisplayValue] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => { loadAnime().then(() => setReady(true)); }, []);

  useEffect(() => {
    if (!ready || !ref.current) return;
    const animate = () => {
      window.anime({
        targets: {},
        current: 0,
        round: 1,
        duration,
        easing,
        update: (a) => setDisplayValue(Math.round(a.animations[0].current)),
      });
    };
    if (!scroll) { animate(); return; }
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { animate(); observer.unobserve(el); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ready, target, duration, easing, scroll]);

  return { ref, displayValue };
}

/**
 * useAnimeStagger — Staggered animation for children
 */
export function useAnimeStagger({ stagger = 80, from = 'start', direction = 'normal' } = {}) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { loadAnime().then(() => setReady(true)); }, []);

  const playStagger = useCallback((animation = {}) => {
    if (!ready || !ref.current || !window.anime || !ref.current.children.length) return;
    window.anime({
      targets: ref.current.children,
      ...animation,
      delay: window.anime.stagger(stagger, { from, direction }),
    });
  }, [ready, stagger, from, direction]);

  return { ref, ready, playStagger };
}

/**
 * useAnimeTimeline — Create and control an animejs timeline
 */
export function useAnimeTimeline() {
  const tlRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { loadAnime().then(() => setReady(true)); }, []);

  const createTimeline = useCallback((params = {}) => {
    if (!window.anime) return null;
    tlRef.current = window.anime.timeline(params);
    return tlRef.current;
  }, []);

  const addToTimeline = useCallback((animation, position) => {
    if (tlRef.current) return tlRef.current.add(animation, position);
    return null;
  }, []);

  const playTimeline = useCallback(() => { if (tlRef.current) tlRef.current.play(); }, []);
  const pauseTimeline = useCallback(() => { if (tlRef.current) tlRef.current.pause(); }, []);
  const restartTimeline = useCallback(() => { if (tlRef.current) tlRef.current.restart(); }, []);

  return { ready, createTimeline, addToTimeline, playTimeline, pauseTimeline, restartTimeline };
}
