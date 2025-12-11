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
        const floorGeometry = new THREE.PlaneGeometry(50, 50);
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
        const gridHelper = new THREE.GridHelper(50, 50);
        this.scene.add(gridHelper);

        // Walls
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });

        // Wall Params
        const wallHeight = 5;
        const wallThickness = 1;
        const mapSize = 50;

        // 4 Walls
        const wall1 = new THREE.Mesh(new THREE.BoxGeometry(mapSize, wallHeight, wallThickness), wallMaterial);
        wall1.position.set(0, wallHeight / 2, -mapSize / 2);

        const wall2 = new THREE.Mesh(new THREE.BoxGeometry(mapSize, wallHeight, wallThickness), wallMaterial);
        wall2.position.set(0, wallHeight / 2, mapSize / 2);

        const wall3 = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, mapSize), wallMaterial);
        wall3.position.set(-mapSize / 2, wallHeight / 2, 0);

        const wall4 = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, mapSize), wallMaterial);
        wall4.position.set(mapSize / 2, wallHeight / 2, 0);

        [wall1, wall2, wall3, wall4].forEach(wall => {
            wall.castShadow = true;
            wall.receiveShadow = true;
            this.scene.add(wall);
            this.objects.push(wall);
        });

        // Add some random crates for cover (not red boxes, proper "boxes")
        const crateTex = 0x8B4513; // SaddleBrown
        for (let i = 0; i < 8; i++) {
            const size = 1.5 + Math.random();
            const crate = new THREE.Mesh(
                new THREE.BoxGeometry(size, size, size),
                new THREE.MeshStandardMaterial({ color: crateTex })
            );

            // Random pos inside walls (margin 5)
            crate.position.x = (Math.random() - 0.5) * 35;
            crate.position.z = (Math.random() - 0.5) * 35;
            crate.position.y = size / 2;

            crate.castShadow = true;
            crate.receiveShadow = true;
            this.scene.add(crate);
            this.objects.push(crate);
        }
    }
}
