// What each built-in library puzzle teaches, measured once rather than on
// every visit to the library (#95). The library used to walk all twenty
// solve paths each time it opened; the Ultimate shelf alone took 13 seconds
// to fill in its labels.
//
// These are the analyser's own answers, not hand-written labels: the test
// in __tests__/libraryTeaching.spec.js re-measures every built-in puzzle
// with the live analyser and fails if any entry here differs, or if a
// library puzzle has no entry. That test is the feature; this file is only
// its cache. When it fails, it prints the entry to paste here.
//
// Keyed by the puzzle's 81 digits, so a puzzle keeps its entry through a
// rename. Imported and photographed puzzles are not here and are measured
// live, as before.

/** @type {Record<string, { complete: boolean, namedOnly: boolean, hardestTechnique: string | null, hardestTier: string | null }>} */
export const LIBRARY_TEACHING = {
  // easy: Gentle Start
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079': { complete: true, namedOnly: true, hardestTechnique: 'Naked Single', hardestTier: 'Basic' },
  // easy: Sunday Morning
  '004050000900734600003021049035090480090000030076010920310970200009182003000060100': { complete: true, namedOnly: true, hardestTechnique: 'Naked Single', hardestTier: 'Basic' },
  // easy: Coffee Break
  '000260701680070090190004500820100040004602900050003028009300074040050036703018000': { complete: true, namedOnly: true, hardestTechnique: 'Naked Single', hardestTier: 'Basic' },
  // easy: Early Riser
  '000000000000003085001020000000507000004000100090000000500000073002010000000040009': { complete: true, namedOnly: true, hardestTechnique: 'Hidden Single', hardestTier: 'Basic' },
  // easy: Garden Path
  '000000012000035000000600070700000300000400800100000000000120000080000040050000600': { complete: true, namedOnly: true, hardestTechnique: 'Hidden Single', hardestTier: 'Basic' },
  // medium: Brain Teaser
  '000000680000073009309000045490000000803050902000000036960000308700680000028000000': { complete: true, namedOnly: true, hardestTechnique: 'Pointing Pair', hardestTier: 'Intermediate' },
  // medium: Morning Crossword
  '400000507900300040000000090002090300040000100000006820000704000080035000600000001': { complete: true, namedOnly: true, hardestTechnique: 'Pointing Pair', hardestTier: 'Intermediate' },
  // medium: Tea Time
  '000008602047600005000200000086000000001000300495000108000094006000060010100002070': { complete: true, namedOnly: true, hardestTechnique: 'Pointing Triple', hardestTier: 'Intermediate' },
  // hard: Lunch Puzzle
  '020608000580009700000040000370000500600000004008000013000020000009800036000306090': { complete: true, namedOnly: true, hardestTechnique: 'Naked Triple', hardestTier: 'Advanced' },
  // expert: Deep Waters
  '006800000040000000075000604050000000020501080000006003009003400004068501002040090': { complete: true, namedOnly: true, hardestTechnique: 'XY-Wing', hardestTier: 'Expert' },
  // expert: Falcon's Dive
  '800900000000805730000004001074300000005000020000100600000700000100000085000006240': { complete: true, namedOnly: true, hardestTechnique: 'XY-Wing', hardestTier: 'Expert' },
  // diabolical: Devil's Den
  '500000000036019200000000040600900800000080730007063400400050020001200380000700001': { complete: true, namedOnly: true, hardestTechnique: 'Empty Rectangle', hardestTier: 'Expert' },
  // diabolical: Witching Hour
  '020190003640000208070000900000905600000000000003080009100730000065000000000008040': { complete: true, namedOnly: true, hardestTechnique: 'Empty Rectangle', hardestTier: 'Expert' },
  // ultimate: Night Owl
  '000600400700003600000091080000000000050180003000306045040200060903000000020000100': { complete: true, namedOnly: true, hardestTechnique: '3D Medusa', hardestTier: 'Ultimate' },
  // ultimate: Long Haul
  '005300000800000020070010500400005300010070006003200080060500009004000030000009700': { complete: true, namedOnly: true, hardestTechnique: 'Forcing Net', hardestTier: 'Forcing' },
  // ultimate: Golden Nugget
  '000000039000001005003050800008090006070002000100400000009080050020000600400700000': { complete: true, namedOnly: true, hardestTechnique: 'Forcing Net', hardestTier: 'Forcing' },
  // ultimate: Easter Monster
  '100000002090400050006000700050903000000070000000850040700000600030009080002000001': { complete: true, namedOnly: true, hardestTechnique: 'Forcing Net', hardestTier: 'Forcing' },
  // ultimate: World's Hardest
  '800000000003600000070090200050007000000045700000100030001000068008500010090000400': { complete: true, namedOnly: true, hardestTechnique: 'Forcing Net', hardestTier: 'Forcing' },
  // ultimate: AI Escargot
  '100007090030020008009600500005300900010080002600004000300000010040000007007000300': { complete: true, namedOnly: true, hardestTechnique: 'Forcing Net', hardestTier: 'Forcing' },
  // ultimate: Platinum Blonde
  '000000012000000003002300400001800005060070800000009000008500000900040500470006000': { complete: true, namedOnly: true, hardestTechnique: 'Forcing Net', hardestTier: 'Forcing' },
};
