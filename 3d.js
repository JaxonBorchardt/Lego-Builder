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

// Clear Canvas
function clearCanvas() {
    blocks.forEach(block => scene.remove(block)); // Remove blocks from scene
    blocks.length = 0; // Clear array
    occupiedPositions.clear(); // Reset occupied positions
}


function deleteSelectedBlock() {
    if (!selectedBlock) return; // Ensure a block is selected

    // Remove from scene
    scene.remove(selectedBlock);

    // Remove from blocks array
    const index = blocks.indexOf(selectedBlock);
    if (index !== -1) {
        blocks.splice(index, 1);
    }

    // Remove occupied position
    const key = `${selectedBlock.position.x},${selectedBlock.position.z}`;
    if (occupiedPositions.has(key)) {
        let currentHeight = occupiedPositions.get(key);
        if (currentHeight > 0) {
            occupiedPositions.set(key, currentHeight - 1);
        }
    }

    // Clear selected block reference
    selectedBlock = null;
}



// // Attach functions to buttons
document.getElementById("clear-canvas").addEventListener("click", clearCanvas);
document.getElementById("delete-block").addEventListener("click", deleteSelectedBlock);


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

        console.log("Block selected:", selectedBlock);

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



// import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';

// const scene = new THREE.Scene();
// const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("three-canvas") });
// scene.background = new THREE.Color(0x333333);
// renderer.setSize(window.innerWidth, window.innerHeight);
// document.body.appendChild(renderer.domElement);

// // Fixed Camera
// camera.position.set(5, 10, 18);
// camera.lookAt(0, 0, 0);

// const moveSpeed = 2;  // Speed of movement
// const zoomSpeed = 1;  // Speed of zoom

// // Functions to move the camera
// function moveCamera(dx, dy, dz) {
//     camera.position.x += dx;
//     camera.position.y += dy;
//     camera.position.z += dz;
//     camera.lookAt(0, 0, 0); // Keep looking at the center
// }

// let selectedShape = "square"; 

// document.getElementById("shape-square").addEventListener("click", () => {
//     selectedShape = "square";
// });

// document.getElementById("shape-rectangle").addEventListener("click", () => {
//     selectedShape = "rectangle";
// });

// document.getElementById("shape-triangle").addEventListener("click", () => {
//     selectedShape = "triangle";
// });


// // Event listeners for buttons
// document.getElementById("move-left").addEventListener("click", () => moveCamera(-moveSpeed, 0, 0));
// document.getElementById("move-right").addEventListener("click", () => moveCamera(moveSpeed, 0, 0));
// document.getElementById("move-up").addEventListener("click", () => moveCamera(0, moveSpeed, 0));
// document.getElementById("move-down").addEventListener("click", () => moveCamera(0, -moveSpeed, 0));
// document.getElementById("zoom-in").addEventListener("click", () => moveCamera(0, 0, -zoomSpeed));
// document.getElementById("zoom-out").addEventListener("click", () => moveCamera(0, 0, zoomSpeed));
// document.getElementById("reset-view").addEventListener("click", () => {
//     camera.position.set(5, 10, 18); // Reset to original position
//     camera.lookAt(0, 0, 0);
// });


// // Grid Bounds
// const BUILD_AREA_MIN_X = -10;
// const BUILD_AREA_MAX_X = 10;
// const BUILD_AREA_MIN_Z = -10;
// const BUILD_AREA_MAX_Z = 10;

// const occupiedPositions = new Map();
// const blocks = [];
// const blockGroups = new Map(); // Maps each block to its group
// let selectedGroup = null;

// // Load the Lego baseplate texture
// const loader = new THREE.TextureLoader();
// const texture = loader.load(
//     'lego-base.jpg', 
//     () => {
//         texture.wrapS = THREE.RepeatWrapping;
//         texture.wrapT = THREE.RepeatWrapping;
//         texture.repeat.set(4, 4); 
//     },
//     undefined,
//     (error) => {
//         console.error('An error occurred while loading the texture:', error);
//     }
// );

