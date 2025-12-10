import * as THREE from 'three';

export class Projectile {
    constructor(scene, position, direction) {
        this.scene = scene;
        this.speed = 15;
        this.damage = 10;
        this.alive = true;
        this.creationTime = performance.now();
        this.maxLifeTime = 2000; // 2 seconds

        // Mesh
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow bullet
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);

        // Direction normalized
        this.velocity = direction.normalize().multiplyScalar(this.speed);

        this.scene.add(this.mesh);
    }

    update(delta, player) {
        if (!this.alive) return;

        // Move
        this.mesh.position.addScaledVector(this.velocity, delta);

        // Life check
        if (performance.now() - this.creationTime > this.maxLifeTime) {
            this.destroy();
            return;
        }

        // Collision Check (Simple Distance to Player)
        // Player center approximation
        const playerPos = player.controls.getObject().position.clone();
        playerPos.y -= 0.5; // Mid-body

        const dist = this.mesh.position.distanceTo(playerPos);
        if (dist < 0.8) { // Hit radius
            if (player.takeDamage) player.takeDamage(this.damage);
            this.destroy();
        }

        // Wall Collision (Optional for polish)
        // For now, walls don't stop bullets in this simple prototype, or we rely on lifetime.
    }

    destroy() {
        this.alive = false;
        this.scene.remove(this.mesh);
    }
}
