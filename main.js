import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getStackHeight, occupiedPositions } from './tests/movement-utils.js';


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
controls.enableDamping = true; 
controls.dampingFactor = 0.1;
controls.enableZoom = true; 
controls.enablePan = true; 
controls.maxPolarAngle = Math.PI / 2; // Prevent rotating upside down

// Grid Bounds
const BUILD_AREA_MIN_X = -10;
const BUILD_AREA_MAX_X = 10;
const BUILD_AREA_MIN_Z = -10;
const BUILD_AREA_MAX_Z = 10;

const blocks = [];
const studs = [];
const blockGroups = new Map(); // Maps each block to its group
let selectedGroup = null;

let isCameraMode = false;
let isMouseDown = false;

const modeIndicator = document.getElementById('mode-indicator');

function updateModeUI() {
    if (isCameraMode) {
        modeIndicator.textContent = '🎥 Camera Mode';
        modeIndicator.classList.remove('build');
        modeIndicator.classList.add('camera');
    } else {
        modeIndicator.textContent = '🛠 Build Mode';
        modeIndicator.classList.remove('camera');
        modeIndicator.classList.add('build');
    }
}

function updateControlsState() {
    controls.enabled = isCameraMode && isMouseDown;
}

// Clear Canvas
function clearCanvas() {
    blocks.forEach(block => scene.remove(block)); 
    studs.forEach(stud => scene.remove(stud)); 
    blocks.length = 0;
    studs.length = 0;
    occupiedPositions.clear();
    blockGroups.clear();
}

let selectedShape = "square"; 

document.getElementById("shape-square").addEventListener("click", () => {
    selectedShape = "square";
});

document.getElementById("shape-rectangle").addEventListener("click", () => {
    selectedShape = "rectangle";
});

document.getElementById("shape-triangle").addEventListener("click", () => {
    selectedShape = "triangle";
});

document.getElementById("clear-canvas").addEventListener("click", clearCanvas);


// Load the Lego baseplate texture
const loader = new THREE.TextureLoader();
const texture = loader.load(
    'Lego-Base/lego-base.jpg', 
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


function addStudsToBlock(block, w, d) {
    const studGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.2, 12);
    const studMaterial = new THREE.MeshStandardMaterial({ color: selectedColor.clone() });
    block.studs = [];

    const offsetX = (w - 1) / 2;
    const offsetZ = (d - 1) / 2;

    for (let i = 0; i < w; i++) {
        for (let j = 0; j < d; j++) {
            const stud = new THREE.Mesh(studGeometry, studMaterial);
            stud.position.set(i - offsetX, 0.5, j - offsetZ); // nicely centered
            block.add(stud);
            stud.offset = { x: i - offsetX, y: 0.5, z: j - offsetZ };
            block.studs.push(stud);
        }
    }
}



function createBlock(x, z, w = 1, d = 1, shape = "square") {
    if (x < BUILD_AREA_MIN_X || x + w - 1 > BUILD_AREA_MAX_X || 
        z < BUILD_AREA_MIN_Z || z + d - 1 > BUILD_AREA_MAX_Z) return;

    // Get max height in the area covered by the block
    let maxHeight = 0;
    for (let i = 0; i < w; i++) {
        for (let j = 0; j < d; j++) {
            maxHeight = Math.max(maxHeight, getStackHeight(x + i, z + j));
        }
    }
    
    let y = maxHeight + 0.5; 
    
    let geometry;
   
    if (shape === "square" || shape === "rectangle") {
        geometry = new THREE.BoxGeometry(w, 1, d);
    } else if (shape === "triangle") {
        // Triangular prism geometry
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(w, 0);
        shape.lineTo(w / 2, 1);
        shape.lineTo(0, 0);

        const extrudeSettings = { depth: d, bevelEnabled: false };
        geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        geometry.translate(-.5, -.5, -d/2);
    }
    const material = new THREE.MeshStandardMaterial({ color: selectedColor.clone() });
    const block = new THREE.Mesh(geometry, material);
    block.position.set(x + (w - 1) / 2, y, z + (d - 1) / 2);
    scene.add(block);
    blocks.push(block);

    if (shape === "square" || shape === "rectangle") {
        addStudsToBlock(block, w, d);
    }
    
    let shapeHeight = (shape === "triangle") ? 2 : 1;

    // Mark occupied positions
    for (let i = 0; i < w; i++) {
        for (let j = 0; j < d; j++) {
            occupiedPositions.set(`${x + i},${z + j}`, maxHeight + shapeHeight);
        }
    }

    // Stacking logic
    let blocksBelow = new Set();
    for (let i = 0; i < w; i++) {
        for (let j = 0; j < d; j++) {
            let belowBlock = blocks.find(b => 
                b.position.x === x + i && 
                b.position.z === z + j && 
                b.position.y === y - 1
            );
            if (belowBlock) {
                blocksBelow.add(belowBlock);
            }
        }
    }

    if (blocksBelow.size > 0) {
        let mergedGroup = new Set([block]);
        blocksBelow.forEach(b => {
            let existingGroup = blockGroups.get(b) || new Set([b]);
            existingGroup.forEach(bInGroup => mergedGroup.add(bInGroup));
        });

        mergedGroup.forEach(b => blockGroups.set(b, mergedGroup));
    } else {
        blockGroups.set(block, new Set([block]));
    }
}


