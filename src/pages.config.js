import SudokuMentor from './pages/SudokuMentor';
import SudokuMentorMobile from './pages/SudokuMentorMobile';
import TestSuite from './pages/TestSuite';


export const PAGES = {
    "SudokuMentor": SudokuMentor,
    "SudokuMentorMobile": SudokuMentorMobile,
    "TestSuite": TestSuite,
}

export const pagesConfig = {
    mainPage: "SudokuMentor",
    Pages: PAGES,
};