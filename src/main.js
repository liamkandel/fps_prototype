import * as THREE from 'three';
import { Player } from './Player.js';
import { World } from './World.js';
// import { Enemy } from './Enemy.js'; // Removed
import { NetworkManager } from './NetworkManager.js';
import { Projectile } from './Projectile.js';

// --- CONFIGURATION ---
const SCENE_BG_COLOR = 0x87CEEB; // Sky blue

// --- GLOBAL VARIABLES ---
let camera, scene, renderer;
let player, world, networkManager;
let projectiles = [];
let lastTime = 0;

init();
animate(0);

function init() {
    // 1. Setup Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(SCENE_BG_COLOR);
    scene.fog = new THREE.Fog(SCENE_BG_COLOR, 10, 50);

    // 2. Setup Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    scene.add(camera); // Required for children of camera (gun) to be rendered

    // 3. Setup Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    document.body.appendChild(renderer.domElement);

    // 4. Setup World (Lights, Floor, Objects)
    world = new World(scene);

    // 5. Setup Player (Controls, Physics, Weapon)
    player = new Player(camera, scene, document.body);

    // 6. Network Manager
    networkManager = new NetworkManager(player, scene);
    networkManager.setOnShootCallback((proj) => {
        projectiles.push(proj);
    });

    // 7. Event Listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('click', () => player.lockControls());
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(time) {
    requestAnimationFrame(animate);

    const delta = (time - lastTime) / 1000;
    lastTime = time;

    // Cap delta to prevent huge jumps if tab is inactive
    const safeDelta = Math.min(delta, 0.1);

    if (player) {
        player.update(safeDelta, world);

        // Weapon Shoot Callback integration
        if (!player.weapon.onShoot) {
            player.weapon.onShoot = (dir) => {
                networkManager.sendShoot(dir);
            };
        }
    }

    if (networkManager) networkManager.update(safeDelta);

    // Update Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        if (proj.alive) {
            proj.update(safeDelta, player);
        } else {
            projectiles.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}
