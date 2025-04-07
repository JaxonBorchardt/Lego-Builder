import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("three-canvas") });
scene.background = new THREE.Color(0x333333);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Fixed Camera
camera.position.set(5, 10, 18);
camera.lookAt(0, 0, 0);

// Initialize OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Enable smooth damping for a more natural feel
controls.dampingFactor = 0.1;
controls.enableZoom = true; // Allow zooming in/out
controls.enablePan = true; // Allow panning
controls.maxPolarAngle = Math.PI / 2; // Prevent rotating upside down

// Grid Bounds
const BUILD_AREA_MIN_X = -10;
const BUILD_AREA_MAX_X = 10;
const BUILD_AREA_MIN_Z = -10;
const BUILD_AREA_MAX_Z = 10;

const occupiedPositions = new Map();
const blocks = [];
const blockGroups = new Map(); // Maps each block to its group
let selectedGroup = null;

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

    // Check if the new block is on top of another
    let blockBelow = blocks.find(b => b.position.x === x && b.position.z === z && b.position.y === y - 1);

    if (blockBelow) {
        let existingGroup = blockGroups.get(blockBelow) || new Set([blockBelow]);
        existingGroup.add(block);
        blockGroups.set(block, existingGroup);
        existingGroup.forEach(b => blockGroups.set(b, existingGroup)); // Ensure consistency
    } else {
        // Create a new independent block
        blockGroups.set(block, new Set([block]));
    }
}

// Clear Canvas
function clearCanvas() {
    blocks.forEach(block => scene.remove(block)); 
    blocks.length = 0;
    occupiedPositions.clear();
    blockGroups.clear();
}

function deleteSelectedBlock() {
    if (!selectedGroup) return; 

    selectedGroup.forEach(block => {
        scene.remove(block);
        blocks.splice(blocks.indexOf(block), 1);
        blockGroups.delete(block);
        occupiedPositions.delete(`${block.position.x},${block.position.z}`);
    });

    selectedGroup = null;
}

// Attach functions to buttons
document.getElementById("clear-canvas").addEventListener("click", clearCanvas);


// Raycaster for Click Detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedBlock = null;
let previousPosition = null;

window.addEventListener('mousedown', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(blocks);

    if (intersects.length > 0) {
        selectedBlock = intersects[0].object;
        selectedGroup = blockGroups.get(selectedBlock) || new Set([selectedBlock]);

        previousPosition = { 
            x: selectedBlock.position.x, 
            z: selectedBlock.position.z, 
            y: selectedBlock.position.y 
        };

        console.log("Block selected:", selectedBlock);
    } else {
        selectedBlock = null;
        selectedGroup = null;
    }
});

window.addEventListener('mousemove', (event) => {
    if (!selectedBlock || !selectedGroup) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersect = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(plane, intersect)) {
        let newX = Math.round(intersect.x);
        let newZ = Math.round(intersect.z);

        // Constrain movement within build area
        newX = Math.max(BUILD_AREA_MIN_X, Math.min(BUILD_AREA_MAX_X, newX));
        newZ = Math.max(BUILD_AREA_MIN_Z, Math.min(BUILD_AREA_MAX_Z, newZ));

        // Calculate the lowest Y-position in the selected group
        let minGroupY = Math.min(...Array.from(selectedGroup).map(block => block.position.y));

        // Get the new stacking height based on the lowest block's new position
        let targetHeight = getStackHeight(newX, newZ);

        // Determine if the move is valid (i.e., blocks don't overlap other stacks)
        let validMove = true;
        let newPositions = new Set();

        selectedGroup.forEach(block => {
            let newBlockX = block.position.x + (newX - selectedBlock.position.x);
            let newBlockZ = block.position.z + (newZ - selectedBlock.position.z);
            let newKey = `${newBlockX},${newBlockZ}`;

            if (occupiedPositions.has(newKey) && !selectedGroup.has(occupiedPositions.get(newKey))) {
                validMove = false;
            }
            newPositions.add(newKey);
        });

        if (validMove) {
            selectedGroup.forEach(block => {
                let newBlockX = block.position.x + (newX - selectedBlock.position.x);
                let newBlockZ = block.position.z + (newZ - selectedBlock.position.z);

                // Maintain the relative height of each block based on the group's lowest block
                let heightOffset = block.position.y - minGroupY;
                block.position.set(newBlockX, targetHeight + heightOffset + 0.5, newBlockZ);
            });
        }
    }
});

window.addEventListener('mouseup', () => {
    if (selectedGroup) {
        selectedGroup.forEach(block => {
            let x = block.position.x;
            let z = block.position.z;
            let y = block.position.y;

            occupiedPositions.set(`${x},${z}`, y + 0.5);
        });
    }
    selectedBlock = null;
});

// Handle stacking to form groups
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

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update OrbitControls
    controls.update(); // Only required if enableDamping or enableZoom is true

    renderer.render(scene, camera);
}

animate();
