import request from "supertest";
import { app } from "../src/server.js";
import { prisma } from "../src/lib/prisma.js";
import { signToken } from "../src/middleware/auth.js";

let alice: string;
let bob: string;
let tpc: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: "@offcampus.test" } } });
  const mk = (email: string) =>
    prisma.user.create({
      data: { email, role: "STUDENT", student: { create: { name: email, branch: "Information Technology", cgpa: 8, graduationYear: 2027, skills: [], onboarded: true } } }
    });
  alice = signToken((await mk("alice@offcampus.test")).id, "STUDENT");
  bob = signToken((await mk("bob@offcampus.test")).id, "STUDENT");
  const coordinator = await prisma.user.create({ data: { email: "tpc@offcampus.test", role: "ADMIN" } });
  tpc = signToken(coordinator.id, "ADMIN");
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: "@offcampus.test" } } });
  await prisma.$disconnect();
});

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("off-campus tracker", () => {
  let id: string;

  it("lets a student add and update an application with a timeline", async () => {
    const created = await request(app).post("/api/off-campus").set(auth(alice)).send({ company: "Zoho", role: "Intern", type: "INTERNSHIP", link: "https://careers.zoho.com/1" });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("APPLIED");
    id = created.body.id;

    const updated = await request(app).patch(`/api/off-campus/${id}`).set(auth(alice)).send({ status: "INTERVIEW", update: "HR called, interview on Monday" });
    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe("INTERVIEW");
    expect(updated.body.timeline).toHaveLength(2);
    expect(updated.body.timeline[1].note).toContain("HR called");
  });

  it("rejects non-http links", async () => {
    const bad = await request(app).post("/api/off-campus").set(auth(alice)).send({ company: "X", role: "Y", link: "javascript:alert(1)" });
    expect(bad.status).toBe(400);
  });

  it("keeps each student's list private", async () => {
    const mine = await request(app).get("/api/off-campus").set(auth(alice));
    expect(mine.body.map((row: any) => row.id)).toContain(id);
    const theirs = await request(app).get("/api/off-campus").set(auth(bob));
    expect(theirs.body).toEqual([]);
    expect((await request(app).patch(`/api/off-campus/${id}`).set(auth(bob)).send({ status: "REJECTED" })).status).toBe(404);
    expect((await request(app).delete(`/api/off-campus/${id}`).set(auth(bob))).status).toBe(404);
  });

  it("blocks coordinators and admins from the tracker", async () => {
    expect((await request(app).get("/api/off-campus").set(auth(tpc))).status).toBe(403);
    expect((await request(app).get("/api/off-campus")).status).toBe(401);
  });

  it("lets the owner delete a record", async () => {
    expect((await request(app).delete(`/api/off-campus/${id}`).set(auth(alice))).status).toBe(204);
  });
});
