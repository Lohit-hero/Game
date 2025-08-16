// --- Scene Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Lighting ---
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// --- Road with moving texture ---
const roadTexture = new THREE.TextureLoader().load("https://threejs.org/examples/textures/uv_grid_opengl.jpg");
roadTexture.wrapS = roadTexture.wrapT = THREE.RepeatWrapping;
roadTexture.repeat.set(1, 20);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(12, 2000),
  new THREE.MeshPhongMaterial({ map: roadTexture })
);
road.rotation.x = -Math.PI / 2;
scene.add(road);

// --- Car ---
const car = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 0.5, 2.5),
  new THREE.MeshStandardMaterial({ color: 0xff004c, metalness: 0.8, roughness: 0.2 })
);
car.position.set(0, 0.5, 5);
scene.add(car);

// --- Obstacles ---
let obstacles = [];
function createObstacle(zPos) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x00ffff, metalness: 0.5 });
  const obs = new THREE.Mesh(geo, mat);
  obs.position.set((Math.random() - 0.5) * 8, 0.5, zPos);
  scene.add(obs);
  obstacles.push(obs);
}

// --- Camera ---
camera.position.set(0, 6, 12);
camera.lookAt(0, 0, 0);

// --- Controls ---
let keys = {};
document.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

// --- HUD ---
let score = 0;
let speed = 0.25;
let gameOver = false;

// --- Game Over ---
function showGameOver() {
  document.getElementById("gameOverScreen").style.display = "block";
  document.getElementById("finalScore").innerText = score;
  gameOver = true;
}

// --- Restart ---
function restartGame() {
  window.location.reload();
}

// --- Animation Loop ---
function animate() {
  if (gameOver) return;

  requestAnimationFrame(animate);

  // Car Controls
  if (keys["arrowleft"] || keys["a"]) car.position.x -= 0.15;
  if (keys["arrowright"] || keys["d"]) car.position.x += 0.15;

  // Keep car on road
  car.position.x = Math.max(-5, Math.min(5, car.position.x));

  // Move road texture (simulate speed)
  roadTexture.offset.y -= speed * 0.05;

  // Move obstacles
  obstacles.forEach((obs, i) => {
    obs.position.z += speed;

    // Collision detection
    if (Math.abs(car.position.x - obs.position.x) < 1.2 &&
        Math.abs(car.position.z - obs.position.z) < 1.2) {
      showGameOver();
    }

    // Passed obstacle
    if (obs.position.z > 10) {
      scene.remove(obs);
      obstacles.splice(i, 1);
      score++;
      document.getElementById("score").innerText = score;

      // Speed up every 10 points
      if (score % 10 === 0) speed += 0.05;
    }
  });

  // Spawn obstacles
  if (Math.random() < 0.02) createObstacle(-200);

  renderer.render(scene, camera);
}

animate();

// --- Resize ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
