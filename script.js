// script.js — Three.js module + GLTFLoader with a real car model
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/GLTFLoader.js";

// ---------------- Scene / Renderer ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05050a);
scene.fog = new THREE.Fog(0x05050a, 20, 120);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, 6, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ---------------- Lights ----------------
const ambient = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(8, 12, 6);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 80;
scene.add(dirLight);

// ---------------- Road (moving texture) ----------------
const tex = new THREE.TextureLoader().load("https://threejs.org/examples/textures/uv_grid_opengl.jpg");
tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
tex.repeat.set(1, 30);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(12, 2000),
  new THREE.MeshStandardMaterial({ map: tex, roughness: 1 })
);
road.rotation.x = -Math.PI / 2;
road.receiveShadow = true;
scene.add(road);

// Lane rails (simple visuals)
const railMat = new THREE.MeshStandardMaterial({ color: 0x2a3344, roughness: 1 });
const rails = new THREE.Group();
const railL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 2000), railMat);
railL.position.set(-6.2, 0.3, -1000);
const railR = railL.clone();
railR.position.x = 6.2;
rails.add(railL, railR);
scene.add(rails);

// ---------------- Player Car (GLB) ----------------
const LANES = [-4, 0, 4]; // 3 lanes
let laneIndex = 1;

const player = new THREE.Group();
player.position.set(0, 0.5, 5);
scene.add(player);

// Hidden hitbox for collisions
const hitbox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 3.2), new THREE.MeshBasicMaterial({ visible: false }));
hitbox.position.set(0, 0.6, 0);
player.add(hitbox);

// Load a real car model (single-file GLB, no extra assets)
const loader = new GLTFLoader();
const CAR_URL = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb";

loader.load(
  CAR_URL,
  (gltf) => {
    const car = gltf.scene;
    // Scale & orient to fit our road
    car.scale.set(0.6, 0.6, 0.6);
    car.rotation.y = Math.PI;          // face forward
    car.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    player.add(car);
  },
  (e) => {
    // progress (optional)
    // console.log((e.loaded / e.total) * 100 + "%");
  },
  (err) => {
    console.error("GLB load error:", err);
  }
);

// ---------------- Obstacles ----------------
const obstacles = [];
function spawnObstacle(zPos) {
  const geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x00ffff, metalness: 0.4, roughness: 0.4 });
  const obs = new THREE.Mesh(geo, mat);
  obs.castShadow = true;
  obs.receiveShadow = true;
  obs.position.set(LANES[Math.floor(Math.random() * LANES.length)], 0.6, zPos);
  scene.add(obs);
  obstacles.push(obs);
}

// ---------------- Input ----------------
const keys = {};
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === "arrowleft" || k === "a") { laneIndex = Math.max(0, laneIndex - 1); }
  if (k === "arrowright" || k === "d") { laneIndex = Math.min(LANES.length - 1, laneIndex + 1); }
});
addEventListener("keyup", (e) => delete keys[e.key.toLowerCase()]);

// ---------------- HUD Elements (from your HTML) ----------------
const scoreEl = document.getElementById("score");
const gameOverEl = document.getElementById("gameOverScreen");
const finalScoreEl = document.getElementById("finalScore");

// ---------------- Game State ----------------
let score = 0;
let speed = 0.28;     // baseline
let alive = true;

// ---------------- Helpers ----------------
function aabbXZ(a, b, ax = 0.8, az = 1.5) {
  return Math.abs(a.position.x - b.position.x) < ax &&
         Math.abs(a.position.z - b.position.z) < az;
}
function showGameOver() {
  alive = false;
  gameOverEl.style.display = "block";
  finalScoreEl.textContent = score;
}
window.restartGame = () => location.reload();

// ---------------- Loop ----------------
let spawnT = 0;
function animate(t = 0) {
  if (!alive) return;

  requestAnimationFrame(animate);

  // Smooth lane following + steering tilt
  const targetX = LANES[laneIndex];
  player.position.x += (targetX - player.position.x) * 0.18;
  player.rotation.z += ((player.position.x - targetX) * -0.06 - player.rotation.z) * 0.2;

  // Move road texture (fake forward motion)
  tex.offset.y -= speed * 0.06;

  // Spawn obstacles
  spawnT -= speed;
  if (spawnT <= 0) {
    spawnObstacle(-220 - Math.random() * 120);
    spawnT = 120 + Math.random() * 80;
  }

  // Move obstacles & check collisions
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.position.z += speed * 10; // world moves toward camera
    if (o.position.z > 12) {
      scene.remove(o);
      obstacles.splice(i, 1);
      score++;
      scoreEl.textContent = score;
      // Speed ramps slightly over time
      if (score % 10 === 0) speed += 0.02;
      continue;
    }
    if (aabbXZ(player, o)) { showGameOver(); return; }
  }

  renderer.render(scene, camera);
}
animate();

// ---------------- Resize ----------------
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
