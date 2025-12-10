import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.objects = []; // For collision detection later

        this.initLights();
        this.initEnvironment();
    }

    initLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light (Sun)
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(50, 50, 50);
        dirLight.castShadow = true;

        // Shadow properties
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 150;
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;

        this.scene.add(dirLight);
    }

    initEnvironment() {
        // Floor
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.8
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.objects.push(floor);

        // Grid Helper
        const gridHelper = new THREE.GridHelper(100, 100);
        this.scene.add(gridHelper);

        // Simple Wall
        const wallGeo = new THREE.BoxGeometry(10, 5, 1);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(0, 2.5, -10);
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.scene.add(wall);
        this.objects.push(wall);

        // Dummy Targets
        for (let i = 0; i < 5; i++) {
            const targetGeo = new THREE.BoxGeometry(1, 2, 1);
            const targetMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            const target = new THREE.Mesh(targetGeo, targetMat);

            target.position.x = (Math.random() - 0.5) * 40;
            target.position.z = (Math.random() - 0.5) * 40;
            target.position.y = 1; // On floor

            target.castShadow = true;
            target.receiveShadow = true;

            this.scene.add(target);
            this.objects.push(target);
        }
    }
}
