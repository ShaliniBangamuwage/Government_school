'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type TeacherState = 'idle' | 'listening' | 'thinking' | 'speaking';

export function ThreeDTeacher({ state }: { state: TeacherState }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#120A10');
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(0, 2.6, 8);
    camera.lookAt(0, 1.7, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight('#fff3f9', '#351a2b', 2.2);
    scene.add(ambient);
    const key = new THREE.DirectionalLight('#ff73b7', 3.5);
    key.position.set(3, 6, 5);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.PointLight('#a78bfa', 2.5, 10);
    rim.position.set(-3, 2, 3);
    scene.add(rim);

    const teacher = new THREE.Group();
    teacher.position.y = -1.25;
    scene.add(teacher);

    const skin = new THREE.MeshStandardMaterial({ color: '#f4b49a', roughness: 0.7 });
    const blazer = new THREE.MeshStandardMaterial({ color: '#24334f', roughness: 0.55 });
    const shirt = new THREE.MeshStandardMaterial({ color: '#fff3f9', roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: '#172033', roughness: 0.8 });
    const tie = new THREE.MeshStandardMaterial({ color: '#e6007e', roughness: 0.45 });
    const glasses = new THREE.MeshStandardMaterial({ color: '#c6a56b', metalness: 0.7, roughness: 0.25 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.5, 0.72), blazer);
    torso.position.y = 2.1;
    torso.scale.set(1, 1, 0.9);
    torso.castShadow = true;
    teacher.add(torso);

    const shirtFront = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.28, 0.05), shirt);
    shirtFront.position.set(0, 2.12, 0.39);
    teacher.add(shirtFront);

    const tieMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.82, 0.06), tie);
    tieMesh.position.set(0, 2.14, 0.45);
    tieMesh.rotation.z = 0.03;
    teacher.add(tieMesh);

    const collarGeometry = new THREE.ConeGeometry(0.18, 0.32, 4);
    [-0.18, 0.18].forEach((x) => {
      const collar = new THREE.Mesh(collarGeometry, shirt);
      collar.position.set(x, 2.76, 0.43);
      collar.rotation.z = x < 0 ? -0.35 : 0.35;
      teacher.add(collar);
    });

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.32, 16), skin);
    neck.position.y = 3.02;
    teacher.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 18), skin);
    head.position.y = 3.65;
    head.castShadow = true;
    teacher.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.66, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), dark);
    hair.position.set(0, 3.88, -0.03);
    teacher.add(hair);

    const hairSideGeometry = new THREE.CapsuleGeometry(0.19, 0.75, 8, 12);
    [-0.5, 0.5].forEach((x) => {
      const hairSide = new THREE.Mesh(hairSideGeometry, dark);
      hairSide.position.set(x, 3.35, 0.02);
      hairSide.rotation.z = x < 0 ? -0.12 : 0.12;
      teacher.add(hairSide);
    });

    [-0.2, 0.2].forEach((x) => {
      const lens = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 8, 20), glasses);
      lens.position.set(x, 3.68, 0.59);
      lens.scale.set(1.1, 0.75, 1);
      teacher.add(lens);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.025), glasses);
    bridge.position.set(0, 3.68, 0.6);
    teacher.add(bridge);

    const eyeGeometry = new THREE.SphereGeometry(0.055, 10, 8);
    [-0.2, 0.2].forEach((x) => {
      const eye = new THREE.Mesh(eyeGeometry, dark);
      eye.position.set(x, 3.68, 0.58);
      teacher.add(eye);
    });

    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 8, 16, Math.PI), skin);
    mouth.position.set(0, 3.43, 0.6);
    mouth.rotation.x = Math.PI / 2;
    teacher.add(mouth);

    const armGeometry = new THREE.CapsuleGeometry(0.18, 0.76, 6, 12);
    const handGeometry = new THREE.SphereGeometry(0.2, 12, 10);
    const leftArm = new THREE.Group();
    const rightArm = new THREE.Group();
    leftArm.position.set(-0.72, 2.45, 0);
    rightArm.position.set(0.72, 2.45, 0);
    const leftMesh = new THREE.Mesh(armGeometry, blazer);
    const rightMesh = new THREE.Mesh(armGeometry, blazer);
    leftMesh.position.y = -0.42;
    rightMesh.position.y = -0.42;
    leftArm.add(leftMesh);
    rightArm.add(rightMesh);
    const leftHand = new THREE.Mesh(handGeometry, skin);
    const rightHand = new THREE.Mesh(handGeometry, skin);
    leftHand.position.y = -0.95;
    rightHand.position.y = -0.95;
    leftArm.add(leftHand);
    rightArm.add(rightHand);
    teacher.add(leftArm, rightArm);

    const legGeometry = new THREE.BoxGeometry(0.34, 1.15, 0.42);
    [-0.34, 0.34].forEach((x) => {
      const leg = new THREE.Mesh(legGeometry, dark);
      leg.position.set(x, 0.78, 0);
      leg.castShadow = true;
      teacher.add(leg);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.72), dark);
      shoe.position.set(x, 0.12, 0.12);
      teacher.add(shoe);
    });

    const pointer = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 8), shirt);
    pointer.rotation.z = Math.PI / 2;
    pointer.position.set(1.35, 2.35, 0.1);
    teacher.add(pointer);

    const symbols = ['x²', 'π', '∑', '√', '÷'];
    symbols.forEach((symbol, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.fillStyle = '#ff73b7';
      context.font = 'bold 74px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(symbol, 64, 64);
      const texture = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.7 }));
      const angle = (index / symbols.length) * Math.PI * 2;
      sprite.position.set(Math.cos(angle) * 2.2, 2.1 + Math.sin(angle) * 1.1, -0.8);
      sprite.scale.set(0.65, 0.65, 1);
      scene.add(sprite);
    });

    const resize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / Math.max(mount.clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    const timer = new THREE.Timer();
    let frame = 0;
    const animate = () => {
      timer.update();
      const elapsed = timer.getElapsed();
      const current = stateRef.current;
      const gesture = current === 'speaking' ? Math.sin(elapsed * 5) : current === 'listening' ? Math.sin(elapsed * 2) * 0.25 : current === 'thinking' ? Math.sin(elapsed * 2) * 0.12 : Math.sin(elapsed * 1.5) * 0.04;
      teacher.rotation.y = Math.sin(elapsed * 0.7) * 0.08;
      teacher.position.y = -1.25 + Math.sin(elapsed * 2) * 0.025;
      leftArm.rotation.z = current === 'speaking' ? -0.55 - gesture * 0.22 : current === 'thinking' ? -0.85 : -0.25;
      rightArm.rotation.z = current === 'speaking' ? 0.55 + gesture * 0.22 : current === 'listening' ? 0.95 : 0.25;
      rightArm.rotation.x = current === 'listening' ? -0.4 : 0;
      head.rotation.z = current === 'thinking' ? 0.12 : gesture * 0.04;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
    };
  }, []);

  return <div ref={mountRef} aria-label="Animated 3D maths teacher" role="img" className="h-72 w-full sm:h-80" />;
}
