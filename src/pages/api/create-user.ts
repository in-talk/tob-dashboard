import { withApiAuth } from "@/lib/auth/guard";
import { ADMIN } from "@/lib/auth/roles";
import { createUser } from "@/lib/auth/users";

// Legacy endpoint kept for the CreateUser component; same rules as POST /api/users.
// (It used to hardcode client_id = 24 — client access now comes only from
// clients_by_users.)
export default withApiAuth((req, res, user) => createUser(req, res, user), { roles: { POST: ADMIN } });
