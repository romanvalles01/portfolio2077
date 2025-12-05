// src/components/FbxViewer.jsx
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

export default function FbxViewer() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 350;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.background = null;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 4);
    scene.add(camera);

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x111111, 1.1);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(2, 4, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Loader FBX
    const loader = new FBXLoader();
    loader.setResourcePath("/low-poly-80s-computer-v3/textures/");

    const textureLoader = new THREE.TextureLoader();
    const screenTexture = textureLoader.load("/low-poly-80s-computer-v3/textures/Screen_Emit.png");
    screenTexture.colorSpace = THREE.SRGBColorSpace;

    let model = null;

    loader.load(
      "/low-poly-80s-computer-v3/source/OldComputerV3.fbx",
      (fbx) => {
        model = fbx;

        model.scale.setScalar(0.03);
        model.position.y = 1;

        // Rotación base suave (ligero tilt hacia la cámara)
        model.rotation.x = -Math.PI / 2 + 0.1;

        model.traverse((child) => {
          if (!child.isMesh) return;

          child.castShadow = true;
          child.receiveShadow = true;

          const name = (child.name || "").toLowerCase();
          const matName = (child.material?.name || "").toLowerCase();

          // Pantalla → aplicar Screen_Emit.png
          if (name.includes("screen") || name.includes("monitor") || matName.includes("screen")) {
            const mat = new THREE.MeshStandardMaterial({
              map: screenTexture,
              emissiveMap: screenTexture,
              emissive: new THREE.Color(0xffffff),
              emissiveIntensity: 2.2,
            });

            // Muy importante para que la emisión no se oscurezca con el tone mapping
            mat.toneMapped = false;

            child.material = mat;
          } else if (child.material) {
            // Resto de piezas: materiales normales opacos
            child.material.transparent = false;
            child.material.opacity = 1;

            if (child.material.map) {
              child.material.map.colorSpace = THREE.SRGBColorSpace;
            }
          }
        });

        scene.add(model);
      },
      undefined,
      (error) => console.error("Error loading FBX:", error),
    );

    // Animation loop (soft rotation)
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const t = clock.getElapsedTime();

      if (model) {
        // Oscilación suave hacia los costados
        model.rotation.y = Math.sin(t * 0.55) * 0.18 * Math.cos(t * 0.1);
        // amplitud: 0.15 rad (~8.5°)
        // velocidad: 0.6
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize handling
    const onResize = () => {
      const newWidth = container.clientWidth || window.innerWidth;
      const newHeight = container.clientHeight || 350;

      renderer.setSize(newWidth, newHeight);
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