function applyGravity() {
    const heightMap = new Map();
    blocks.forEach(block => {
        const width = block.geometry.parameters.width || 1;
        const depth = block.geometry.parameters.depth || 1;
        const xBase = Math.floor(block.position.x - (width - 1) / 2);
        const zBase = Math.floor(block.position.z - (depth - 1) / 2);

        let maxBelowHeight = 0;
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < depth; j++) {
                const key = `${xBase + i},${zBase + j}`;
                const h = heightMap.get(key) || 0;
                maxBelowHeight = Math.max(maxBelowHeight, h);
            }
        }

        const newY = maxBelowHeight + 0.5;
        block.position.y = newY;

        if (block.studs) {
            block.studs.forEach(stud => {
                stud.position.y = 0.5; 
            });
        }

        // Update occupied positions
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < depth; j++) {
                const key = `${xBase + i},${zBase + j}`;
                heightMap.set(key, maxBelowHeight + 1);
            }
        }
    });

    // Update the global occupiedPositions map
    occupiedPositions.clear();
    heightMap.forEach((height, key) => {
        occupiedPositions.set(key, height);
    });
}

// Raycaster for Click Detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedBlock = null;
let previousPosition = null;

let initialPinchDistance = null;
let zoomSpeed = 0.1; 

function getDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        initialPinchDistance = getDistance(e.touches);
    }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && initialPinchDistance) {
        const currentDistance = getDistance(e.touches);
        const delta = currentDistance - initialPinchDistance;

        if (camera.isPerspectiveCamera) {
            camera.position.z -= delta * zoomSpeed;
            camera.position.z = Math.max(1, Math.min(camera.position.z, 100));
        }

        initialPinchDistance = currentDistance;
    }
}, { passive: true });

window.addEventListener('touchend', () => {
    initialPinchDistance = null;
});


window.addEventListener('mousedown', (event) => {
    isMouseDown = true;
    updateControlsState();

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

window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 't') {
        isCameraMode = !isCameraMode;
        updateControlsState();
        updateModeUI();
        console.log(`Camera mode ${isCameraMode ? 'enabled' : 'disabled'}`);
    }

    if (e.key === 'Delete' && selectedGroup) {
        selectedGroup.forEach(block => {
            scene.remove(block);
            blocks.splice(blocks.indexOf(block), 1); // Remove from blocks array

            // Remove studs if they exist
            if (block.studs) {
                block.studs.forEach(stud => scene.remove(stud));
            }

            // Clear occupied positions this block used
            const x = Math.floor(block.position.x);
            const y = Math.floor(block.position.y);
            const z = Math.floor(block.position.z);
            const width = block.geometry.parameters.width || 1;
            const depth = block.geometry.parameters.depth || 1;

            for (let i = 0; i < width; i++) {
                for (let j = 0; j < depth; j++) {
                    const key = `${x - Math.floor((width - 1) / 2) + i},${z - Math.floor((depth - 1) / 2) + j}`;
                    if (occupiedPositions.get(key) === y + 0.5) {
                        occupiedPositions.delete(key);
                    }
                }
            }

            blockGroups.delete(block);
        });

        selectedGroup = null;
        selectedBlock = null;
        applyGravity();
    }
});


updateModeUI();


// Helper function to control how often gravity runs
function throttle(func, limit) {
    let inThrottle;
    return function() {
        if (!inThrottle) {
            func.apply(this, arguments);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

function splitDisconnectedBlocks(selectedGroup, selectedBlock) {
    let isStillTouching = false;

    selectedGroup.forEach(block => {
        if (block === selectedBlock) return;

        const dx = Math.abs(block.position.x - selectedBlock.position.x);
        const dz = Math.abs(block.position.z - selectedBlock.position.z);
        const dy = Math.abs(block.position.y - selectedBlock.position.y - 1); // stacked height

        if (dx < 1.1 && dz < 1.1 && dy < 1.1) {
            isStillTouching = true;
        }
    });

    if (!isStillTouching) {
        selectedGroup.delete(selectedBlock);
        selectedGroup = new Set([selectedBlock]);
    }

    return selectedGroup;
}


const throttledApplyGravity = throttle(applyGravity, 1000);

function getBlockHeight(block) {
    return (block.geometry.type === "ExtrudeGeometry") ? 2 : 1;
}

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

        let validMove = true;
        let newPositions = new Set();
        let maxStackHeight = 0;

        selectedGroup.forEach(block => {
            let newBlockX = block.position.x + (newX - selectedBlock.position.x);
            let newBlockZ = block.position.z + (newZ - selectedBlock.position.z);
            let newKey = `${newBlockX},${newBlockZ}`; 


            // Check if there’s another block at this position and it’s not in the selected group
            if (occupiedPositions.has(newKey)) {
                let existingBlock = blocks.find(b => 
                    b.position.x === newBlockX &&
                    b.position.z === newBlockZ &&
                    Math.abs((b.position.y + getBlockHeight(b)) - targetHeight) < 0.6
                );

                if (existingBlock && !selectedGroup.has(existingBlock)) {
                    validMove = false;
                }
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

            })
            selectedGroup = splitDisconnectedBlocks(selectedGroup, selectedBlock);
      

            throttledApplyGravity();
        }
        
    }
});


window.addEventListener('mouseup', () => {
    isMouseDown = false;
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

window.addEventListener('dblclick', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersect = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(plane, intersect)) {
        let snappedX = Math.round(intersect.x);
        let snappedZ = Math.round(intersect.z);

        if (snappedX >= BUILD_AREA_MIN_X && snappedX <= BUILD_AREA_MAX_X && 
            snappedZ >= BUILD_AREA_MIN_Z && snappedZ <= BUILD_AREA_MAX_Z) {
            
            let w = 1, d = 1; // Default for square
            if (selectedShape === "rectangle") {
                w = 2;
                d = 1;
            } else if (selectedShape === "triangle") {
                w = 2; 
                d = 1;
            }

            createBlock(snappedX, snappedZ, w, d, selectedShape);
        }
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update OrbitControls
    controls.update(); 

    renderer.render(scene, camera);
}

animate();
