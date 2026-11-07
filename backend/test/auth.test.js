import assert from "node:assert/strict";
import { test } from "vitest";
import {
  createSocketTicket,
  sessionHash,
  sessionTokenFromCookie,
  socketTicketSessionId,
  verifySocketTicket,
} from "../src/middleware/auth.js";
import { Session } from "../src/models/Session.js";

test("extracts session cookies and hashes opaque tokens", () => {
  assert.equal(
    sessionTokenFromCookie("theme=dark; yektia_session=abc123"),
    "abc123",
  );
  assert.equal(
    sessionTokenFromCookie("theme=dark; caresync_session=legacy123"),
    "legacy123",
  );
  assert.equal(sessionHash("abc123").length, 64);
});

test("sessions do not persist IP or device metadata", () => {
  assert.equal(Session.schema.path("ip"), undefined);
  assert.equal(Session.schema.path("userAgent"), undefined);
});

test("short-lived socket tickets are bound to the active session", () => {
  const session = { id: "507f1f77bcf86cd799439011", tokenHash: "secret" };
  const ticket = createSocketTicket(session);
  assert.equal(socketTicketSessionId(ticket), session.id);
  assert.equal(verifySocketTicket(ticket, session), true);
  assert.equal(
    verifySocketTicket(ticket, { ...session, tokenHash: "another-secret" }),
    false,
  );
});
