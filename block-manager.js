// blockManagement.js - Handles block data and interactions

const gridSize = 30; 
let blocks = [];

class Block {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

function addBlock(x, y, color, width = 1, height = 1) {
    if (!getBlockAt(x, y)) {
        blocks.push({ x, y, width, height, color });
    }
}

function getBlockAt(x, y) {
    return blocks.find(block => block.x === x && block.y === y);
}

function updateBlockPosition(block, newX, newY) {
    block.x = newX;
    block.y = newY;
}

export { blocks, addBlock, getBlockAt, updateBlockPosition  };