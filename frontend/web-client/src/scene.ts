import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * initScene(container)
 * returns { renderer, camera, controls, scene, resize }
 */
export function initScene(container: HTMLElement) {
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071021);

  // camera
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  camera.position.set(0, 1.5, 4);

  // renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio ?? 1);
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  // lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  hemi.position.set(0, 50, 0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 7.5);
  scene.add(dir);

  // controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.0, 0);
  controls.update();

  // ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0x071122 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  // placeholder cube (for theatre demo & quick feedback)
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.6, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x7c5cff })
  );
  cube.position.set(0, 0.6, 0);
  cube.name = 'theatreCube';
  scene.add(cube);

  // GLTF loader example — will try to load public/models/placeholder.glb
  const loader = new GLTFLoader();
  loader.load(
    '/models/placeholder.glb',
    (gltf) => {
      const root = gltf.scene;
      root.scale.set(1.0, 1.0, 1.0);
      root.position.set(0, 0, 0);
      scene.add(root);
      console.log('GLTF model loaded', gltf);
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (err) => {
      console.log('No glb found or failed to load. Using cube placeholder.');
    }
  );

  function resize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  return { renderer, camera, controls, scene, resize };
}

