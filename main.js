import { blocks, addBlock, getBlockAt, updateBlockPosition } from "./block-manager.js";

const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');

const gridSize = 50; 
const rows = canvas.height / gridSize;
const cols = canvas.width / gridSize;
let draggingBlock = null;
let offsetX = 0, offsetY = 0;
let currentBlockColor = 'blue'; // Default block color
let currentBlockShape = { width: 1, height: 1 }; // Default shape (1x1)

function setBlockColor(color) {
    currentBlockColor = color;
}
window.setBlockColor = setBlockColor;

function setBlockShape(width, height) {
    currentBlockShape = { width, height };
}
window.setBlockShape = setBlockShape;

function drawLegoBlock(ctx, x, y, width, height, bumpRadius, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);

    const bumpCount = Math.floor(width / (bumpRadius * 3));
    const bumpSpacing = width / bumpCount;
    
    ctx.fillStyle = color; //"rgba(255, 255, 255, 0.6)"; 
    for (let i = 0; i < bumpCount; i++) {
        const bumpX = x + bumpSpacing * i + bumpSpacing / 2;
        const bumpY = y - bumpRadius/4; // Move bumps higher so they sit on top
        ctx.beginPath();
        ctx.arc(bumpX, bumpY, bumpRadius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;

    for (let i = 0; i <= cols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= rows; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }

    for (let block of blocks) {
        drawLegoBlock(ctx, block.x * gridSize, block.y * gridSize, block.width * gridSize, block.height * gridSize, gridSize * 0.15, block.color);
    }
}

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

canvas.addEventListener('mousemove', function(event) {
    if (draggingBlock) {
        const x = Math.floor(event.offsetX / gridSize);
        const y = Math.floor(event.offsetY / gridSize);
        
        let canMove = true;
        for (let i = 0; i < draggingBlock.width; i++) {
            for (let j = 0; j < draggingBlock.height; j++) {
                if (getBlockAt(x + i, y + j) && getBlockAt(x + i, y + j) !== draggingBlock) {
                    canMove = false;
                }
            }
        }
        
        if (canMove) {
            updateBlockPosition(draggingBlock, x - offsetX, y - offsetY);
            drawGrid();
        }
    }
});


canvas.addEventListener('mouseup', function() {
    draggingBlock = null;
});

canvas.addEventListener('click', function(event) {
    if (draggingBlock) return;

    const x = Math.floor(event.offsetX / gridSize);
    const y = Math.floor(event.offsetY / gridSize);

    let canPlace = true;
    for (let i = 0; i < currentBlockShape.width; i++) {
        for (let j = 0; j < currentBlockShape.height; j++) {
            if (getBlockAt(x + i, y + j)) {
                canPlace = false;
            }
        }
    }

    if (canPlace) { 
        addBlock(x, y, currentBlockColor, currentBlockShape.width, currentBlockShape.height);
        drawGrid();
    }
});

drawGrid();
