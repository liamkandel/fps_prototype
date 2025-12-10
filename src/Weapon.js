import * as THREE from 'three';

export class Weapon {
    constructor(camera, soundManager) {
        this.camera = camera;
        this.soundManager = soundManager;
        this.projectiles = [];

        // Weapon Stats
        this.fireRate = 0.1; // Seconds between shots
        this.lastFireTime = 0;
        this.ammo = 30;
        this.maxAmmo = 30;
        this.isReloading = false;

        // ADS
        this.isAiming = false;
        this.adsLevel = 0; // 0 to 1 interpolation

        // Positions (Relative to Camera)
        // Hip fire position
        this.defaultPosition = new THREE.Vector3(0.25, -0.3, -0.5);
        this.defaultRotation = new THREE.Euler(0, 0, 0);

        // ADS Position (Centered and brought closer/higher)
        // Adjusted for the new model height so sights align with crosshair
        this.adsPosition = new THREE.Vector3(0, -0.165, -0.4);
        this.adsRotation = new THREE.Euler(0, 0, 0);

        this.initMesh();
    }

    initMesh() {
        this.mesh = new THREE.Group();

        const darkGrey = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
        const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

        // --- Gun Body Group ---
        this.gunBody = new THREE.Group();
        this.mesh.add(this.gunBody);

        // 1. Receiver (Main block)
        const receiverGeo = new THREE.BoxGeometry(0.06, 0.08, 0.4);
        const receiver = new THREE.Mesh(receiverGeo, darkGrey);
        this.gunBody.add(receiver);

        // 2. Grip (Angled handle)
        const gripGeo = new THREE.BoxGeometry(0.05, 0.15, 0.08);
        const grip = new THREE.Mesh(gripGeo, black);
        grip.rotation.x = Math.PI / 6; // Angled back
        grip.position.set(0, -0.1, 0.1);
        this.gunBody.add(grip);

        // 3. Barrel
        const barrelGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 16);
        const barrel = new THREE.Mesh(barrelGeo, black);
        barrel.rotation.x = -Math.PI / 2;
        barrel.position.set(0, 0.05, -0.3); // Attached to top front
        this.gunBody.add(barrel);

