export const blocks = [];
export const studs = [];
export const occupiedPositions = new Map();
export const blockGroups = new Map();

export function clearCanvas() {
    blocks.length = 0;
    studs.length = 0;
    occupiedPositions.clear();
    blockGroups.clear();
}