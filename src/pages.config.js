import { lazy } from 'react';

// Each page is its own chunk: a phone never downloads the desktop page's
// Logic Panel, and the desktop never downloads the phone layout.
const SudokuMentor = lazy(() => import('./pages/SudokuMentor'));
const SudokuMentorMobile = lazy(() => import('./pages/SudokuMentorMobile'));

export const PAGES = {
    "SudokuMentor": SudokuMentor,
    "SudokuMentorMobile": SudokuMentorMobile,
}

export const pagesConfig = {
    mainPage: "SudokuMentor",
    Pages: PAGES,
};