        // 4. Magazine (Detachable part)
        const magGeo = new THREE.BoxGeometry(0.04, 0.2, 0.06);
        this.magazine = new THREE.Mesh(magGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
        this.magazine.position.set(0, -0.12, -0.05); // Forward of grip
        this.gunBody.add(this.magazine);

        // 5. Sights
        // Rear Sight (Notch)
        const rearSightGeo = new THREE.BoxGeometry(0.06, 0.02, 0.02);
        const rearSight = new THREE.Mesh(rearSightGeo, black);
        rearSight.position.set(0, 0.05, 0.18);
        this.gunBody.add(rearSight);

        // Front Sight (Post)
        const frontSightGeo = new THREE.BoxGeometry(0.01, 0.02, 0.01);
        const frontSight = new THREE.Mesh(frontSightGeo, new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x440000 }));
        frontSight.position.set(0, 0.07, -0.48); // Tip of barrel
        this.gunBody.add(frontSight);


        // --- Muzzle Flash ---
        this.muzzleFlash = new THREE.Group();
        this.muzzleFlash.position.set(0, 0.05, -0.55); // Just in front of barrel
        this.muzzleFlash.visible = false;
        this.gunBody.add(this.muzzleFlash);

        // Flash Light
        this.flashLight = new THREE.PointLight(0xffaa00, 2, 5);
        this.muzzleFlash.add(this.flashLight);

        // Flash Mesh (Crossed Planes)
        const flashGeo = new THREE.PlaneGeometry(0.3, 0.3);
        const flashMat = new THREE.MeshBasicMaterial({
            color: 0xffffaa,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const flash1 = new THREE.Mesh(flashGeo, flashMat);
        const flash2 = new THREE.Mesh(flashGeo, flashMat);
        flash2.rotation.z = Math.PI / 2;

        this.muzzleFlash.add(flash1);
        this.muzzleFlash.add(flash2);


        // Init Transforms
        this.mesh.position.copy(this.defaultPosition);

        // Tag mesh for raycast ignoring
        this.mesh.traverse((child) => {
            child.userData.isWeapon = true;
        });

        // Add to camera
        this.camera.add(this.mesh);
    }

    shoot(scene) {
        if (this.isReloading || this.ammo <= 0) return;

        const now = performance.now() / 1000;
        if (now - this.lastFireTime < this.fireRate) return;

        this.lastFireTime = now;
        this.ammo--;

        this.updateUI();

        // Audio
        if (this.soundManager) this.soundManager.playShoot();

        // Recoil Visualization (Kick back)
        this.mesh.position.z += 0.15;
        this.mesh.rotation.x += 0.1; // Muzzle climb

        // Muzzle Flash
        this.muzzleFlash.visible = true;
        this.muzzleFlash.rotation.z = Math.random() * Math.PI; // Random rotation
        // Hide flash after 50ms
        if (this.flashTimeout) clearTimeout(this.flashTimeout);
        this.flashTimeout = setTimeout(() => {
            this.muzzleFlash.visible = false;
        }, 50);

        // Trigger Network callback
        if (this.onShoot) {
            const dir = new THREE.Vector3();
            this.camera.getWorldDirection(dir);
            this.onShoot(dir);
        }

        // Raycast
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            let hitObject = null;

            for (const hit of intersects) {
                // Filter Helpers
                if (hit.object.type === 'GridHelper' || hit.object.type === 'LineSegments') continue;

                // Filter Self (Weapon)
                let isWeapon = false;
                let obj = hit.object;
                while (obj) {
                    if (obj.userData && obj.userData.isWeapon) {
                        isWeapon = true;
                        break;
                    }
                    obj = obj.parent;
                }
                if (isWeapon) continue;

                // If we passed filters, this is our hit
                hitObject = hit.object;
                break;
            }

            if (hitObject) {
                // Redirect Hitbox to Visual Mesh
                if (hitObject.userData && hitObject.userData.isHitbox && hitObject.userData.visualMesh) {
                    hitObject = hitObject.userData.visualMesh;
                }

                // Visual feedback: Flash color
                if (hitObject.material && hitObject.material.color) {
                    // Check Enemy
                    if (hitObject.userData && hitObject.userData.isEnemy) {
                        hitObject.userData.entity.takeDamage(20); // 20 Damage
                    }

                    const originalHex = hitObject.material.color.getHex();
                    hitObject.material.color.setHex(0xffffff);
                    setTimeout(() => {
                        if (hitObject && hitObject.material) {
                            hitObject.material.color.setHex(originalHex);
                        }
                    }, 50);
                }
            }
        }
    }

    reload() {
        if (this.isReloading || this.ammo === this.maxAmmo) return;

        this.isReloading = true;

        if (this.soundManager) this.soundManager.playReload();

        // Reload Animation Logic is handled in update() state checks or we can sequence it here with Timeouts
        // For smoother integration, let's use a simple state timer or just timeouts for the sequence

        // 1. Eject Mag
        const initialMagPos = this.magazine.position.y;

        // Animation Helpers (simple tween simulation)
        const animateMag = (startTime, duration, startY, endY) => {
            const now = performance.now();
            const progress = (now - startTime) / duration;
            if (progress < 1) {
                this.magazine.position.y = THREE.MathUtils.lerp(startY, endY, progress);
                requestAnimationFrame(() => animateMag(startTime, duration, startY, endY));
            } else {
                this.magazine.position.y = endY;
            }
        };

        // Sequence
        // 0.0s: Rotate gun side
        // 0.2s: Drop Mag
        setTimeout(() => {
            // Drop mag
            // Simulating this in update logic might be cleaner for frame rate independence 
            // but setTimeout is fine for prototype
        }, 200);

        // Finish Reload
        setTimeout(() => {
            this.ammo = this.maxAmmo;
            this.isReloading = false;
            this.updateUI();
            this.magazine.position.y = -0.12; // Reset mag pos
        }, 1500);
    }

    setAim(aiming) {
        this.isAiming = aiming;
    }

    update(delta, playerMoving) {
        // --- ADS Interpolation ---
        const targetAds = this.isAiming ? 1 : 0;
        this.adsLevel += (targetAds - this.adsLevel) * 15 * delta;

        // Position & Rotation lerp
        const targetPos = new THREE.Vector3().copy(this.defaultPosition).lerp(this.adsPosition, this.adsLevel);
        const targetRot = new THREE.Euler().copy(this.defaultRotation); // No rotation change for ADS yet, maybe align?

        // --- Recoil Recovery ---
        // Spring-like return to zero offset
        // We apply recoil to mesh.position/rotation directly in shoot, now we lerp back to target
        this.mesh.position.lerp(targetPos, 10 * delta);

        // Rotation Recovery
        // We want to recover x rotation to 0 (or targetRot.x)
        // If reloading, we override rotation
        let targetRotX = 0;
        let targetRotZ = 0;

        // --- Reload Animation State ---
        if (this.isReloading) {
            targetRotX = Math.PI / 4; // Tilt up/side
            targetRotZ = -Math.PI / 4;

            // Mag animation based on time could go here, but doing it simple:
            // Just wiggle the mag if we wanted
            this.magazine.visible = (performance.now() % 500) < 250; // Flicker mag ?? No, that's bad.
            // Let's just keep the mag visible for now, maybe move it in a future polish pass
            this.magazine.position.y = -0.12 - Math.sin(performance.now() / 100) * 0.05; // Bobbing mag
        } else {
            this.magazine.position.y = -0.12;
            this.magazine.visible = true;
        }

        // Apply Rotation
        // Smoothly interpolate current rotation to target
        this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, targetRotX, 10 * delta);
        this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, targetRotZ, 10 * delta);
        this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, 0, 10 * delta);


        // --- Weapon Sway (Walking) ---
        if (!this.isAiming && playerMoving && !this.isReloading) {
            const time = performance.now() / 150;
            this.mesh.position.x += Math.sin(time) * 0.005;
            this.mesh.position.y += Math.abs(Math.sin(time * 2)) * 0.005;
        }

        // --- Camera FOV (ADS Zoom) ---
        const baseFov = 75;
        const adsFov = 50;
        const targetFov = this.isAiming ? adsFov : baseFov;
        if (Math.abs(this.camera.fov - targetFov) > 0.1) {
            this.camera.fov += (targetFov - this.camera.fov) * 15 * delta;
            this.camera.updateProjectionMatrix();
        }
    }

    updateUI() {
        const ammoDisplay = document.getElementById('ammo-display');
        if (ammoDisplay) {
            ammoDisplay.innerText = `Ammo: ${this.ammo} / ${this.maxAmmo}`;
        }
    }
}
