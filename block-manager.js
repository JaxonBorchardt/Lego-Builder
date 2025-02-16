// blockManagement.js - Handles block data and interactions

const gridSize = 50; // Grid cell size
let blocks = []; // Stores all placed blocks

// Class to represent a block
class Block {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}


// Add a new block at a specific grid position
function addBlock(x, y, color, width = 1, height = 1) {
    if (!getBlockAt(x, y)) {
        blocks.push({ x, y, width, height, color });
    }
}

// function addBlock(x, y, color) {
//     if (!getBlockAt(x, y)) {
//         //blocks.push(new Block(x, y));
//         blocks.push({x,y,color})
//     }
// }


// Find block at given grid position
function getBlockAt(x, y) {
    return blocks.find(block => block.x === x && block.y === y);
}

// Update block position (for dragging)
function updateBlockPosition(block, newX, newY) {
    block.x = newX;
    block.y = newY;
}

// function sum(a, b) {
//     return a + b;
//   }
//   module.exports = sum;



//module.exports = { blocks, addBlock, getBlockAt, updateBlockPosition  };
export { blocks, addBlock, getBlockAt, updateBlockPosition  };