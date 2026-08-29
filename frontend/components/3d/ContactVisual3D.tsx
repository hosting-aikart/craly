'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './ContactVisual3D.css';

export default function ContactVisual3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    camera.position.set(0, 0, 3.8);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // --- Bright Studio Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x0f766e, 3.2);
    keyLight.position.set(3, 4, 3.5);
    scene.add(keyLight);

    const goldRimLight = new THREE.DirectionalLight(0xf5a623, 2.8);
    goldRimLight.position.set(-4, -2, 2.5);
    scene.add(goldRimLight);

    const topFillLight = new THREE.DirectionalLight(0xffffff, 2.0);
    topFillLight.position.set(0, 5, 2);
    scene.add(topFillLight);

    // --- Main 3D Group ---
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Central 3D Craly Shield/Gem (Translucent Glass Physical Material)
    const gemGeo = new THREE.OctahedronGeometry(0.85, 2);
    const gemMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f766e,
      roughness: 0.1,
      metalness: 0.15,
      transmission: 0.82,
      transparent: true,
      opacity: 0.92,
      ior: 1.52,
      thickness: 1.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.9,
    });
    const gemMesh = new THREE.Mesh(gemGeo, gemMat);
    mainGroup.add(gemMesh);

    // 2. Gold Metallic Outer Wire Ring (Polished Accent)
    const ringGeo = new THREE.TorusGeometry(1.2, 0.025, 16, 100);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf5a623,
      metalness: 0.85,
      roughness: 0.15,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    mainGroup.add(ringMesh);

    // 3. Inner Glowing Emerald Core
    const innerGeo = new THREE.IcosahedronGeometry(0.48, 2);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x14b8a6,
      emissive: 0x0f766e,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    mainGroup.add(innerMesh);

    // 4. Orbiting Connection Nodes (Manufacturer, Craly, Contractor)
    const nodeGroup = new THREE.Group();
    const nodeGeo = new THREE.SphereGeometry(0.09, 24, 24);

    const nodeColors = [0x0f766e, 0xf5a623, 0x16a34a];
    const nodeCount = 3;

    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 1.38;
      const mat = new THREE.MeshStandardMaterial({
        color: nodeColors[i],
        metalness: 0.3,
        roughness: 0.2,
        emissive: nodeColors[i],
        emissiveIntensity: 0.3,
      });
      const node = new THREE.Mesh(nodeGeo, mat);
      node.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      nodeGroup.add(node);
    }
    mainGroup.add(nodeGroup);

    // Initial Aesthetic Rotation Angle
    mainGroup.rotation.x = THREE.MathUtils.degToRad(12);
    mainGroup.rotation.y = THREE.MathUtils.degToRad(-20);

    // --- Mouse Parallax ---
    let mouseTargetX = 0;
    let mouseTargetY = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const normY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      mouseTargetX = normX * 0.22;
      mouseTargetY = normY * 0.18;
    };

    window.addEventListener('pointermove', onPointerMove);

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

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // --- Animation Loop ---
    let clock = new THREE.Clock();

    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      // Smooth 360 Rotations
      gemMesh.rotation.y = elapsed * 0.3;
      gemMesh.rotation.x = Math.sin(elapsed * 0.4) * 0.15;

      ringMesh.rotation.z = -elapsed * 0.25;
      nodeGroup.rotation.z = elapsed * 0.35;

      // Levitation floating movement
      mainGroup.position.y = Math.sin(elapsed * 1.4) * 0.07;

      // Mouse Parallax Smooth Easing
      mainGroup.rotation.y += (mouseTargetX - mainGroup.rotation.y) * 0.04;
      mainGroup.rotation.x += (mouseTargetY - mainGroup.rotation.x) * 0.04;

      renderer.render(scene, camera);
    };

    animate();

    // --- Cleanup ---
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);

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
  }, []);

  return (
    <div ref={containerRef} className="contact-3d-stage">
      <div className="contact-3d-stage__canvas-wrap">
        <canvas ref={canvasRef} className="contact-3d-stage__canvas" />
      </div>

      {/* Floating Theme-Matched Glass Cards */}
      <div className="contact-3d-stage__cards">
        <div className="contact-3d-card contact-3d-card--top-left">
          <div className="contact-3d-card__icon contact-3d-card__icon--emerald">
            ⚡
          </div>
          <div>
            <div className="contact-3d-card__title">Instant AI Matching</div>
            <div className="contact-3d-card__sub">24h average response time</div>
          </div>
        </div>

        <div className="contact-3d-card contact-3d-card--bottom-right">
          <div className="contact-3d-card__icon contact-3d-card__icon--gold">
            🛡️
          </div>
          <div>
            <div className="contact-3d-card__title">100% Verified Network</div>
            <div className="contact-3d-card__sub">Vetted contractors & compliance</div>
          </div>
        </div>
      </div>
    </div>
  );
}
