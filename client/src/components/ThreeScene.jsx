import { useEffect, useRef, useState } from 'react';

// Lazy-load Three.js to avoid blocking initial render
let THREE = null;

async function loadThree() {
  if (THREE) return THREE;
  const mod = await import('three');
  THREE = mod;
  return THREE;
}

export default function ThreeScene({ className = '' }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const mountedRef = useRef(true);
  const [visible, setVisible] = useState(false);

  // Only load Three.js when scrolled into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;

    mountedRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer = null;
    let scene = null;
    let camera = null;
    let animationId = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let orbGroup = null;
    let coreMesh = null;
    let glowMesh = null;
    let auraMesh = null;
    let sparkles = null;
    let time = 0;

    async function init() {
      const T = await loadThree();
      if (!mountedRef.current || !canvas) return;

      // Scene
      scene = new T.Scene();

      // Camera
      const aspect = canvas.clientWidth / canvas.clientHeight || 1;
      camera = new T.PerspectiveCamera(45, aspect, 0.1, 100);
      camera.position.set(0, 0, 6);

      // WebGL Renderer
      renderer = new T.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.setClearColor(0x000000, 0);

      // ====== AURA GLOW ORB ======
      orbGroup = new T.Group();

      // 1. Inner core — bright, solid center
      const coreGeo = new T.SphereGeometry(0.4, 32, 32);
      const coreMat = new T.MeshBasicMaterial({
        color: 0x8b5cf6, // violet-500
        transparent: true,
        opacity: 0.95,
      });
      coreMesh = new T.Mesh(coreGeo, coreMat);
      orbGroup.add(coreMesh);

      // 2. Mid glow layer — soft colored halo
      const glowGeo = new T.SphereGeometry(0.7, 24, 24);
      const glowMat = new T.MeshBasicMaterial({
        color: 0xa78bfa, // violet-400
        transparent: true,
        opacity: 0.25,
        blending: T.AdditiveBlending,
        depthWrite: false,
      });
      glowMesh = new T.Mesh(glowGeo, glowMat);
      orbGroup.add(glowMesh);

      // 3. Outer aura — large, very transparent
      const auraGeo = new T.SphereGeometry(1.2, 24, 24);
      const auraMat = new T.MeshBasicMaterial({
        color: 0xc4b5fd, // violet-300
        transparent: true,
        opacity: 0.1,
        blending: T.AdditiveBlending,
        depthWrite: false,
      });
      auraMesh = new T.Mesh(auraGeo, auraMat);
      orbGroup.add(auraMesh);

      // 4. Sparkle particles around the orb
      const sparkleCount = 60;
      const sparkleGeo = new T.BufferGeometry();
      const sparklePos = new Float32Array(sparkleCount * 3);
      for (let i = 0; i < sparkleCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 1.0 + Math.random() * 0.8;
        sparklePos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
        sparklePos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
        sparklePos[i * 3 + 2] = Math.cos(phi) * r;
      }
      sparkleGeo.setAttribute('position', new T.BufferAttribute(sparklePos, 3));

      // Custom shader material for glowing sparkles
      const sparkleMat = new T.PointsMaterial({
        color: 0xddd6fe, // violet-200
        size: 0.035,
        transparent: true,
        opacity: 0.6,
        blending: T.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      sparkles = new T.Points(sparkleGeo, sparkleMat);
      orbGroup.add(sparkles);

      scene.add(orbGroup);

      // Mouse handler — smooth target tracking
      const handleMouseMove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        targetX = (x - 0.5) * 2;
        targetY = (y - 0.5) * 2;
      };
      window.addEventListener('mousemove', handleMouseMove);

      // Resize handler
      const handleResize = () => {
        if (!canvas || !renderer || !camera) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      };
      window.addEventListener('resize', handleResize);

      // Animation loop
      function animate() {
        if (!mountedRef.current) return;
        time += 0.008;

        // Smooth lerp toward mouse position — slow, gentle easing
        currentX += (targetX - currentX) * 0.04;
        currentY += (targetY - currentY) * 0.04;

        // Apply rotation with mouse tracking
        orbGroup.rotation.x = currentY * 0.3 + Math.sin(time * 0.15) * 0.03;
        orbGroup.rotation.y = currentX * 0.5 + Math.sin(time * 0.1) * 0.05;

        // Gentle floating bobbing
        orbGroup.position.y = Math.sin(time * 0.5) * 0.08;
        orbGroup.position.x = Math.sin(time * 0.3) * 0.04;

        // Pulse the glow layers
        if (coreMesh) {
          coreMesh.material.opacity = 0.85 + Math.sin(time * 1.5) * 0.1;
        }
        if (glowMesh) {
          const pulse = 0.2 + Math.sin(time * 1.2) * 0.1;
          glowMesh.material.opacity = pulse;
          glowMesh.scale.setScalar(1 + Math.sin(time * 0.8) * 0.03);
        }
        if (auraMesh) {
          const auraPulse = 0.08 + Math.sin(time * 0.7) * 0.04;
          auraMesh.material.opacity = auraPulse;
          auraMesh.scale.setScalar(1 + Math.sin(time * 0.5) * 0.05);
        }

        // Rotate sparkles slowly
        if (sparkles) {
          sparkles.rotation.x += 0.002;
          sparkles.rotation.y += 0.003;
          sparkles.rotation.z += 0.001;
          // Twinkle
          sparkles.material.opacity = 0.4 + Math.sin(time * 2) * 0.2;
        }

        renderer.render(scene, camera);
        animationId = requestAnimationFrame(animate);
      }

      animate();
    }

    init();

    return () => {
      mountedRef.current = false;
      if (animationId) cancelAnimationFrame(animationId);
      if (renderer) {
        renderer.dispose();
      }
      if (scene) {
        scene.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
    };
  }, [visible]);

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      {!visible && (
        <div className="w-full h-full bg-gradient-to-br from-gebeya-50 to-ice-50 rounded-3xl flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-gebeya-200 border-t-gebeya-500 rounded-full animate-spin" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${visible ? 'block' : 'hidden'}`}
        style={{ outline: 'none' }}
      />
    </div>
  );
}