// // Create ground plane with the texture
// const groundGeometry = new THREE.PlaneGeometry(20, 20);
// const groundMaterial = new THREE.MeshStandardMaterial({ map: texture });
// const ground = new THREE.Mesh(groundGeometry, groundMaterial);
// ground.rotation.x = -Math.PI / 2; 
// scene.add(ground);

// // Lighting
// const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
// scene.add(ambientLight);

// const light = new THREE.DirectionalLight(0xffffff, 1);
// light.position.set(5, 10, 5);
// scene.add(light);

// let selectedColor = new THREE.Color("blue"); 

// document.querySelectorAll(".color-button").forEach(button => {
//     button.addEventListener("click", () => {
//         selectedColor.set(button.getAttribute("data-color"));
//         console.log("New selected color:", selectedColor);
//     });
// });

// function getStackHeight(x, z) {
//     return occupiedPositions.get(`${x},${z}`) || 0;
// }

// // function createBlock(x, z) {
// //     if (x < BUILD_AREA_MIN_X || x > BUILD_AREA_MAX_X || z < BUILD_AREA_MIN_Z || z > BUILD_AREA_MAX_Z) return;

// //     let height = getStackHeight(x, z);
// //     let y = height + 0.5; 

// //     const geometry = new THREE.BoxGeometry(1, 1, 1);
// //     const material = new THREE.MeshStandardMaterial({ color: selectedColor.clone() });

// //     const block = new THREE.Mesh(geometry, material);
// //     block.position.set(x, y, z);
// //     scene.add(block);
// //     blocks.push(block);

// //     occupiedPositions.set(`${x},${z}`, height + 1);

// //     // Check if the new block is on top of another
// //     let blockBelow = blocks.find(b => b.position.x === x && b.position.z === z && b.position.y === y - 1);

// //     if (blockBelow) {
// //         let existingGroup = blockGroups.get(blockBelow) || new Set([blockBelow]);
// //         existingGroup.add(block);
// //         blockGroups.set(block, existingGroup);
// //         existingGroup.forEach(b => blockGroups.set(b, existingGroup)); // Ensure consistency
// //     } else {
// //         // Create a new independent block
// //         blockGroups.set(block, new Set([block]));
// //     }
// // }

// // function createBlock(x, z, w = 1, d = 1) {
// //     if (x < BUILD_AREA_MIN_X || x + w - 1 > BUILD_AREA_MAX_X || 
// //         z < BUILD_AREA_MIN_Z || z + d - 1 > BUILD_AREA_MAX_Z) return;

// //     // Get max height in the area covered by the block
// //     let maxHeight = 0;
// //     for (let i = 0; i < w; i++) {
// //         for (let j = 0; j < d; j++) {
// //             maxHeight = Math.max(maxHeight, getStackHeight(x + i, z + j));
// //         }
// //     }
    
// //     let y = maxHeight + 0.5; 

// //     const geometry = new THREE.BoxGeometry(w, 1, d);
// //     const material = new THREE.MeshStandardMaterial({ color: selectedColor.clone() });

// //     const block = new THREE.Mesh(geometry, material);
// //     block.position.set(x + (w - 1) / 2, y, z + (d - 1) / 2);
// //     scene.add(block);
// //     blocks.push(block);

// //     // Mark all covered positions as occupied
// //     for (let i = 0; i < w; i++) {
// //         for (let j = 0; j < d; j++) {
// //             occupiedPositions.set(`${x + i},${z + j}`, maxHeight + 1);
// //         }
// //     }

// //     blockGroups.set(block, new Set([block])); // Initialize as its own group
// // }

// // function createBlock(x, z, w = 1, d = 1) {
// //     if (x < BUILD_AREA_MIN_X || x + w - 1 > BUILD_AREA_MAX_X || 
// //         z < BUILD_AREA_MIN_Z || z + d - 1 > BUILD_AREA_MAX_Z) return;

