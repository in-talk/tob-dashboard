import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import { formatDateForDB } from "@/utils/formatDateTime";
import { allowedClientIds, AuthedUser, requireClientAccess, withApiAuth } from "@/lib/auth/guard";
import { audit } from "@/lib/auth/state";

async function handler(req: NextApiRequest, res: NextApiResponse, user: AuthedUser) {
  const defaultToData = new Date().toISOString().split("T")[0];

  const {
    client_id,
    client_ids,
    from_date = defaultToData,
    to_date = `${defaultToData} 23:59:59`,
  } = req.body ?? {};

  // Handle both single client_id and multiple client_ids
  let targetClientIds: number[] = [];

  if (Array.isArray(client_ids) && client_ids.length > 0) {
    targetClientIds = client_ids.map((id) => Number(id));
    if (targetClientIds.some((id) => !Number.isSafeInteger(id) || id <= 0) || targetClientIds.length > 1000) {
      return res.status(400).json({ error: "client_ids is invalid" });
    }
    const scope = await allowedClientIds(user);
    if (scope !== "all" && targetClientIds.some((id) => !scope.includes(id))) {
      await audit("access_denied", { userId: user.id, email: user.email, details: { client_ids: targetClientIds } });
      return res.status(403).json({ error: "Forbidden" });
    }
  } else {
    const id = await requireClientAccess(user, client_id, res);
    if (id === null) return;
    targetClientIds = [id as number];
  }

  let queryText = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let queryParams: any[] = [];

  if (targetClientIds.length > 1) {
    // Multiple clients: use the function that accepts an array
    queryText = `SELECT * FROM get_agent_disposition_report1($1::bigint[], $2, $3);`;
    queryParams = [targetClientIds, formatDateForDB(from_date), formatDateForDB(to_date)];
  } else {
    // Single client: use the original function that accepts a scalar ID
    queryText = `SELECT * FROM get_agent_disposition_report($1::bigint, $2, $3);`;
    queryParams = [targetClientIds[0], formatDateForDB(from_date), formatDateForDB(to_date)];
  }

  const result = await db.query(queryText, queryParams);

  res.status(200).json({ agentRecords: result.rows });
}

export default withApiAuth(handler, { roles: { POST: ["admin", "user"] } });
