import request from "supertest";
import { jest } from "@jest/globals";
import { app } from "../src/server.js";
import { prisma } from "../src/lib/prisma.js";
import { signToken } from "../src/middleware/auth.js";
import { formatPackage } from "../src/lib/package.js";
import { inviteMail, buildTpcInviteEmail } from "../src/services/inviteEmail.js";

let admin: string;
const auth = () => ({ Authorization: `Bearer ${admin}` });
const base = {
  company: { name: "RangeCo" }, role: "Dev", package: 3.5, location: "Pune", jobType: "FULL_TIME",
  description: "Developer role at RangeCo", minCgpa: 6, allowedBranches: ["Information Technology"], maxBacklogs: 0,
  graduationYear: 2027, deadline: new Date(Date.now() + 86400000 * 9).toISOString()
};

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: "@pkgrange.test" } } });
  const u = await prisma.user.create({ data: { email: "admin@pkgrange.test", role: "ADMIN" } });
  admin = signToken(u.id, "ADMIN");
});
afterAll(async () => {
  await prisma.placementDrive.deleteMany({ where: { company: { name: "RangeCo" } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@pkgrange.test" } } });
  await prisma.$disconnect();
});

describe("package range", () => {
  it("formats ranges and fixed packages", () => {
    expect(formatPackage(3.5, 5)).toBe("3.5-5 LPA");
    expect(formatPackage(6)).toBe("6 LPA");
    expect(formatPackage(6, 6)).toBe("6 LPA");
  });

  it("creates a drive with a range and rejects max below min", async () => {
    const ok = await request(app).post("/api/drives").set(auth()).send({ ...base, packageMax: 5 });
    expect(ok.status).toBe(201);
    expect(ok.body.packageMax).toBe(5);
    const bad = await request(app).post("/api/drives").set(auth()).send({ ...base, packageMax: 2 });
    expect(bad.status).toBe(400);
    const patch = await request(app).patch(`/api/drives/${ok.body.id}`).set(auth()).send({ packageMax: 1 });
    expect(patch.status).toBe(400);
    const cleared = await request(app).patch(`/api/drives/${ok.body.id}`).set(auth()).send({ packageMax: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.packageMax).toBeNull();
  });
});

describe("coordinator invite", () => {
  it("emails the new coordinator and still succeeds if mail fails", async () => {
    const spy = jest.spyOn(inviteMail, "send").mockResolvedValue(undefined as never);
    const res = await request(app).post("/api/auth/users/tpc").set(auth()).send({ email: "new@pkgrange.test", name: "New Tpc", department: "Civil" });
    expect(res.status).toBe(201);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ to: "new@pkgrange.test" }));
    spy.mockRejectedValue(new Error("boom"));
    const res2 = await request(app).post("/api/auth/users/tpc").set(auth()).send({ email: "new2@pkgrange.test", name: "New Two", department: "Civil" });
    expect(res2.status).toBe(201);
    spy.mockRestore();
    expect(buildTpcInviteEmail({ name: "A", email: "a@b.c", department: "Civil" }).html).toContain("coordinator");
  });
});
