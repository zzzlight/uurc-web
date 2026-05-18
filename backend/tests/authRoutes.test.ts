import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

describe("gateway-only backend routes", () => {
  it("does not expose backend-owned auth, device, or room business endpoints", async () => {
    const { app } = createApp({ enableDiagnostics: true });

    await request(app).get("/api/auth/status").expect(404);
    await request(app).post("/api/auth/import").send({ token: "token-1" }).expect(404);
    await request(app).get("/api/devices").expect(404);
    await request(app).post("/api/rooms/join-by-device").send({ deviceId: "desktop-1" }).expect(404);
  });
});
