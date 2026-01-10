import SudokuMentor from './pages/SudokuMentor';
import SudokuMentorMobile from './pages/SudokuMentorMobile';
import TestHiddenSingle from './pages/TestHiddenSingle';
import TestSuite from './pages/TestSuite';


export const PAGES = {
    "SudokuMentor": SudokuMentor,
    "SudokuMentorMobile": SudokuMentorMobile,
    "TestHiddenSingle": TestHiddenSingle,
    "TestSuite": TestSuite,
}

export const pagesConfig = {
    mainPage: "SudokuMentor",
    Pages: PAGES,
};