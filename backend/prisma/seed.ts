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

const aptitudeQuestions = [
  { section: "Quantitative", questionText: "A train covers 360 km in 4.5 hours. What is its average speed?", options: ["60 km/h", "70 km/h", "80 km/h", "90 km/h"], correctAnswer: 2, explanation: "Speed = distance/time = 360/4.5 = 80." },
  { section: "Logical", questionText: "Find the next number: 2, 6, 12, 20, 30, ?", options: ["36", "40", "42", "44"], correctAnswer: 2, explanation: "Differences are 4, 6, 8, 10, then 12." },
  { section: "Verbal", questionText: "Choose the word closest in meaning to concise.", options: ["Lengthy", "Brief", "Unclear", "Ancient"], correctAnswer: 1, explanation: "Concise means brief and clear." },
  { section: "Technical", questionText: "Which data structure provides average O(1) key lookup?", options: ["Array", "Linked list", "Hash table", "Binary tree"], correctAnswer: 2, explanation: "Hash tables provide average constant-time lookup." }
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
        questions: { create: aptitudeQuestions.map((question, questionIndex) => ({ ...question, questionText: `${question.questionText} [Set ${index + 1}.${questionIndex + 1}]` })) }
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
