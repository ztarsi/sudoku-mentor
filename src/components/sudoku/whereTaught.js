// Which library puzzles teach a technique (#88), from the analyser's own
// answers in libraryTeaching.js, so a technique's reference can say where a
// player will be shown it - or say plainly that no puzzle does yet, rather
// than implying a lesson the library cannot deliver.
import { PUZZLES } from './puzzles';
import { LIBRARY_TEACHING } from './libraryTeaching';

export const SHELF_LABELS = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
  diabolical: 'Diabolical',
  ultimate: 'Ultimate',
};

// Technique -> the puzzles that teach it, easiest shelf first. Built once:
// the library and its answers are fixed for the life of the page.
const INDEX = new Map();
for (const [shelf, list] of Object.entries(PUZZLES)) {
  for (const p of list) {
    for (const technique of LIBRARY_TEACHING[p.puzzle.join('')]?.teaches ?? []) {
      if (!INDEX.has(technique)) INDEX.set(technique, []);
      INDEX.get(technique).push({ name: p.name, shelf });
    }
  }
}

/** The built-in puzzles whose hint path uses `technique`, easiest shelf first. */
export const puzzlesTeaching = (technique) => INDEX.get(technique) ?? [];

// How many puzzles a reference names before it says "and N more".
const NAMED = 4;

/**
 * One line for a technique's reference. Trial and error is the one thing
 * the library does not set out to teach, so it gets its own words.
 */
export const whereTaughtLine = (technique, tier) => {
  if (tier === 'What-if') {
    return 'The library does not set out to teach trial and error. The mentor reaches for it only when nothing it can prove applies.';
  }
  const found = puzzlesTeaching(technique);
  if (found.length === 0) {
    return 'No puzzle in the library teaches this yet: on these boards an easier technique always gets there first. You can still meet it on a puzzle you import.';
  }
  const named = found.slice(0, NAMED).map((p) => `${p.name} (${SHELF_LABELS[p.shelf] ?? p.shelf})`);
  const more = found.length - named.length;
  const list =
    more > 0
      ? `${named.join(', ')} and ${more} more`
      : named.length === 1
        ? named[0]
        : `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`;
  return `In the library: ${list}. Ask for hints there and the mentor will show it to you.`;
};
