// movement-utils.js
export const occupiedPositions = new Map();

export function getStackHeight(x, y) {
  return occupiedPositions.get(`${x},${y}`) || 0;
}
