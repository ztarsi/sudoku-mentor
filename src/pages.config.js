import { lazy } from 'react';

// One page arranges itself by width and pointer (one-adaptive-page spec).
// It is lazy so the router shell paints before the engines load.
const SudokuMentor = lazy(() => import('./pages/SudokuMentor'));

export const PAGES = {
    "SudokuMentor": SudokuMentor,
}

export const pagesConfig = {
    mainPage: "SudokuMentor",
    Pages: PAGES,
};
