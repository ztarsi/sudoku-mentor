import SudokuMentor from './pages/SudokuMentor';
import TestHiddenSingle from './pages/TestHiddenSingle';
import TestSuite from './pages/TestSuite';
import SudokuMentorMobile from './pages/SudokuMentorMobile';


export const PAGES = {
    "SudokuMentor": SudokuMentor,
    "TestHiddenSingle": TestHiddenSingle,
    "TestSuite": TestSuite,
    "SudokuMentorMobile": SudokuMentorMobile,
}

export const pagesConfig = {
    mainPage: "SudokuMentor",
    Pages: PAGES,
};