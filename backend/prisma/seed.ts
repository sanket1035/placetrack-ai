import "dotenv/config";
import { ApplicationStatus, DriveStatus, PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const branches = ["Computer Engineering", "Information Technology", "AI & Data Science", "E&TC", "Electrical", "Mechanical", "Civil"];
const firstNames = ["Aarav", "Diya", "Kabir", "Ishita", "Rohan", "Meera", "Arjun", "Ananya", "Vivaan", "Saanvi", "Aditya", "Nisha"];
const lastNames = ["Mehta", "Sharma", "Reddy", "Nair", "Patel", "Iyer", "Singh", "Gupta", "Joshi", "Kumar"];
const skillsByBranch: Record<string, string[]> = {
  "Computer Engineering": ["Java", "Python", "React", "SQL", "Data Structures", "Cloud"],
  "Information Technology": ["Java", "Spring Boot", "SQL", "AWS", "Git", "System Design"],
  "AI & Data Science": ["Python", "Machine Learning", "SQL", "TensorFlow", "Data Analytics"],
  "E&TC": ["C++", "Python", "Embedded Systems", "IoT", "MATLAB"],
  Electrical: ["PLC", "Power Systems", "MATLAB", "AutoCAD", "Industrial Automation"],
  Mechanical: ["CAD", "SolidWorks", "ANSYS", "Manufacturing", "Quality"],
  Civil: ["AutoCAD", "STAAD Pro", "Project Management", "Surveying", "Estimation"]
};
const companyData = [
  ["NVIDIA", "https://nvidia.com"],
  ["TCS", "https://tcs.com"],
  ["Infosys", "https://infosys.com"],
  ["Wipro", "https://wipro.com"],
  ["IBM", "https://ibm.com"],
  ["Persistent Systems", "https://persistent.com"],
  ["Crompton Greaves", "https://cgglobal.com"],
  ["Cognizant", "https://cognizant.com"],
  ["Accenture", "https://accenture.com"],
  ["Capgemini", "https://capgemini.com"],
  ["L&T Technology Services", "https://ltts.com"],
  ["Bosch", "https://bosch.com"],
  ["Siemens", "https://siemens.com"],
  ["Tata Technologies", "https://tatatechnologies.com"],
  ["KPIT Technologies", "https://kpit.com"],
  ["HCLTech", "https://hcltech.com"],
  ["Tech Mahindra", "https://techmahindra.com"],
  ["Mahindra & Mahindra", "https://mahindra.com"],
  ["Cognizant Digital Engineering", "https://cognizant.com"],
  ["Hexaware", "https://hexaware.com"]
];

const premiumCompanies = new Set(["NVIDIA"]);
const highCompanies = new Set(["Persistent Systems", "IBM", "L&T Technology Services", "Bosch", "Siemens", "KPIT Technologies"]);

const quantitativeQuestions = [
  { section: "Quantitative", questionText: "A train covers 360 km in 4.5 hours. What is its average speed?", options: ["60 km/h", "70 km/h", "80 km/h", "90 km/h"], correctAnswer: 2, explanation: "Speed = distance/time = 360/4.5 = 80 km/h." },
  { section: "Quantitative", questionText: "A can do a work in 15 days and B in 20 days. If they work on it together for 4 days, then the fraction of the work that is left is:", options: ["1/4", "1/10", "7/15", "8/15"], correctAnswer: 3, explanation: "A's 1 day work = 1/15; B's 1 day work = 1/20. Together 1 day = 7/60. 4 days work = 28/60 = 7/15. Work left = 1 - 7/15 = 8/15." },
  { section: "Quantitative", questionText: "The price of petrol went up by 20%. By how much percent must a motorist reduce consumption to keep expenditure constant?", options: ["16.67%", "20%", "25%", "15%"], correctAnswer: 0, explanation: "Reduction % = (R / (100 + R)) * 100 = (20/120)*100 = 16.67%." },
  { section: "Quantitative", questionText: "At what rate of simple interest per annum will a sum of money double in 8 years?", options: ["11%", "12.5%", "13%", "15%"], correctAnswer: 1, explanation: "SI = P, so P = P * R * 8 / 100 => R = 100/8 = 12.5%." },
  { section: "Quantitative", questionText: "An article is sold for $300 at a profit of 20%. What was its cost price?", options: ["$240", "$250", "$260", "$270"], correctAnswer: 1, explanation: "Cost Price = Selling Price / 1.2 = 300 / 1.2 = 250." },
  { section: "Quantitative", questionText: "If A:B = 2:3 and B:C = 4:5, find the ratio A:B:C.", options: ["2:4:5", "8:12:15", "6:9:10", "8:10:15"], correctAnswer: 1, explanation: "A:B = 8:12, B:C = 12:15. So A:B:C = 8:12:15." },
  { section: "Quantitative", questionText: "The average of 5 consecutive numbers is 20. The largest of these numbers is:", options: ["20", "21", "22", "24"], correctAnswer: 2, explanation: "Let numbers be x-2, x-1, x, x+1, x+2. Average is x = 20. Largest is x+2 = 22." },
  { section: "Quantitative", questionText: "Two dice are thrown simultaneously. What is the probability of getting a sum of 7?", options: ["1/6", "5/36", "1/12", "1/4"], correctAnswer: 0, explanation: "Favorable cases: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) = 6 cases. Total = 36. Prob = 6/36 = 1/6." },
  { section: "Quantitative", questionText: "In how many different ways can the letters of the word 'LEADER' be arranged?", options: ["720", "360", "120", "144"], correctAnswer: 1, explanation: "Word has 6 letters, L,E,A,D,E,R. 'E' is repeated twice. Ways = 6! / 2! = 720 / 2 = 360." },
  { section: "Quantitative", questionText: "A, B and C start a business with investments of $12000, $15000 and $18000. Find share of A out of profit of $9000.", options: ["$2400", "$3000", "$3600", "$2000"], correctAnswer: 0, explanation: "Ratio of investment = 12:15:18 = 4:5:6. Sum of ratios = 15. A's share = (4/15) * 9000 = $2400." },
  { section: "Quantitative", questionText: "A boat goes 8 km downstream in 40 minutes and returns upstream in 1 hour. What is the speed of stream?", options: ["2 km/h", "3 km/h", "4 km/h", "1.5 km/h"], correctAnswer: 0, explanation: "Downstream speed = 8/(40/60) = 12 km/h. Upstream speed = 8/1 = 8 km/h. Stream speed = (12-8)/2 = 2 km/h." },
  { section: "Quantitative", questionText: "The ratio of ages of father and son is 7:3. If sum of their ages is 60, find father's age.", options: ["35 years", "42 years", "45 years", "40 years"], correctAnswer: 1, explanation: "Father's age = 7x, Son's = 3x. 10x = 60 => x = 6. Father's age = 7*6 = 42." },
  { section: "Quantitative", questionText: "Two pipes A and B can fill a tank in 12 and 16 hours. If both pipes are opened together, how long will it take to fill the tank?", options: ["6.85 hours", "7 hours", "8 hours", "9.2 hours"], correctAnswer: 0, explanation: "Time = (12 * 16) / (12 + 16) = 192 / 28 = 48/7 = 6.85 hours." },
  { section: "Quantitative", questionText: "Find the HCF of 120 and 160.", options: ["20", "40", "10", "60"], correctAnswer: 1, explanation: "Common factors of 120 and 160 give the highest common factor of 40." },
  { section: "Quantitative", questionText: "In what ratio must water be mixed with milk costing $12 per liter to obtain a mixture worth $8 per liter?", options: ["1:2", "2:1", "1:3", "3:1"], correctAnswer: 0, explanation: "By rule of alligation: Water(0) to Milk(12) to get Mix(8). Ratio Water:Milk = (12-8):(8-0) = 4:8 = 1:2." },
  { section: "Quantitative", questionText: "A person travels from A to B at 40 km/h and returns at 60 km/h. What is the average speed?", options: ["50 km/h", "48 km/h", "45 km/h", "52 km/h"], correctAnswer: 1, explanation: "Average speed = 2xy/(x+y) = (2 * 40 * 60) / 100 = 48 km/h." },
  { section: "Quantitative", questionText: "Find the area of a circle whose circumference is 44 cm.", options: ["154 cm²", "77 cm²", "308 cm²", "144 cm²"], correctAnswer: 0, explanation: "2 * (22/7) * r = 44 => r = 7. Area = (22/7) * 7 * 7 = 154." },
  { section: "Quantitative", questionText: "What was the day of the week on 15th August 1947?", options: ["Thursday", "Friday", "Saturday", "Sunday"], correctAnswer: 1, explanation: "Historical fact / calendar math shows that 15th August 1947 was a Friday." },
  { section: "Quantitative", questionText: "At what angle are the hands of a clock inclined at 15 minutes past 5?", options: ["67.5 degrees", "60 degrees", "72.5 degrees", "58.5 degrees"], correctAnswer: 0, explanation: "Angle = |30H - 5.5M| = |30*5 - 5.5*15| = |150 - 82.5| = 67.5 degrees." },
  { section: "Quantitative", questionText: "Which of the following numbers is divisible by 9?", options: ["23456", "34567", "45678", "45675"], correctAnswer: 3, explanation: "Sum of digits of 45675 is 4+5+6+7+5 = 27, which is divisible by 9." }
];

const logicalQuestions = [
  { section: "Logical", questionText: "Find the next number in the series: 2, 6, 12, 20, 30, ?", options: ["36", "40", "42", "44"], correctAnswer: 2, explanation: "Differences are consecutive even numbers: +4, +6, +8, +10, then +12. 30 + 12 = 42." },
  { section: "Logical", questionText: "In a certain code, TRUTH is written as SUUUI. How is FALSE written in that code?", options: ["GZMTD", "EZKTD", "GZKTD", "EBLRD"], correctAnswer: 2, explanation: "Each vowel and consonant changes by alternative increments (+1, -1)." },
  { section: "Logical", questionText: "Pointing to a man, a woman said, 'His mother is the only daughter of my father'. How is the woman related to the man?", options: ["Sister", "Grandmother", "Mother", "Aunt"], correctAnswer: 2, explanation: "Only daughter of woman's father is the woman herself. So she is his mother." },
  { section: "Logical", questionText: "A man walks 5 km East, turns right and walks 4 km, then turns left and walks 5 km. Which direction is he facing?", options: ["North", "South", "East", "West"], correctAnswer: 2, explanation: "He was going East, turned right (now South), turned left (now East). So he faces East." },
  { section: "Logical", questionText: "Statements: All cats are dogs. All dogs are mammals. Conclusion: All cats are mammals.", options: ["Conclusion is false", "Conclusion is true", "Cannot be determined", "Partially true"], correctAnswer: 1, explanation: "Venn diagram logic shows cats are subset of dogs, dogs are subset of mammals; hence cats are mammals." },
  { section: "Logical", questionText: "Six people A, B, C, D, E, and F are sitting in a circle facing the center. B is between F and D. E is between A and C. F is to the left of D. Who is sitting opposite B?", options: ["E", "A", "C", "Cannot be determined"], correctAnswer: 0, explanation: "By drawing the circle, opposite of B is E." },
  { section: "Logical", questionText: "Choose the analog pair: Doctor : Patient :: ?", options: ["Lawyer : Client", "Teacher : School", "Chef : Food", "Author : Book"], correctAnswer: 0, explanation: "Doctor serves a Patient, just as a Lawyer serves a Client." },
  { section: "Logical", questionText: "Find the odd one out among the options:", options: ["Zinc", "Iron", "Copper", "Coal"], correctAnswer: 3, explanation: "Zinc, Iron, and Copper are metals, whereas Coal is a non-metal / mineral." },
  { section: "Logical", questionText: "Complete the letter series: A, C, F, J, O, ?", options: ["T", "U", "V", "W"], correctAnswer: 1, explanation: "Intervals between letters increase by +1: A(+2)C(+3)F(+4)J(+5)O(+6)U." },
  { section: "Logical", questionText: "Which Venn diagram represents India, Asia, and World?", options: ["Three disjoint circles", "Three concentric circles", "Two intersecting circles inside one", "None of these"], correctAnswer: 1, explanation: "India is inside Asia, which is inside the World. Represented by concentric circles." },
  { section: "Logical", questionText: "Statement: 'Buy brand X shoes for durability.' - Ad. Assumption: Durability is desired by customers.", options: ["Assumption is valid", "Assumption is invalid", "Partially valid", "None of these"], correctAnswer: 0, explanation: "An ad mentions durability because it assumes customers want durable shoes." },
  { section: "Logical", questionText: "If '+' is '*', '-' is '/', '*' is '+' and '/' is '-', what is 10 * 5 + 3 / 2?", options: ["23", "20", "25", "18"], correctAnswer: 0, explanation: "Replaced: 10 + 5 * 3 - 2 = 10 + 15 - 2 = 23." },
  { section: "Logical", questionText: "In a row of 30 students, Amit is 12th from the left. What is his rank from the right end?", options: ["18th", "19th", "17th", "20th"], correctAnswer: 1, explanation: "Rank from right = (Total - Left Rank) + 1 = (30 - 12) + 1 = 19." },
  { section: "Logical", questionText: "If it was Monday on Jan 1, 2007, what was the day on Jan 1, 2008?", options: ["Monday", "Tuesday", "Wednesday", "Sunday"], correctAnswer: 1, explanation: "2007 is a non-leap year (365 days = 52 weeks + 1 day). So next year starts 1 day ahead, Tuesday." },
  { section: "Logical", questionText: "A is taller than B. C is taller than A. D is taller than E but shorter than B. Who is the tallest?", options: ["A", "B", "C", "D"], correctAnswer: 2, explanation: "Order: C > A > B > D > E. Tallest is C." },
  { section: "Logical", questionText: "Look at this series: F2, __, D8, C16, B32. Fill in the blank.", options: ["E3", "E4", "F4", "E6"], correctAnswer: 1, explanation: "Alphabet decreases: F, E, D, C, B. Numbers double: 2, 4, 8, 16, 32. Answer is E4." },
  { section: "Logical", questionText: "If SEND + MORE = MONEY, what digit does 'M' represent in this standard puzzle?", options: ["0", "1", "2", "9"], correctAnswer: 1, explanation: "In this cryptarithmetic puzzle, the carry-over M must be 1." },
  { section: "Logical", questionText: "Six books are stacked. History is above Physics. Chemistry is below Biology. Geography is between History and Biology. Civics is below Chemistry. Which book is at the bottom?", options: ["Civics", "Physics", "Chemistry", "Geography"], correctAnswer: 0, explanation: "Based on layout, Civics is stacked below Chemistry, making it the bottom book." },
  { section: "Logical", questionText: "Two statements are followed by conclusions. Statement: All birds are green. Some green things can fly. Conclusion: All birds can fly.", options: ["Valid", "Invalid", "Partially valid", "Insufficient data"], correctAnswer: 1, explanation: "Green circles intersect flying things, but birds are not necessarily in that intersection." },
  { section: "Logical", questionText: "If A is B's brother, B is C's sister, and C is D's father, how is A related to D?", options: ["Brother", "Uncle", "Father", "Grandfather"], correctAnswer: 1, explanation: "A is B and C's brother. C is D's father. So A is D's uncle." }
];

const verbalQuestions = [
  { section: "Verbal", questionText: "Choose the word closest in meaning to the word 'CONCISE'.", options: ["Lengthy", "Brief", "Unclear", "Ancient"], correctAnswer: 1, explanation: "Concise means brief and to the point." },
  { section: "Verbal", questionText: "Find the antonym of the word 'AMATEUR'.", options: ["Novice", "Professional", "Learner", "Unskilled"], correctAnswer: 1, explanation: "An amateur does something as a hobby; a professional does it as a vocation." },
  { section: "Verbal", questionText: "Fill in the blank: The manager was angry _____ the employee's behavior.", options: ["at", "with", "on", "about"], correctAnswer: 0, explanation: "One is angry 'at' someone's behavior or action, and angry 'with' a person." },
  { section: "Verbal", questionText: "Identify the grammatically correct sentence:", options: ["He don't know the answer.", "He doesn't knows the answer.", "He doesn't know the answer.", "He did not knew the answer."], correctAnswer: 2, explanation: "'He doesn't know' is grammatically correct third-person singular present negative." },
  { section: "Verbal", questionText: "What is the meaning of the idiom: 'To spill the beans'?", options: ["To drop food", "To reveal a secret", "To perform a task", "To complain"], correctAnswer: 1, explanation: "Spilling the beans is an idiom that means disclosing secret information prematurely." },
  { section: "Verbal", questionText: "Find the one-word substitute: 'A person who writes dictionaries'.", options: ["Lexicographer", "Cartographer", "Biographer", "Calligrapher"], correctAnswer: 0, explanation: "A lexicographer compiles or writes dictionaries." },
  { section: "Verbal", questionText: "Convert to passive voice: 'The chef prepared a delicious meal.'", options: ["A delicious meal was prepared by the chef.", "A delicious meal prepared by the chef.", "The chef was preparing a delicious meal.", "A delicious meal is prepared by chef."], correctAnswer: 0, explanation: "Passive structure: Object + was/were + past participle + by + Subject." },
  { section: "Verbal", questionText: "Choose the correct spelling:", options: ["Accomodate", "Accommodate", "Acomodate", "Accomoddat"], correctAnswer: 1, explanation: "The correct spelling is 'Accommodate' with double 'c' and double 'm'." },
  { section: "Verbal", questionText: "Fill in the blank: Neither the teacher nor the students _____ present.", options: ["was", "were", "is", "has"], correctAnswer: 1, explanation: "When using 'neither... nor', the verb agrees with the closer subject ('students' which is plural, so 'were')." },
  { section: "Verbal", questionText: "Find the synonym of 'PRUDENT'.", options: ["Reckless", "Wise", "Foolish", "Poor"], correctAnswer: 1, explanation: "Prudent means showing care and thought for the future; wise." },
  { section: "Verbal", questionText: "Identify the error in: 'Each of the girls have brought her own books.'", options: ["Each of", "girls have", "brought her", "No error"], correctAnswer: 1, explanation: "'Each' is singular, so it should be 'each of the girls has brought', not 'have'." },
  { section: "Verbal", questionText: "Fill in the blank: If I _____ a king, I would build a palace.", options: ["was", "were", "am", "had been"], correctAnswer: 1, explanation: "Subjunctive mood for hypothetical conditions uses 'were' regardless of pronoun." },
  { section: "Verbal", questionText: "What is the antonym of 'TRANSITORY'?", options: ["Temporary", "Permanent", "Brief", "Moving"], correctAnswer: 1, explanation: "Transitory means brief or temporary; its opposite is permanent." },
  { section: "Verbal", questionText: "Choose the correct preposition: We have been waiting here _____ 2 hours.", options: ["since", "for", "from", "during"], correctAnswer: 1, explanation: "Use 'for' for duration of time (2 hours) and 'since' for starting point." },
  { section: "Verbal", questionText: "Identify the meaning of: 'A blessing in disguise'.", options: ["A fake gift", "A good thing that seemed bad at first", "A helper", "An event"], correctAnswer: 1, explanation: "A blessing in disguise is something good that is not recognized initially." },
  { section: "Verbal", questionText: "Select the word that best fits: The sound of the wind was highly _____.", options: ["soothing", "soothed", "soothes", "soothingly"], correctAnswer: 0, explanation: "The adjective form 'soothing' is appropriate to describe the wind's sound." },
  { section: "Verbal", questionText: "Find the synonym of 'ABOLISH'.", options: ["Establish", "Destroy / End", "Construct", "Maintain"], correctAnswer: 1, explanation: "Abolish means to formally put an end to a system, practice, or institution." },
  { section: "Verbal", questionText: "Fill in the blank: She has a great passion _____ classical music.", options: ["for", "about", "with", "on"], correctAnswer: 0, explanation: "The preposition that collocates with passion is 'for'." },
  { section: "Verbal", questionText: "Choose the antonym of 'EXPAND'.", options: ["Grow", "Contract", "Stretch", "Spread"], correctAnswer: 1, explanation: "Expand means to make larger; contract means to make smaller." },
  { section: "Verbal", questionText: "Identify the spelling error:", options: ["Receive", "Believe", "Calendar", "Tommorow"], correctAnswer: 3, explanation: "The correct spelling is 'Tomorrow' (one 'm', double 'r')." }
];

const technicalQuestions = [
  { section: "Technical", questionText: "Which data structure provides average O(1) key lookup time complexity?", options: ["Array", "Linked list", "Hash table", "Binary search tree"], correctAnswer: 2, explanation: "Hash tables resolve lookup in O(1) on average using key hashing." },
  { section: "Technical", questionText: "What is the main property of a Stack data structure?", options: ["FIFO", "LIFO", "Priority-based", "Random Access"], correctAnswer: 1, explanation: "Stack operates on Last-In, First-Out (LIFO) order." },
  { section: "Technical", questionText: "In relational databases, what does the Primary Key guarantee?", options: ["Uniqueness & non-null values", "Foreign relationships", "Fast sorting only", "Duplicate storage"], correctAnswer: 0, explanation: "Primary key guarantees uniqueness and cannot contain null values." },
  { section: "Technical", questionText: "Which of the following is NOT a necessary condition for a deadlock?", options: ["Mutual exclusion", "Hold and wait", "Preemption", "Circular wait"], correctAnswer: 2, explanation: "No-preemption is a condition. Preemption actually breaks deadlock." },
  { section: "Technical", questionText: "In the OSI model, which layer handles routing of packets across networks?", options: ["Physical Layer", "Data Link Layer", "Network Layer", "Transport Layer"], correctAnswer: 2, explanation: "The Network Layer is responsible for routing, addressing, and packet forwarding." },
  { section: "Technical", questionText: "What does Polymorphism represent in Object-Oriented Programming?", options: ["Having multiple classes", "Taking multiple forms", "Data hiding", "Code compiling"], correctAnswer: 1, explanation: "Polymorphism means 'many forms', enabling a single interface for different types." },
  { section: "Technical", questionText: "What is the worst-case time complexity of the QuickSort algorithm?", options: ["O(n log n)", "O(n²)", "O(n)", "O(2ⁿ)"], correctAnswer: 1, explanation: "Worst case of QuickSort is O(n²) when the pivot selection is highly unbalanced." },
  { section: "Technical", questionText: "Which HTTP response code corresponds to 'Resource Not Found'?", options: ["200 OK", "400 Bad Request", "401 Unauthorized", "404 Not Found"], correctAnswer: 3, explanation: "404 is the standard HTTP code for Not Found." },
  { section: "Technical", questionText: "What is the main function of the Lexical Analyzer in a compiler?", options: ["Parse syntax trees", "Generate machine code", "Convert characters to tokens", "Link files"], correctAnswer: 2, explanation: "Lexical analysis reads stream of characters and groups them into meaningful tokens." },
  { section: "Technical", questionText: "Which SQL JOIN returns all records when there is a match in either left or right table?", options: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN"], correctAnswer: 3, explanation: "FULL OUTER JOIN returns all matching and non-matching records from both tables." },
  { section: "Technical", questionText: "Which Git command is used to add file changes to the staging area?", options: ["git commit", "git push", "git add", "git status"], correctAnswer: 2, explanation: "'git add' stages changes for the next commit." },
  { section: "Technical", questionText: "What is the difference between '==' and '===' in JavaScript?", options: ["No difference", "=== checks type as well as value", "== checks type as well as value", "=== is for assignment"], correctAnswer: 1, explanation: "=== performs strict equality comparison checking both value and type." },
  { section: "Technical", questionText: "Which of the following is true about a Python Tuple compared to a List?", options: ["Tuples are mutable", "Tuples are immutable", "Tuples hold only strings", "Tuples are larger in memory"], correctAnswer: 1, explanation: "Tuples are immutable sequences, whereas lists can be modified after creation." },
  { section: "Technical", questionText: "Which AWS cloud storage service is object-based?", options: ["Amazon EC2", "Amazon EBS", "Amazon S3", "Amazon RDS"], correctAnswer: 2, explanation: "Amazon Simple Storage Service (S3) is an object storage service." },
  { section: "Technical", questionText: "Which encryption type uses the same key for both encryption and decryption?", options: ["Asymmetric encryption", "Symmetric encryption", "Hashing", "Public-key cryptography"], correctAnswer: 1, explanation: "Symmetric encryption uses a single shared key for both operations." },
  { section: "Technical", questionText: "In Scrum Agile framework, what is the typical duration of a Sprint?", options: ["1 year", "1 day", "1 to 4 weeks", "6 months"], correctAnswer: 2, explanation: "Sprints are short, consistent iterations, usually 1 to 4 weeks long." },
  { section: "Technical", questionText: "What is the main purpose of a Dockerfile?", options: ["Run the application", "Define steps to build a Docker image", "Store user credentials", "Configure system bios"], correctAnswer: 1, explanation: "A Dockerfile contains instructions needed to package and build a container image." },
  { section: "Technical", questionText: "What is the essential precondition for performing Binary Search on an array?", options: ["Array must be sorted", "Array must be empty", "Array size must be prime", "Array must be multi-dimensional"], correctAnswer: 0, explanation: "Binary search divides sorted search space, hence sorting is a strict precondition." },
  { section: "Technical", questionText: "Which SQL command is used to delete the table structure along with its data?", options: ["DELETE TABLE", "TRUNCATE TABLE", "DROP TABLE", "REMOVE TABLE"], correctAnswer: 2, explanation: "DROP TABLE deletes the schema definition and all row data from database." },
  { section: "Technical", questionText: "Which of the following database isolation levels offers the highest level of concurrency protection?", options: ["Read Uncommitted", "Read Committed", "Repeatable Read", "Serializable"], correctAnswer: 3, explanation: "Serializable isolation level prevents dirty, non-repeatable reads and phantom reads by locking data." }
];

async function reset() {
  await prisma.resumeAnalysis.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.testResult.deleteMany();
  await prisma.question.deleteMany();
  await prisma.aptitudeTest.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.application.deleteMany();
  await prisma.placementDrive.deleteMany();
  await prisma.company.deleteMany();
  await prisma.student.deleteMany();
  await prisma.coordinator.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await reset();
  const passwordHash = await bcrypt.hash("Demo@123", 10);
  await prisma.user.create({
    data: { email: "coordinator@placetrack.ai", passwordHash, role: UserRole.COORDINATOR, coordinator: { create: { department: "Training & Placement", phone: "+91 9000000000" } } }
  });
  await prisma.user.create({
    data: { email: "admin@placetrack.ai", passwordHash, role: UserRole.ADMIN }
  });

  const userDataList = Array.from({ length: 150 }, (_, index) => {
    const branch = branches[index % branches.length];
    return {
      email: index === 0 ? "student@placetrack.ai" : `student${index + 1}@placetrack.ai`,
      passwordHash,
      role: UserRole.STUDENT,
      branch,
      cgpa: index === 0 ? 8.6 : Number((6.4 + ((index * 7) % 31) / 10).toFixed(2)),
      backlogs: index === 0 ? 0 : index % 23 === 0 ? 2 : index % 11 === 0 ? 1 : 0,
      graduationYear: 2027,
      skills: skillsByBranch[branch],
      readinessScore: index === 0 ? 88 : 58 + ((index * 11) % 38),
      mockTestCount: 2 + (index % 9),
      name: `${firstNames[index % firstNames.length]} ${lastNames[(index * 3) % lastNames.length]}`
    };
  });

  // Batch-insert all 150 User rows in one query
  await prisma.user.createMany({
    data: userDataList.map(({ name: _n, branch: _b, cgpa: _c, backlogs: _bl, graduationYear: _gy, skills: _sk, readinessScore: _rs, mockTestCount: _mt, ...user }) => user),
    skipDuplicates: true
  });

  // Fetch the inserted user IDs in one query
  const insertedUsers = await prisma.user.findMany({
    where: { email: { in: userDataList.map(u => u.email) } },
    select: { id: true, email: true }
  });
  const emailToId = new Map(insertedUsers.map(u => [u.email, u.id]));

  // Batch-insert all 150 Student rows in one query
  await prisma.student.createMany({
    data: userDataList.map(item => ({
      userId: emailToId.get(item.email)!,
      name: item.name,
      cgpa: item.cgpa,
      branch: item.branch,
      backlogs: item.backlogs,
      graduationYear: item.graduationYear,
      skills: item.skills,
      readinessScore: item.readinessScore,
      mockTestCount: item.mockTestCount
    })),
    skipDuplicates: true
  });


  const companies = [];
  for (const [name, website] of companyData) {
    companies.push(await prisma.company.create({ data: { name, website, description: `${name} is a KK Wagh engineering campus hiring partner.` } }));
  }
  const drives = [];
  for (let index = 0; index < 100; index++) {
    const company = companies[index % companies.length];
    const premium = premiumCompanies.has(company.name) && index === 0;
    const high = highCompanies.has(company.name) && index % 4 === 0;
    drives.push(await prisma.placementDrive.create({
      data: {
        companyId: company.id,
        role: premium ? "GPU Systems Software Engineer" : ["Software Engineer", "Technology Analyst", "Product Engineer", "Graduate Engineer Trainee", "Embedded Engineer", "Data Analyst"][index % 6],
        package: premium ? 25 : high ? Number((8 + (index % 8) * 0.7).toFixed(1)) : Number((4.8 + (index % 5) * 0.28).toFixed(1)),
        location: ["Nashik", "Pune", "Mumbai", "Bengaluru", "Hyderabad", "Remote"][index % 6],
        jobType: "Full-time",
        description: premium
          ? "Premium product engineering role. Strong coding, hackathon participation, certifications, and systems fundamentals are recommended."
          : "Engineering campus role focused on software, service delivery, product development, testing, and continuous learning.",
        minCgpa: premium ? 8.5 : high ? 7.5 : 6.5 + (index % 3) * 0.25,
        allowedBranches: premium
          ? ["Computer Engineering", "Information Technology", "AI & Data Science", "E&TC"]
          : index % 3 === 0
            ? ["Computer Engineering", "Information Technology", "AI & Data Science"]
            : branches,
        maxBacklogs: premium || high ? 0 : 1,
        graduationYear: 2027,
        deadline: new Date(Date.now() + (7 + index) * 86_400_000),
        testDate: new Date(Date.now() + (14 + index) * 86_400_000),
        interviewDate: new Date(Date.now() + (21 + index) * 86_400_000),
        status: index < 90 ? DriveStatus.OPEN : DriveStatus.COMPLETED
      }
    }));
  }

  const students = await prisma.student.findMany({ orderBy: { id: "asc" } });
  const statuses = Object.values(ApplicationStatus);
  const applicationRows = [];
  for (let index = 0; index < 5000; index++) {
    const student = students[index % students.length];
    const drive = drives[(index * 17 + Math.floor(index / students.length)) % drives.length];
    applicationRows.push({
      studentId: student.id,
      driveId: drive.id,
      status: statuses[index % statuses.length],
      timeline: [{ status: "APPLIED", at: new Date(Date.now() - (index % 60) * 86_400_000).toISOString(), note: "Seeded application" }]
    });
  }
  const uniqueApplications = [...new Map(applicationRows.map((row) => [`${row.studentId}:${row.driveId}`, row])).values()];
  await prisma.application.createMany({ data: uniqueApplications, skipDuplicates: true });

  for (let index = 0; index < 20; index++) {
    await prisma.aptitudeTest.create({
      data: {
        title: `Placement Aptitude Mock ${index + 1}`,
        duration: 30,
        sectionConfig: { Quantitative: 1, Logical: 1, Verbal: 1, Technical: 1 },
        questions: {
          create: [
            quantitativeQuestions[index],
            logicalQuestions[index],
            verbalQuestions[index],
            technicalQuestions[index]
          ]
        }
      }
    });
  }
  const tests = await prisma.aptitudeTest.findMany();
  const results = [];
  for (let index = 0; index < 200; index++) {
    const student = students[index % students.length];
    const test = tests[index % tests.length];
    const accuracy = 48 + ((index * 13) % 51);
    results.push({
      studentId: student.id, testId: test.id, score: Math.round(accuracy / 25), accuracy,
      sectionScores: { Quantitative: accuracy, Logical: Math.min(100, accuracy + 5), Verbal: Math.max(0, accuracy - 7), Technical: Math.min(100, accuracy + 2) },
      strongAreas: accuracy >= 70 ? ["Logical", "Technical"] : [],
      weakAreas: accuracy < 60 ? ["Verbal", "Quantitative"] : []
    });
  }
  await prisma.testResult.createMany({ data: [...new Map(results.map((row) => [`${row.studentId}:${row.testId}`, row])).values()], skipDuplicates: true });
  console.log(`Seeded KK Wagh engineering data: 150 students, ${companies.length} companies, 100 drives, ${uniqueApplications.length} applications, 20 tests, and 200 results.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
