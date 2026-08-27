'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './HelmetViewer3D.css';

const CRALY_YELLOW = '#FFB800';

interface HelmetViewer3DProps {
  modelUrl?: string;
  className?: string;
  autoRotate?: boolean;
  interactive?: boolean;
}

export default function HelmetViewer3D({
  modelUrl = '/assets/construction_helmet.glb',
  className = '',
  autoRotate = true,
  interactive = true,
}: HelmetViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let animationFrameId: number;
    let isDisposed = false;

    // --- Scene Setup ---
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.04, 1.85);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // --- Studio Lighting for Glossy Hardhat Finish ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(4, 5, 3.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.4);
    fillLight.position.set(-4, 2, -2);
    scene.add(fillLight);

    const topGlossLight = new THREE.DirectionalLight(0xffffff, 2.2);
    topGlossLight.position.set(0, 6, 1);
    scene.add(topGlossLight);

    const goldAccentLight = new THREE.DirectionalLight(0xf5a623, 2.0);
    goldAccentLight.position.set(2, 3, -3);
    scene.add(goldAccentLight);

    const bottomSoftBounce = new THREE.DirectionalLight(0xffffff, 0.7);
    bottomSoftBounce.position.set(0, -3, 2);
    scene.add(bottomSoftBounce);

    // --- Model Container Group ---
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // Initial slight angle for aesthetic presentation
    modelGroup.rotation.y = THREE.MathUtils.degToRad(-30);
    modelGroup.rotation.x = THREE.MathUtils.degToRad(14);

    // --- Interaction & Physics State ---
    let isDragging = false;
    let previousPointer = { x: 0, y: 0 };
    let targetRotationY = modelGroup.rotation.y;
    let targetRotationX = modelGroup.rotation.x;
    let mouseTargetX = 0;
    let mouseTargetY = 0;
    let autoRotationSpeed = 0.003;
    let lastInteractionTime = Date.now();

    // --- Load GLTF Model ---
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        if (isDisposed) return;
        const root = gltf.scene;

        // Auto-center and normalize bounding box
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Center pivot
        root.position.x = -center.x;
        root.position.y = -center.y;
        root.position.z = -center.z;

        // Scale to fit prominently with no clipping
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.95 / (maxDim || 1);
        root.scale.setScalar(scale);

        root.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const origMat = Array.isArray(mesh.material)
              ? mesh.material[0]
              : mesh.material;

            const customMat = (origMat ? origMat.clone() : new THREE.MeshStandardMaterial()) as THREE.MeshStandardMaterial;

            const name = (mesh.name || '').toLowerCase();
            const matName = (origMat?.name || '').toLowerCase();
            const isHarness = name.includes('strap') || name.includes('harness') || name.includes('band') || name.includes('inner') || matName.includes('strap') || matName.includes('black');

            if (isHarness) {
              customMat.color.set('#222222');
              customMat.roughness = 0.8;
              customMat.metalness = 0.1;
            } else {
              // Vibrant glossy construction yellow
              customMat.color.set(CRALY_YELLOW);
              customMat.roughness = 0.22;
              customMat.metalness = 0.08;
            }

            mesh.material = customMat;
          }
        });

        modelGroup.add(root);
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('Error loading 3D helmet:', err);
        if (!isDisposed) {
          setError('Failed to load 3D model');
          setLoading(false);
        }
      }
    );

    // --- Resize Handler ---
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // --- Pointer / Hover / Drag Handlers ---
    const onPointerDown = (e: PointerEvent) => {
      if (!interactive) return;
      isDragging = true;
      lastInteractionTime = Date.now();
      previousPointer = { x: e.clientX, y: e.clientY };
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      // Only calculate mouse hover parallax when the cursor is strictly INSIDE the helmet region
      if (isInside || isDragging) {
        const normX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const normY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

        // Gentle, relaxed hover parallax
        mouseTargetX = normX * 0.18;
        mouseTargetY = normY * 0.14;
      } else {
        // Outside the region -> smoothly return mouse tilt offset to neutral 0
        mouseTargetX = 0;
        mouseTargetY = 0;
      }

      if (isDragging && interactive) {
        lastInteractionTime = Date.now();
        const deltaX = e.clientX - previousPointer.x;
        const deltaY = e.clientY - previousPointer.y;

        // Slower, more controlled drag responsiveness
        targetRotationY += deltaX * 0.0045;
        targetRotationX += deltaY * 0.0045;

        // Clamp vertical pitch
        targetRotationX = Math.max(-0.65, Math.min(0.65, targetRotationX));

        previousPointer = { x: e.clientX, y: e.clientY };
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!interactive) return;
      isDragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}

      const rect = container.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (!isInside) {
        mouseTargetX = 0;
        mouseTargetY = 0;
      }
    };

    const onPointerLeave = () => {
      if (!isDragging) {
        mouseTargetX = 0;
        mouseTargetY = 0;
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointerleave', onPointerLeave);

    // --- Render Loop ---
    let clock = new THREE.Clock();

    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      const timeSinceInteraction = Date.now() - lastInteractionTime;

      // Auto rotation & floating bob when not actively dragging
      if (autoRotate && !isDragging) {
        if (timeSinceInteraction > 1500) {
          targetRotationY += autoRotationSpeed;
        }
      }

      // Smooth interpolation for inertia with silky fluid easing
      modelGroup.rotation.y += (targetRotationY + mouseTargetX - modelGroup.rotation.y) * 0.055;
      modelGroup.rotation.x += (targetRotationX + mouseTargetY - modelGroup.rotation.x) * 0.055;

      // Subtle organic levitation bobbing
      modelGroup.position.y = Math.sin(elapsedTime * 1.2) * 0.025;

      renderer.render(scene, camera);
    };

    animate();

    // --- Cleanup ---
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointerleave', onPointerLeave);

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else if (mesh.material) {
            mesh.material.dispose();
          }
        }
      });

      renderer.dispose();
    };
  }, [modelUrl, autoRotate, interactive]);

  return (
    <div ref={containerRef} className={`helmet-3d-wrapper ${className}`}>
      {loading && (
        <div className="helmet-3d-loading">
          <div className="helmet-3d-spinner" />
          <span>Loading 3D Helmet…</span>
        </div>
      )}

      {error ? (
        <div className="helmet-3d-error">
          <p>{error}</p>
        </div>
      ) : (
        <>
          <canvas ref={canvasRef} className="helmet-3d-canvas" />

          <div className="helmet-3d-hint">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>Drag to rotate 3D</span>
          </div>
        </>
      )}
    </div>
  );
}
