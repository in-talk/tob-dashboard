import { withApiAuth } from "@/lib/auth/guard";
import { ADMIN } from "@/lib/auth/roles";
import { createUser, deleteUser, listUsers, updateUser } from "@/lib/auth/users";

export default withApiAuth(
  (req, res, user) => {
    switch (req.method) {
      case "GET":
        return listUsers(req, res);
      case "POST":
        return createUser(req, res, user);
      case "PUT":
        return updateUser(req, res, user);
      case "DELETE":
        return deleteUser(req, res, user);
    }
  },
  { roles: { GET: ADMIN, POST: ADMIN, PUT: ADMIN, DELETE: ADMIN } }
);
