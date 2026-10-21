import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import { AuthedUser } from "./guard";
import { hashPassword, passwordProblem } from "./password";
import { isRole } from "./roles";
import { audit, hasUserColumn, invalidateAuthState } from "./state";
import { clientIp } from "./rateLimit";

// Shared user-management logic for /api/users and /api/create-user.

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

function ctx(req: NextApiRequest, actor: AuthedUser) {
  return {
    userId: actor.id,
    email: actor.email,
    ip: clientIp(req.headers, req.socket?.remoteAddress),
    userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
  };
}

function cleanName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s && s.length <= 100 ? s : null;
}

function cleanEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return EMAIL_RE.test(s) && s.length <= 254 ? s : null;
}

export async function listUsers(_req: NextApiRequest, res: NextApiResponse) {
  const extra = (await hasUserColumn("is_active")) ? ", is_active" : "";
  const result = await db.query(`SELECT id, name, email, role, created_at${extra} FROM users ORDER BY id ASC`);
  return res.status(200).json(result.rows.map((u: { id: number }) => ({ ...u, id: String(u.id) })));
}

export async function createUser(req: NextApiRequest, res: NextApiResponse, actor: AuthedUser) {
  const { password, role } = req.body ?? {};
  const email = cleanEmail(req.body?.email);
  const name = cleanName(req.body?.name);

  if (!email || !name || !password || !role) {
    return res.status(400).json({ ok: false, error: "Valid email, name, password and role are required" });
  }
  if (!isRole(role)) return res.status(400).json({ ok: false, error: "Invalid role" });
  const pwErr = passwordProblem(password, email);
  if (pwErr) return res.status(400).json({ ok: false, error: pwErr });

  const exists = await db.query("SELECT id FROM users WHERE email = $1", [email]);
  if (exists.rows.length > 0) return res.status(409).json({ ok: false, error: "User already exists" });

  const insert = await db.query(
    `INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
    [email, await hashPassword(password), name, role]
  );
  const userId = String(insert.rows[0].id);
  await audit("user_created", { ...ctx(req, actor), details: { target: userId, email, role } });
  return res.status(201).json({ ok: true, message: "User created successfully", userId });
}

export async function updateUser(req: NextApiRequest, res: NextApiResponse, actor: AuthedUser) {
  const { id, password, role, is_active } = req.body ?? {};
  const email = cleanEmail(req.body?.email);
  const name = cleanName(req.body?.name);

  if (!id || !/^\d+$/.test(String(id)) || !email || !name || !role) {
    return res.status(400).json({ ok: false, error: "Missing or invalid fields" });
  }
  if (!isRole(role)) return res.status(400).json({ ok: false, error: "Invalid role" });

  const targetId = String(id);
  const isSelf = targetId === actor.id;
  if (isSelf && role !== actor.role) {
    return res.status(400).json({ ok: false, error: "You can't change your own role" });
  }
  if (isSelf && is_active === false) {
    return res.status(400).json({ ok: false, error: "You can't deactivate your own account" });
  }

  const current = await db.query("SELECT role, email FROM users WHERE id = $1", [targetId]);
  if (!current.rows[0]) return res.status(404).json({ ok: false, error: "User not found" });

  const sets = ["email = $1", "name = $2", "role = $3"];
  const params: unknown[] = [email, name, role];
  let revoke = current.rows[0].role !== role || current.rows[0].email !== email;

  const changingPassword = typeof password === "string" && password.trim() !== "";
  if (changingPassword) {
    const pwErr = passwordProblem(password, email);
    if (pwErr) return res.status(400).json({ ok: false, error: pwErr });
    params.push(await hashPassword(password));
    sets.push(`password = $${params.length}`);
    if (await hasUserColumn("password_changed_at")) sets.push("password_changed_at = NOW()");
    revoke = true;
  }

  if (typeof is_active === "boolean" && (await hasUserColumn("is_active"))) {
    params.push(is_active);
    sets.push(`is_active = $${params.length}`);
    if (!is_active) revoke = true;
  }

  // Bumping token_version signs the user out everywhere.
  if (revoke && (await hasUserColumn("token_version"))) sets.push("token_version = token_version + 1");

  params.push(targetId);
  const result = await db.query(
    `UPDATE users SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING id`,
    params
  );
  if (!result.rows.length) return res.status(404).json({ ok: false, error: "User not found" });

  invalidateAuthState(targetId);
  await audit("user_updated", {
    ...ctx(req, actor),
    details: { target: targetId, role, passwordChanged: changingPassword, is_active, sessionsRevoked: revoke },
  });
  return res.status(200).json({ ok: true, message: "User updated successfully" });
}

export async function deleteUser(req: NextApiRequest, res: NextApiResponse, actor: AuthedUser) {
  const id = req.body?.id;
  if (!id || !/^\d+$/.test(String(id))) return res.status(400).json({ ok: false, error: "User ID is required" });
  if (String(id) === actor.id) return res.status(400).json({ ok: false, error: "You can't delete your own account" });

  const result = await db.query("DELETE FROM users WHERE id = $1 RETURNING id, email", [String(id)]);
  if (!result.rows.length) return res.status(404).json({ ok: false, error: "User not found" });

  invalidateAuthState(String(id));
  await audit("user_deleted", { ...ctx(req, actor), details: { target: String(id), email: result.rows[0].email } });
  return res.status(200).json({ ok: true, message: "User deleted successfully" });
}
