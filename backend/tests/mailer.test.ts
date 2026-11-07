import { parseSender, sendEmail } from "../src/services/mailer.js";

describe("mailer sender parsing", () => {
  it("splits a display name and address", () => {
    expect(parseSender("PlaceTrack <noreply@college.edu>")).toEqual({ name: "PlaceTrack", email: "noreply@college.edu" });
    expect(parseSender('"KKW Placement" <tpo@kkwagh.edu.in>')).toEqual({ name: "KKW Placement", email: "tpo@kkwagh.edu.in" });
  });
  it("accepts a bare address", () => {
    expect(parseSender("me@example.com")).toEqual({ email: "me@example.com" });
  });
});

describe("sendEmail with Brevo", () => {
  it("posts to the Brevo HTTPS API with the sender, recipient and html", async () => {
    process.env.BREVO_API_KEY = "test-key";
    process.env.EMAIL_FROM = "PlaceTrack <tpo@kkwagh.edu.in>";
    const calls: Array<{ url: string; init: any }> = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, init: any) => {
      calls.push({ url: String(url), init });
      return new Response("{}", { status: 201 });
    }) as typeof fetch;
    try {
      await sendEmail({ to: "student@kkwagh.edu.in", subject: "New drive", html: "<p>hi</p>" });
    } finally {
      globalThis.fetch = realFetch;
      delete process.env.BREVO_API_KEY;
    }
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(calls[0].init.headers["api-key"]).toBe("test-key");
    const body = JSON.parse(calls[0].init.body);
    expect(body.sender).toEqual({ name: "PlaceTrack", email: "tpo@kkwagh.edu.in" });
    expect(body.to).toEqual([{ email: "student@kkwagh.edu.in" }]);
    expect(body.htmlContent).toBe("<p>hi</p>");
  });
});
