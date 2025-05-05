// tests/clear-canvas.test.js
import { clearCanvas, blocks, studs, occupiedPositions, blockGroups } from './clear-canvas.js'; // adjust to your file

describe('clearCanvas', () => {
  beforeEach(() => {
    // Setup fake block and stud objects (no scene interaction)
    blocks.push({}, {});
    studs.push({}, {});
    occupiedPositions.set('0,0', 1);
    blockGroups.set({}, new Set());
  });

  afterEach(() => {
    blocks.length = 0;
    studs.length = 0;
    occupiedPositions.clear();
    blockGroups.clear();
  });

  test('clears blocks, studs, occupiedPositions, and blockGroups', () => {
    expect(blocks.length).toBe(2);
    expect(studs.length).toBe(2);
    expect(occupiedPositions.size).toBe(1);
    expect(blockGroups.size).toBe(1);

    clearCanvas();

    expect(blocks.length).toBe(0);
    expect(studs.length).toBe(0);
    expect(occupiedPositions.size).toBe(0);
    expect(blockGroups.size).toBe(0);
  });
});
