import { addBlock, getBlockAt, blocks } from "../block-manager.js";

test("should add a block to the grid", () => {
    addBlock(2, 2, "red", 1, 1);
    expect(getBlockAt(2, 2)).toBeDefined();
});

test("should not place a block on an occupied space", () => {
    addBlock(3, 3, "blue", 1, 1);
    addBlock(3, 3, "green", 1, 1);
    expect(getBlockAt(3, 3).color).toBe("blue"); 
});