// //     // Get max height in the area covered by the block
// //     let maxHeight = 0;
// //     for (let i = 0; i < w; i++) {
// //         for (let j = 0; j < d; j++) {
// //             maxHeight = Math.max(maxHeight, getStackHeight(x + i, z + j));
// //         }
// //     }
    
// //     let y = maxHeight + 0.5; 

// //     const geometry = new THREE.BoxGeometry(w, 1, d);
// //     const material = new THREE.MeshStandardMaterial({ color: selectedColor.clone() });

// //     const block = new THREE.Mesh(geometry, material);
// //     block.position.set(x + (w - 1) / 2, y, z + (d - 1) / 2);
// //     scene.add(block);
// //     blocks.push(block);

// //     // Mark all covered positions as occupied
// //     for (let i = 0; i < w; i++) {
// //         for (let j = 0; j < d; j++) {
// //             occupiedPositions.set(`${x + i},${z + j}`, maxHeight + 1);
// //         }
// //     }

// //     // Check for blocks below and group them
// //     let blocksBelow = new Set();
// //     for (let i = 0; i < w; i++) {
// //         for (let j = 0; j < d; j++) {
// //             let belowBlock = blocks.find(b => 
// //                 b.position.x === x + i && 
// //                 b.position.z === z + j && 
// //                 b.position.y === y - 1
// //             );
// //             if (belowBlock) {
// //                 blocksBelow.add(belowBlock);
// //             }
// //         }
// //     }

// //     if (blocksBelow.size > 0) {
// //         // Merge all existing groups into one
// //         let mergedGroup = new Set([block]);
// //         blocksBelow.forEach(b => {
// //             let existingGroup = blockGroups.get(b) || new Set([b]);
// //             existingGroup.forEach(bInGroup => mergedGroup.add(bInGroup));
// //         });

// //         // Assign the merged group to all blocks in it
// //         mergedGroup.forEach(b => blockGroups.set(b, mergedGroup));
// //     } else {
// //         // No block below, create an independent group
// //         blockGroups.set(block, new Set([block]));
// //     }
// // }

// function createBlock(x, z, w = 1, d = 1, shape = "square") {
//     if (x < BUILD_AREA_MIN_X || x + w - 1 > BUILD_AREA_MAX_X || 
//         z < BUILD_AREA_MIN_Z || z + d - 1 > BUILD_AREA_MAX_Z) return;

//     // Get max height in the area covered by the block
//     let maxHeight = 0;
//     for (let i = 0; i < w; i++) {
//         for (let j = 0; j < d; j++) {
//             maxHeight = Math.max(maxHeight, getStackHeight(x + i, z + j));
//         }
//     }
    
//     let y = maxHeight + 0.5; 

//     let geometry;
//     if (shape === "square" || shape === "rectangle") {
//         geometry = new THREE.BoxGeometry(w, 1, d);
//     } else if (shape === "triangle") {
//         // Triangular prism geometry
//         const shape = new THREE.Shape();
//         shape.moveTo(0, 0);
//         shape.lineTo(w, 0);
//         shape.lineTo(w / 2, 1);
//         shape.lineTo(0, 0);

//         const extrudeSettings = { depth: d, bevelEnabled: false };
//         geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
//     }

//     const material = new THREE.MeshStandardMaterial({ color: selectedColor.clone() });

//     const block = new THREE.Mesh(geometry, material);
//     block.position.set(x + (w - 1) / 2, y, z + (d - 1) / 2);
//     scene.add(block);
//     blocks.push(block);

//     // Mark occupied positions
//     for (let i = 0; i < w; i++) {
//         for (let j = 0; j < d; j++) {
//             occupiedPositions.set(`${x + i},${z + j}`, maxHeight + 1);
//         }
//     }

