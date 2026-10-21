import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    role: string;
    name: string;
    client_id: number | null;
    token_version: number;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      client_id: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    client_id?: number | null;
    /** users.token_version at sign-in; a mismatch revokes the session. */
    tv?: number;
    /** Sign-in time (unix seconds), for the absolute session lifetime. */
    auth_time?: number;
  }
}
