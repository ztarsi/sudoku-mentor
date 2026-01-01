// Test file for Hidden Single logic
import { findNextLogicStep } from './logicEngine';

// Helper to create empty grid
const createEmptyGrid = () => {
  return Array.from({ length: 81 }, () => ({
    value: null,
    candidates: [],
    isFixed: false,
    isHighlighted: false,
    highlightColor: null,
    isBaseCell: false,
    isTargetCell: false
  }));
};

// Test case: R9C4 should NOT be a hidden single if R9C5, R2C4, and R4C4 also have candidate 2
export const testHiddenSingleFalsePositive = () => {
  const grid = createEmptyGrid();
  
  // Set up the problematic case
  // R9C4 (index 75) - has candidate 2
  grid[75].candidates = [2, 5, 7];
  
  // R9C5 (index 76) - ALSO has candidate 2 (same row and box)
  grid[76].candidates = [2, 3, 8];
  
  // R2C4 (index 12) - ALSO has candidate 2 (same column)
  grid[12].candidates = [2, 4, 6];
  
  // R4C4 (index 30) - ALSO has candidate 2 (same column)
  grid[30].candidates = [2, 9];
  
  // Add some other cells with various candidates to make it realistic
  for (let i = 0; i < 81; i++) {
    if (grid[i].candidates.length === 0 && grid[i].value === null) {
      grid[i].candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    }
  }
  
  // Run the logic step finder
  const step = findNextLogicStep(grid, 2); // Focus on digit 2
  
  // Test assertions
  console.log('=== Hidden Single Test ===');
  console.log('Step found:', step);
  
  if (step && step.technique === 'Hidden Single') {
    const cellIndex = step.baseCells[0];
    const row = Math.floor(cellIndex / 9) + 1;
    const col = (cellIndex % 9) + 1;
    
    console.log(`Hidden Single found at R${row}C${col} for digit ${step.digit}`);
    
    // Check if it's R9C4 (index 75)
    if (cellIndex === 75) {
      console.log('❌ FAIL: R9C4 should NOT be identified as a hidden single!');
      console.log('Reason: Digit 2 is also a candidate in:');
      console.log('  - R9C5 (same row/box):', grid[76].candidates);
      console.log('  - R2C4 (same column):', grid[12].candidates);
      console.log('  - R4C4 (same column):', grid[30].candidates);
      return false;
    }
  } else {
    console.log('✓ No Hidden Single found for digit 2 (expected behavior)');
  }
  
  return true;
};

// Test case: R9C4 SHOULD be a hidden single if it's the only cell with candidate 2 in a unit
export const testHiddenSingleTruePositive = () => {
  const grid = createEmptyGrid();
  
  // Set up a valid hidden single case
  // R9C4 (index 75) - has candidate 2
  grid[75].candidates = [2, 5, 7];
  
  // Make sure NO OTHER cell in Row 9 has candidate 2
  for (let col = 0; col < 9; col++) {
    const idx = 8 * 9 + col;
    if (idx !== 75 && grid[idx].value === null) {
      grid[idx].candidates = [3, 4, 5, 6, 7, 8, 9]; // Everything except 2
    }
  }
  
  // Add candidates to other cells
  for (let i = 0; i < 81; i++) {
    if (grid[i].candidates.length === 0 && grid[i].value === null) {
      grid[i].candidates = [1, 3, 4, 5, 6, 7, 8, 9]; // Include 2 elsewhere
    }
  }
  
  const step = findNextLogicStep(grid, 2);
  
  console.log('\n=== Hidden Single Valid Test ===');
  console.log('Step found:', step);
  
  if (step && step.technique === 'Hidden Single' && step.baseCells[0] === 75) {
    console.log('✓ PASS: R9C4 correctly identified as hidden single');
    console.log('  Unit:', step.explanation);
    return true;
  } else {
    console.log('❌ FAIL: R9C4 should be identified as a hidden single');
    return false;
  }
};

// Run tests
console.log('Running Hidden Single Tests...\n');
const test1 = testHiddenSingleFalsePositive();
const test2 = testHiddenSingleTruePositive();

console.log('\n=== Test Results ===');
console.log('False Positive Test:', test1 ? '✓ PASS' : '❌ FAIL');
console.log('True Positive Test:', test2 ? '✓ PASS' : '❌ FAIL');