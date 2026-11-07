/**
 * Starter aptitude question bank: 60 original placement-style questions across three sections,
 * packaged as two 30-question mock tests. Loaded on demand by an admin (POST /api/tests/starter-bank).
 * The correct option is placed deterministically at a varying position so answers are not predictable.
 */
export type BankQuestion = {
  section: "Quantitative" | "Logical" | "Verbal";
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

let counter = 0;
function q(section: BankQuestion["section"], questionText: string, correct: string, wrong: [string, string, string], explanation: string): BankQuestion {
  const position = (counter++ * 3 + 1) % 4;
  const options = [...wrong];
  options.splice(position, 0, correct);
  return { section, questionText, options, correctAnswer: position, explanation };
}

const quantitative: BankQuestion[] = [
  q("Quantitative", "A train running at 60 km/hr crosses a pole in 9 seconds. What is the length of the train?", "150 metres", ["120 metres", "180 metres", "324 metres"], "Speed = 60 × 5/18 = 16.67 m/s. Length = speed × time = 16.67 × 9 = 150 m."),
  q("Quantitative", "The average of 20 numbers is zero. At the most, how many of them may be greater than zero?", "19", ["0", "1", "10"], "The sum is 0. If 19 numbers are positive, the 20th can be a large negative number that cancels them, so at most 19."),
  q("Quantitative", "A can finish a work in 12 days and B in 18 days. Working together, how many days will they take?", "7.2 days", ["6 days", "8 days", "15 days"], "Combined rate = 1/12 + 1/18 = 5/36 per day, so time = 36/5 = 7.2 days."),
  q("Quantitative", "What is 20% of 250 plus 15% of 400?", "110", ["100", "120", "130"], "20% of 250 = 50 and 15% of 400 = 60. Sum = 110."),
  q("Quantitative", "What is the simple interest on ₹5000 at 8% per annum for 3 years?", "₹1200", ["₹1000", "₹1500", "₹1600"], "SI = P × R × T / 100 = 5000 × 8 × 3 / 100 = 1200."),
  q("Quantitative", "An article bought for ₹800 is sold for ₹920. What is the profit percentage?", "15%", ["12%", "18%", "20%"], "Profit = 120. Profit % = 120/800 × 100 = 15%."),
  q("Quantitative", "Two numbers are in the ratio 3:5 and their sum is 64. What is the larger number?", "40", ["24", "32", "45"], "Total parts = 8, one part = 8, larger = 5 × 8 = 40."),
  q("Quantitative", "A boat goes 10 km/h in still water and the stream flows at 2 km/h. How long to travel 36 km downstream?", "3 hours", ["3.6 hours", "4 hours", "4.5 hours"], "Downstream speed = 10 + 2 = 12 km/h. Time = 36/12 = 3 hours."),
  q("Quantitative", "What is the compound interest on ₹10,000 at 10% per annum for 2 years?", "₹2100", ["₹2000", "₹2200", "₹2310"], "Amount = 10000 × 1.1² = 12100. CI = 12100 − 10000 = 2100."),
  q("Quantitative", "What is the LCM of 12, 18 and 24?", "72", ["48", "96", "144"], "12 = 2²×3, 18 = 2×3², 24 = 2³×3. LCM = 2³ × 3² = 72."),
  q("Quantitative", "What is the HCF of 36 and 84?", "12", ["6", "18", "24"], "36 = 2²×3², 84 = 2²×3×7. HCF = 2² × 3 = 12."),
  q("Quantitative", "Two fair dice are thrown. What is the probability that the sum is 7?", "1/6", ["1/12", "7/36", "5/36"], "Six outcomes (1,6),(2,5),(3,4),(4,3),(5,2),(6,1) out of 36 give 6/36 = 1/6."),
  q("Quantitative", "In how many distinct ways can the letters of the word LEVEL be arranged?", "30", ["60", "120", "24"], "5 letters with L repeated twice and E repeated twice: 5!/(2!×2!) = 120/4 = 30."),
  q("Quantitative", "If x + 1/x = 3, what is the value of x² + 1/x²?", "7", ["5", "9", "11"], "Square both sides: x² + 2 + 1/x² = 9, so x² + 1/x² = 7."),
  q("Quantitative", "What is the area of a circle of radius 7 cm? (use π = 22/7)", "154 sq cm", ["44 sq cm", "308 sq cm", "49 sq cm"], "Area = πr² = 22/7 × 49 = 154."),
  q("Quantitative", "A shopkeeper allows a 10% discount on a marked price of ₹500. What is the selling price?", "₹450", ["₹400", "₹475", "₹490"], "Discount = 50. Selling price = 500 − 50 = 450."),
  q("Quantitative", "Pipe A fills a tank in 6 hours and pipe B empties it in 12 hours. If both are open, how long to fill the tank?", "12 hours", ["8 hours", "10 hours", "18 hours"], "Net rate = 1/6 − 1/12 = 1/12 per hour, so 12 hours."),
  q("Quantitative", "The average age of 5 students is 16. A sixth student aged 22 joins. What is the new average?", "17", ["16.5", "17.5", "18"], "Total = 80 + 22 = 102. New average = 102/6 = 17."),
  q("Quantitative", "At 10% simple interest per annum, in how many years will a sum of money double?", "10 years", ["5 years", "8 years", "12 years"], "Interest must equal the principal: P × 10% × T = P, so T = 10 years."),
];

const logical: BankQuestion[] = [
  q("Logical", "Find the next number: 2, 6, 12, 20, 30, ?", "42", ["40", "44", "36"], "Differences are 4, 6, 8, 10, so the next difference is 12 and 30 + 12 = 42."),
  q("Logical", "Find the next number: 1, 4, 9, 16, 25, ?", "36", ["30", "49", "35"], "These are squares of 1, 2, 3, 4, 5, so the next is 6² = 36."),
  q("Logical", "Which one does not belong with the others?", "Potato", ["Apple", "Mango", "Banana"], "Apple, mango and banana are fruits; potato is a vegetable."),
  q("Logical", "If CAT is coded as 3120 (C=3, A=1, T=20), how is DOG coded?", "4157", ["41507", "4175", "4147"], "D=4, O=15, G=7, written together as 4157."),
  q("Logical", "Pointing to a man, a woman says: \"He is the son of my mother's only son.\" How is the man related to the woman?", "Nephew", ["Brother", "Son", "Cousin"], "My mother's only son is the woman's brother, so his son is her nephew."),
  q("Logical", "A man walks 5 km north, then 3 km east, then 5 km south. How far is he from the starting point?", "3 km", ["5 km", "8 km", "13 km"], "The north and south legs cancel, leaving only the 3 km east displacement."),
  q("Logical", "All cats are animals. Some animals are wild. Conclusion: some cats are wild.", "Cannot be determined", ["Definitely true", "Definitely false", "True only for lions"], "The wild animals may or may not include cats, so the conclusion does not follow."),
  q("Logical", "What is the angle between the hour and minute hands of a clock at 3:00?", "90°", ["60°", "120°", "180°"], "At 3:00 the hands point at 3 and 12, which are 3 hour-marks of 30° each apart: 90°."),
  q("Logical", "Find the next number: 3, 9, 27, 81, ?", "243", ["162", "324", "729"], "Each term is multiplied by 3: 81 × 3 = 243."),
  q("Logical", "Book is to Reading as Fork is to ?", "Eating", ["Cooking", "Cutting", "Drinking"], "A book is used for reading, and a fork is used for eating."),
  q("Logical", "If 1 January 2023 was a Sunday, what day was 1 February 2023?", "Wednesday", ["Monday", "Tuesday", "Thursday"], "January has 31 days; 31 mod 7 = 3, and Sunday + 3 days = Wednesday."),
  q("Logical", "Ravi is 8th from the left and 12th from the right in a row. How many people are in the row?", "19", ["20", "18", "21"], "Total = 8 + 12 − 1 = 19, since Ravi is counted in both."),
  q("Logical", "Find the next letter: A, C, F, J, O, ?", "U", ["T", "V", "S"], "Letter positions go 1, 3, 6, 10, 15 with growing gaps 2, 3, 4, 5. The next gap is 6: 15 + 6 = 21 = U."),
  q("Logical", "If today is Wednesday, what day was it 100 days ago?", "Monday", ["Tuesday", "Friday", "Sunday"], "100 mod 7 = 2, and Wednesday minus 2 days is Monday."),
  q("Logical", "Find the next number: 2, 3, 5, 7, 11, ?", "13", ["12", "14", "15"], "These are consecutive prime numbers; the next prime after 11 is 13."),
  q("Logical", "If A=1, B=2, C=3 and so on, what is the sum of the letter values in BAD?", "7", ["6", "8", "9"], "B=2, A=1, D=4, and 2 + 1 + 4 = 7."),
  q("Logical", "In a class of 40, 25 like tea, 20 like coffee and 5 like neither. How many like both?", "10", ["5", "15", "20"], "35 like at least one drink. 25 + 20 − both = 35, so both = 10."),
  q("Logical", "Which number does not belong: 3, 5, 7, 9, 11?", "9", ["3", "7", "11"], "All others are prime numbers; 9 = 3 × 3 is not."),
  q("Logical", "Find the next number: 5, 10, 20, 40, ?", "80", ["60", "70", "100"], "Each term doubles: 40 × 2 = 80."),
  q("Logical", "A father is 3 times as old as his son. After 12 years he will be twice as old. What is the son's present age?", "12 years", ["8 years", "10 years", "15 years"], "3S + 12 = 2(S + 12) gives S = 12."),
];

const verbal: BankQuestion[] = [
  q("Verbal", "Choose the synonym of AMBIGUOUS.", "Vague", ["Clear", "Certain", "Helpful"], "Ambiguous means open to more than one meaning, or unclear; vague is the closest."),
  q("Verbal", "Choose the antonym of BENEVOLENT.", "Malevolent", ["Kind", "Generous", "Charitable"], "Benevolent means well-meaning and kind; malevolent means wishing harm."),
  q("Verbal", "Choose the synonym of PRUDENT.", "Careful", ["Reckless", "Lazy", "Loud"], "Prudent means acting with care and thought for the future."),
  q("Verbal", "Fill in the blank: She ___ to the market yesterday.", "went", ["goes", "gone", "going"], "Yesterday signals the simple past tense, so \"went\"."),
  q("Verbal", "Fill in the blank: Neither of the boys ___ present.", "was", ["were", "are", "have been"], "\"Neither\" takes a singular verb, so \"was\"."),
  q("Verbal", "Choose the grammatically correct sentence.", "He doesn't like tea.", ["He don't like tea.", "He doesn't likes tea.", "He not like tea."], "With a third-person singular subject use \"doesn't\" followed by the base verb \"like\"."),
  q("Verbal", "What does the idiom \"break the ice\" mean?", "Start a conversation in an awkward situation", ["Break something frozen", "End a friendship", "Win an argument"], "It means to ease tension and begin a conversation."),
  q("Verbal", "What does the idiom \"once in a blue moon\" mean?", "Very rarely", ["Every month", "At night", "Very often"], "A blue moon is rare, so the phrase means something that happens very rarely."),
  q("Verbal", "Choose the one word for \"a person who loves books\".", "Bibliophile", ["Philanthropist", "Misanthrope", "Egoist"], "A bibliophile is a lover or collector of books."),
  q("Verbal", "Choose the antonym of ABUNDANT.", "Scarce", ["Plentiful", "Ample", "Rich"], "Abundant means existing in large quantities; scarce means in short supply."),
  q("Verbal", "Choose the synonym of EPHEMERAL.", "Short-lived", ["Eternal", "Heavy", "Ancient"], "Ephemeral means lasting for a very short time."),
  q("Verbal", "Fill in the blank: He is senior ___ me.", "to", ["than", "from", "with"], "\"Senior\" is followed by \"to\", not \"than\"."),
  q("Verbal", "Choose the correctly spelt word.", "Accommodation", ["Acommodation", "Accomodation", "Acomodation"], "Accommodation has a double c and a double m."),
  q("Verbal", "Change to passive voice: \"The teacher praised the student.\"", "The student was praised by the teacher.", ["The student praised the teacher.", "The student is praised by the teacher.", "The teacher was praised by the student."], "The past-tense active verb becomes \"was praised\" and the object becomes the subject."),
  q("Verbal", "Fill in the blank: I have been waiting ___ two hours.", "for", ["since", "from", "during"], "\"For\" is used with a period of time; \"since\" is used with a starting point."),
  q("Verbal", "Choose the synonym of CANDID.", "Frank", ["Hidden", "Rude", "Silent"], "Candid means truthful and straightforward, so frank."),
  q("Verbal", "Choose the antonym of EXPAND.", "Contract", ["Grow", "Extend", "Spread"], "To expand is to become larger; to contract is to become smaller."),
  q("Verbal", "Fill in the blank: If I ___ you, I would apply for that job.", "were", ["am", "was", "be"], "Hypothetical conditions use the subjunctive \"were\"."),
  q("Verbal", "Fill in the blank: The committee ___ its decision yesterday.", "announced", ["announce", "announcing", "have announced"], "Yesterday needs the simple past, and \"committee\" is treated as singular."),
  q("Verbal", "\"Although it was raining, the match continued.\" What does this show?", "The rain did not stop the match", ["The match was cancelled", "It was not raining", "The match was delayed"], "\"Although\" introduces a contrast: the match went on despite the rain."),
];

const slice = (items: BankQuestion[], from: number, to: number) => items.slice(from, to);

export const STARTER_TESTS = [
  {
    title: "Placement Aptitude Mock 1",
    duration: 30,
    sectionConfig: { Quantitative: 10, Logical: 10, Verbal: 10 },
    questions: [...slice(quantitative, 0, 10), ...slice(logical, 0, 10), ...slice(verbal, 0, 10)]
  },
  {
    title: "Placement Aptitude Mock 2",
    duration: 30,
    sectionConfig: { Quantitative: 10, Logical: 10, Verbal: 10 },
    questions: [...slice(quantitative, 10, 20), ...slice(logical, 10, 20), ...slice(verbal, 10, 20)]
  }
];
