import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * GSAP-based scroll reveal wrapper.
 * Animates children when they scroll into view.
 * 
 * @param {object} props
 * @param {'fadeUp'|'fadeDown'|'fadeLeft'|'fadeRight'|'scaleIn'|'zoomIn'|'flipIn'} props.animation - Animation type
 * @param {number} props.duration - Animation duration in seconds (default: 0.8)
 * @param {number} props.delay - Animation delay in seconds (default: 0)
 * @param {number} props.stagger - Stagger delay for children in seconds (default: 0)
 * @param {number} props.start - ScrollTrigger start position (default: 'top 85%')
 * @param {number} props.end - ScrollTrigger end position (default: 'top 30%')
 * @param {boolean} props.markers - Show ScrollTrigger markers for debugging
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children
 */
export function GsapReveal({
  children,
  animation = 'fadeUp',
  duration = 0.8,
  delay = 0,
  stagger = 0,
  start = 'top 85%',
  end = 'top 30%',
  markers = false,
  className = '',
}) {
  const sectionRef = useRef(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    // Animation variants
    const variants = {
      fadeUp:    { y: 60, opacity: 0 },
      fadeDown:  { y: -60, opacity: 0 },
      fadeLeft:  { x: -80, opacity: 0 },
      fadeRight: { x: 80, opacity: 0 },
      scaleIn:   { scale: 0.8, opacity: 0 },
      zoomIn:    { scale: 0.5, opacity: 0 },
      flipIn:    { rotationY: 90, opacity: 0 },
    };

    const from = variants[animation] || variants.fadeUp;

    // Check if children should be staggered
    const els = el.children;
    const targets = stagger > 0 && els.length > 0
      ? Array.from(els)
      : el;

    // Create the animation (gsap.set INSIDE context for proper cleanup)
    const ctx = gsap.context(() => {
      gsap.set(targets, from);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: animation === 'fadeUp' && el.getBoundingClientRect().top < window.innerHeight ? 'top 98%' : start,
          end,
          toggleActions: 'play none none reverse',
          markers,
        },
      });

      tl.to(
        targets,
        {
          y: 0,
          x: 0,
          scale: 1,
          rotationY: 0,
          opacity: 1,
          duration,
          delay,
          stagger: stagger || undefined,
          ease: 'power3.out',
        }
      );
    }, el);

    return () => ctx.revert(); // Clean up
  }, [animation, duration, delay, stagger, start, end, markers]);

  return (
    <div ref={sectionRef} className={className}>
      {children}
    </div>
  );
}

/**
 * Parallax scroll effect — background moves slower than foreground
 */
export function GsapParallax({ children, speed = 0.3, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.to(el, {
        y: `${-100 * speed}%`,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, el);

    return () => ctx.revert();
  }, [speed]);

  return <div ref={ref} className={className}>{children}</div>;
}

/**
 * Counter animation — animates a number from 0 to target
 */
export function GsapCounter({ value, suffix = '', duration = 2, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { textContent: 0 },
        {
          textContent: value,
          duration,
          ease: 'power2.out',
          snap: { textContent: 1 },
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      0{suffix}
    </span>
  );
}

/**
 * Staggered reveal for lists of items
 */
export function GsapStagger({ children, stagger = 0.08, animation = 'fadeUp', className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const variants = {
      fadeUp:    { y: 40, opacity: 0 },
      fadeDown:  { y: -40, opacity: 0 },
      fadeLeft:  { x: -40, opacity: 0 },
      fadeRight: { x: 40, opacity: 0 },
      scaleIn:   { scale: 0.9, opacity: 0 },
    };

    const from = variants[animation] || variants.fadeUp;

    const ctx = gsap.context(() => {
      gsap.set(el.children, from);
      gsap.to(el.children, {
        y: 0,
        x: 0,
        scale: 1,
        opacity: 1,
        duration: 0.6,
        stagger,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });
    }, el);

    return () => ctx.revert();
  }, [stagger, animation]);

  return <div ref={ref} className={className}>{children}</div>;
}
