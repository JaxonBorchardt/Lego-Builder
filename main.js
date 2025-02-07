// import { blocks, addBlock, getBlockAt, updateBlockPosition } from "./block-manager.js";

// const canvas = document.getElementById('gridCanvas');
// const ctx = canvas.getContext('2d');

// const gridSize = 50; 
// const rows = canvas.height / gridSize;
// const cols = canvas.width / gridSize;
// let draggingBlock = null;
// let offsetX = 0, offsetY = 0;

// function drawLegoBlock(ctx, x, y, width, height, bumpRadius) {
//     // Draw main block rectangle
//     ctx.fillStyle = 'blue';
//     ctx.fillRect(x, y, width, height);

//     // Determine how many bumps to draw
//     const bumpCount = Math.floor(width / (bumpRadius * 3));
//     const bumpSpacing = width / bumpCount;
    
//     // Draw bumps on top of the block
//     ctx.fillStyle = 'blue';
//     for (let i = 0; i < bumpCount; i++) {
//         const bumpX = x + bumpSpacing * i + bumpSpacing / 2;
//         const bumpY = y; // Top edge
//         ctx.beginPath();
//         ctx.arc(bumpX, bumpY, bumpRadius, 0, Math.PI * 2);
//         ctx.fill();
//     }
// }


// // Function to draw grid and blocks
// function drawGrid() {
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//     ctx.strokeStyle = '#ccc';
//     ctx.lineWidth = 1;

//     // Draw vertical lines
//     for (let i = 0; i <= cols; i++) {
//         ctx.beginPath();
//         ctx.moveTo(i * gridSize, 0);
//         ctx.lineTo(i * gridSize, canvas.height);
//         ctx.stroke();
//     }

//     // Draw horizontal lines
//     for (let i = 0; i <= rows; i++) {
//         ctx.beginPath();
//         ctx.moveTo(0, i * gridSize);
//         ctx.lineTo(canvas.width, i * gridSize);
//         ctx.stroke();
//     }

//     // Draw blocks
//     for (let block of blocks) {
//         drawLegoBlock(ctx, block.x * gridSize, block.y * gridSize, gridSize, gridSize, gridSize * 0.15);
//     }
//     // for (let block of blocks) {
//     //     ctx.fillStyle = 'blue';
//     //     ctx.fillRect(block.x * gridSize, block.y * gridSize, gridSize, gridSize);
//     // }
// }

// // Mouse Down: Start dragging if clicking a block
// canvas.addEventListener('mousedown', function(event) {
//     const x = Math.floor(event.offsetX / gridSize);
//     const y = Math.floor(event.offsetY / gridSize);

//     const block = getBlockAt(x, y);
//     if (block) {
//         draggingBlock = block;
//         offsetX = x - block.x;
//         offsetY = y - block.y;
//     }
// });

// // Mouse Move: Move the block if dragging
// canvas.addEventListener('mousemove', function(event) {
//     if (draggingBlock) {
//         const x = Math.floor(event.offsetX / gridSize);
//         const y = Math.floor(event.offsetY / gridSize);
//         updateBlockPosition(draggingBlock, x - offsetX, y - offsetY);
//         drawGrid();
//     }
// });

// // Mouse Up: Drop the block at the new position
// canvas.addEventListener('mouseup', function() {
//     draggingBlock = null;
// });

// // Click to place new blocks
// canvas.addEventListener('click', function(event) {
//     if (draggingBlock) return; // Ignore if dragging

//     const x = Math.floor(event.offsetX / gridSize);
//     const y = Math.floor(event.offsetY / gridSize);

//     if (!getBlockAt(x, y)) { 
//         addBlock(x, y);
//         drawGrid();
//     }
// });

// // Initial grid draw
// drawGrid();


import { blocks, addBlock, getBlockAt, updateBlockPosition } from "./block-manager.js";

const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');

const gridSize = 50; 
const rows = canvas.height / gridSize;
const cols = canvas.width / gridSize;
let draggingBlock = null;
let offsetX = 0, offsetY = 0;
let currentBlockColor = 'blue'; // Default block color

function setBlockColor(color) {
    currentBlockColor = color;
}
window.setBlockColor = setBlockColor;

function drawLegoBlock(ctx, x, y, width, height, bumpRadius, color) {
    // Draw main block rectangle
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);

    // Determine how many bumps to draw
    const bumpCount = Math.floor(width / (bumpRadius * 3));
    const bumpSpacing = width / bumpCount;
    
    // Draw bumps on top of the block
    ctx.fillStyle = color;
    for (let i = 0; i < bumpCount; i++) {
        const bumpX = x + bumpSpacing * i + bumpSpacing / 2;
        const bumpY = y; // Top edge
        ctx.beginPath();
        ctx.arc(bumpX, bumpY, bumpRadius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Function to draw grid and blocks
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;

    // Draw vertical lines
    for (let i = 0; i <= cols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
    }

    // Draw horizontal lines
    for (let i = 0; i <= rows; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }

    // Draw blocks
    // for (let block of blocks) {
    //     ctx.fillStyle = block.color; // Use the block’s stored color
    //     ctx.fillRect(block.x * gridSize, block.y * gridSize, gridSize, gridSize);
    // }
    
    for (let block of blocks) {
        drawLegoBlock(ctx, block.x * gridSize, block.y * gridSize, gridSize, gridSize, gridSize * 0.15, block.color);
    }
}

// Mouse Down: Start dragging if clicking a block
canvas.addEventListener('mousedown', function(event) {
    const x = Math.floor(event.offsetX / gridSize);
    const y = Math.floor(event.offsetY / gridSize);

    const block = getBlockAt(x, y);
    if (block) {
        draggingBlock = block;
        offsetX = x - block.x;
        offsetY = y - block.y;
    }
});

// Mouse Move: Move the block if dragging
canvas.addEventListener('mousemove', function(event) {
    if (draggingBlock) {
        const x = Math.floor(event.offsetX / gridSize);
        const y = Math.floor(event.offsetY / gridSize);
        updateBlockPosition(draggingBlock, x - offsetX, y - offsetY);
        drawGrid();
    }
});

// Mouse Up: Drop the block at the new position
canvas.addEventListener('mouseup', function() {
    draggingBlock = null;
});

// Click to place new blocks
canvas.addEventListener('click', function(event) {
    if (draggingBlock) return; // Ignore if dragging

    const x = Math.floor(event.offsetX / gridSize);
    const y = Math.floor(event.offsetY / gridSize);

    if (!getBlockAt(x, y)) { 
        addBlock(x, y, currentBlockColor); // Pass selected color
        drawGrid();
    }
});

// Initial grid draw
drawGrid();

export { setBlockColor };
