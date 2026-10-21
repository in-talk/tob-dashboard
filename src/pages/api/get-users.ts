import { withApiAuth } from "@/lib/auth/guard";
import { ADMIN } from "@/lib/auth/roles";
import { listUsers } from "@/lib/auth/users";

export default withApiAuth((req, res) => listUsers(req, res), { roles: { GET: ADMIN } });