//     // Stacking logic
//     let blocksBelow = new Set();
//     for (let i = 0; i < w; i++) {
//         for (let j = 0; j < d; j++) {
//             let belowBlock = blocks.find(b => 
//                 b.position.x === x + i && 
//                 b.position.z === z + j && 
//                 b.position.y === y - 1
//             );
//             if (belowBlock) {
//                 blocksBelow.add(belowBlock);
//             }
//         }
//     }

//     if (blocksBelow.size > 0) {
//         let mergedGroup = new Set([block]);
//         blocksBelow.forEach(b => {
//             let existingGroup = blockGroups.get(b) || new Set([b]);
//             existingGroup.forEach(bInGroup => mergedGroup.add(bInGroup));
//         });

//         mergedGroup.forEach(b => blockGroups.set(b, mergedGroup));
//     } else {
//         blockGroups.set(block, new Set([block]));
//     }
// }




// // Clear Canvas
// function clearCanvas() {
//     blocks.forEach(block => scene.remove(block)); 
//     blocks.length = 0;
//     occupiedPositions.clear();
//     blockGroups.clear();
// }

// function deleteSelectedBlock() {
//     if (!selectedGroup) return; 

//     selectedGroup.forEach(block => {
//         scene.remove(block);
//         blocks.splice(blocks.indexOf(block), 1);
//         blockGroups.delete(block);
//         occupiedPositions.delete(`${block.position.x},${block.position.z}`);
//     });

//     selectedGroup = null;
// }

// // Attach functions to buttons
// document.getElementById("clear-canvas").addEventListener("click", clearCanvas);
// document.getElementById("delete-block").addEventListener("click", deleteSelectedBlock);

// // Raycaster for Click Detection
// const raycaster = new THREE.Raycaster();
// const mouse = new THREE.Vector2();
// let selectedBlock = null;
// let previousPosition = null;

// window.addEventListener('mousedown', (event) => {
//     const rect = renderer.domElement.getBoundingClientRect();
//     mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
//     mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

//     raycaster.setFromCamera(mouse, camera);
//     const intersects = raycaster.intersectObjects(blocks);

//     if (intersects.length > 0) {
//         selectedBlock = intersects[0].object;
//         selectedGroup = blockGroups.get(selectedBlock) || new Set([selectedBlock]);

//         previousPosition = { 
//             x: selectedBlock.position.x, 
//             z: selectedBlock.position.z, 
//             y: selectedBlock.position.y 
//         };

//         console.log("Block selected:", selectedBlock);
//     } else {
//         selectedBlock = null;
//         selectedGroup = null;
//     }
// });

// window.addEventListener('mousemove', (event) => {
//     if (!selectedBlock || !selectedGroup) return;

//     mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
//     mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

//     raycaster.setFromCamera(mouse, camera);
//     const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
//     const intersect = new THREE.Vector3();

//     if (raycaster.ray.intersectPlane(plane, intersect)) {
//         let newX = Math.round(intersect.x);
//         let newZ = Math.round(intersect.z);

//         // Constrain movement within build area
//         newX = Math.max(BUILD_AREA_MIN_X, Math.min(BUILD_AREA_MAX_X, newX));
//         newZ = Math.max(BUILD_AREA_MIN_Z, Math.min(BUILD_AREA_MAX_Z, newZ));

//         // Calculate the lowest Y-position in the selected group
//         let minGroupY = Math.min(...Array.from(selectedGroup).map(block => block.position.y));

//         // Get the new stacking height based on the lowest block's new position
//         let targetHeight = getStackHeight(newX, newZ);

//         // Determine if the move is valid (i.e., blocks don't overlap other stacks)
//         let validMove = true;
//         let newPositions = new Set();

//         selectedGroup.forEach(block => {
//             let newBlockX = block.position.x + (newX - selectedBlock.position.x);
//             let newBlockZ = block.position.z + (newZ - selectedBlock.position.z);
//             let newKey = `${newBlockX},${newBlockZ}`;

