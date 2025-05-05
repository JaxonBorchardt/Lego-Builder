
import { getStackHeight, occupiedPositions } from './movement-utils.js';

describe('getStackHeight', () => {
  afterEach(() => {
    occupiedPositions.clear();
  });

  test('returns 0 for unoccupied positions', () => {
    expect(getStackHeight(0, 0)).toBe(0);
  });

  test('returns correct height for occupied positions', () => {
    occupiedPositions.set('1,1', 2);
    expect(getStackHeight(1, 1)).toBe(2);
  });
});


