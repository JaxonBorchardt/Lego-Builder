import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("three-canvas") });
scene.background = new THREE.Color(0x333333)
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Fixed Camera
camera.position.set(5, 10, 18);
camera.lookAt(0, 0, 0);

// Grid Bounds
const BUILD_AREA_MIN_X = -10;
const BUILD_AREA_MAX_X = 10;
const BUILD_AREA_MIN_Z = -10;
const BUILD_AREA_MAX_Z = 10;

const occupiedPositions = new Map();

// Grid
// const gridSize = 10;
// const gridHelper = new THREE.GridHelper(gridSize * 2, gridSize);
// scene.add(gridHelper);

// Load the Lego baseplate texture
const loader = new THREE.TextureLoader();
const texture = loader.load(
    'lego-base.jpg', 
    () => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4); 
    },
    undefined,
    (error) => {
        console.error('An error occurred while loading the texture:', error);
    }
);

// Create ground plane with the texture
const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.MeshStandardMaterial({ map: texture });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; 
scene.add(ground);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 5);
scene.add(light);

const blocks = [];


let selectedColor = new THREE.Color("blue"); 

document.querySelectorAll(".color-button").forEach(button => {
    button.addEventListener("click", () => {
        selectedColor.set(button.getAttribute("data-color"));
        console.log("New selected color:", selectedColor);
    });
});

function getStackHeight(x, z) {
    return occupiedPositions.get(`${x},${z}`) || 0;
}

function createBlock(x, z) {
    if (x < BUILD_AREA_MIN_X || x > BUILD_AREA_MAX_X || z < BUILD_AREA_MIN_Z || z > BUILD_AREA_MAX_Z) return;

    let height = getStackHeight(x, z);
    let y = height + 0.5; 

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: selectedColor.clone() });

    const block = new THREE.Mesh(geometry, material);
    block.position.set(x, y, z);
    scene.add(block);
    blocks.push(block);

    occupiedPositions.set(`${x},${z}`, height + 1);
}

// Raycaster for Click Detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedBlock = null;
let previousPosition = null;

window.addEventListener('mousedown', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    // Converts mouse pixel coordinates to Normalized Device Coordinates for ray casting
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(blocks);

    if (intersects.length > 0) {
        selectedBlock = intersects[0].object;
        previousPosition = { 
            x: selectedBlock.position.x, 
            z: selectedBlock.position.z, 
            y: selectedBlock.position.y 
        };

        let key = `${previousPosition.x},${previousPosition.z}`;
        if (occupiedPositions.get(key) === previousPosition.y + 0.5) {
            occupiedPositions.set(key, previousPosition.y - 0.5);
        }
    } else {
        selectedBlock = null;
    }
});

window.addEventListener('mousemove', (event) => {
    if (!selectedBlock) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersect = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(plane, intersect)) {
        let newX = Math.round(intersect.x);
        let newZ = Math.round(intersect.z);

        newX = Math.max(BUILD_AREA_MIN_X, Math.min(BUILD_AREA_MAX_X, newX));
        newZ = Math.max(BUILD_AREA_MIN_Z, Math.min(BUILD_AREA_MAX_Z, newZ));

        let newHeight = getStackHeight(newX, newZ) + 0.5;

        if (!(newX === previousPosition.x && newZ === previousPosition.z)) {
            selectedBlock.position.x = newX;
            selectedBlock.position.z = newZ;
            selectedBlock.position.y = newHeight;
        }
    }
});

window.addEventListener('mouseup', () => {
    if (selectedBlock) {
        let x = selectedBlock.position.x;
        let z = selectedBlock.position.z;
        let y = selectedBlock.position.y;

        occupiedPositions.set(`${x},${z}`, y + 0.5);
    }
    selectedBlock = null;
});

window.addEventListener('dblclick', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersect = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(plane, intersect)) {
        let snappedX = Math.round(intersect.x);
        let snappedZ = Math.round(intersect.z);

        if (snappedX >= BUILD_AREA_MIN_X && snappedX <= BUILD_AREA_MAX_X && snappedZ >= BUILD_AREA_MIN_Z && snappedZ <= BUILD_AREA_MAX_Z) {
            createBlock(snappedX, snappedZ);
        }
    }
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();