//             if (occupiedPositions.has(newKey) && !selectedGroup.has(occupiedPositions.get(newKey))) {
//                 validMove = false;
//             }
//             newPositions.add(newKey);
//         });

//         if (validMove) {
//             selectedGroup.forEach(block => {
//                 let newBlockX = block.position.x + (newX - selectedBlock.position.x);
//                 let newBlockZ = block.position.z + (newZ - selectedBlock.position.z);

//                 // Maintain the relative height of each block based on the group's lowest block
//                 let heightOffset = block.position.y - minGroupY;
//                 block.position.set(newBlockX, targetHeight + heightOffset + 0.5, newBlockZ);
//             });
//         }
//     }
// });


// window.addEventListener('mouseup', () => {
//     if (selectedGroup) {
//         selectedGroup.forEach(block => {
//             let x = block.position.x;
//             let z = block.position.z;
//             let y = block.position.y;

//             occupiedPositions.set(`${x},${z}`, y + 0.5);
//         });
//     }
//     selectedBlock = null;
// });

// // Handle stacking to form groups
// // window.addEventListener('dblclick', (event) => {
// //     mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
// //     mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

// //     raycaster.setFromCamera(mouse, camera);
// //     const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
// //     const intersect = new THREE.Vector3();

// //     if (raycaster.ray.intersectPlane(plane, intersect)) {
// //         let snappedX = Math.round(intersect.x);
// //         let snappedZ = Math.round(intersect.z);

// //         if (snappedX >= BUILD_AREA_MIN_X && snappedX <= BUILD_AREA_MAX_X && snappedZ >= BUILD_AREA_MIN_Z && snappedZ <= BUILD_AREA_MAX_Z) {
// //             createBlock(snappedX, snappedZ);
// //         }
// //     }
// // });

// // window.addEventListener('dblclick', (event) => {
// //     mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
// //     mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

// //     raycaster.setFromCamera(mouse, camera);
// //     const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
// //     const intersect = new THREE.Vector3();

// //     if (raycaster.ray.intersectPlane(plane, intersect)) {
// //         let snappedX = Math.round(intersect.x);
// //         let snappedZ = Math.round(intersect.z);

// //         if (snappedX >= BUILD_AREA_MIN_X && snappedX <= BUILD_AREA_MAX_X && 
// //             snappedZ >= BUILD_AREA_MIN_Z && snappedZ <= BUILD_AREA_MAX_Z) {
            
// //             // Change `w` and `d` based on the selected shape
// //             let w = selectedShape === "rectangle" ? 2 : 1;  
// //             let d = selectedShape === "rectangle" ? 1 : 1;  
// //             createBlock(snappedX, snappedZ, w, d);
// //         }
// //     }
// // });

// window.addEventListener('dblclick', (event) => {
//     mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
//     mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

//     raycaster.setFromCamera(mouse, camera);
//     const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
//     const intersect = new THREE.Vector3();

//     if (raycaster.ray.intersectPlane(plane, intersect)) {
//         let snappedX = Math.round(intersect.x);
//         let snappedZ = Math.round(intersect.z);

//         if (snappedX >= BUILD_AREA_MIN_X && snappedX <= BUILD_AREA_MAX_X && 
//             snappedZ >= BUILD_AREA_MIN_Z && snappedZ <= BUILD_AREA_MAX_Z) {
            
//             let w = 1, d = 1; // Default for square
//             if (selectedShape === "rectangle") {
//                 w = 2;
//                 d = 1;
//             } else if (selectedShape === "triangle") {
//                 w = 2; // You can change this based on how big you want triangles
//                 d = 1;
//             }

//             createBlock(snappedX, snappedZ, w, d, selectedShape);
//         }
//     }
// });


// function animate() {
//     requestAnimationFrame(animate);
//     renderer.render(scene, camera);
// }


// animate();
