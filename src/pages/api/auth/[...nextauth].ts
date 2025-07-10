import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import db from "@/lib/db"; // Use our database utility instead of Prisma

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("Incoming credentials:", credentials);
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }
        try {
          const { email, password } = credentials;

          console.log(" Querying user from DB");
          const result = await db.query(
            "SELECT * FROM users WHERE email = $1",
            [email.toLowerCase()]
          );
          console.log(" Query successfull");
          const user = result.rows[0];

          if (!user) {
            throw new Error("Email not found");
          }
          console.log(" password comparing ");
          const isValid = await compare(password, user.password);
          console.log(" password compare", isValid);
          if (!isValid) {
            throw new Error("Invalid password");
          }

          console.log("Auth successful, returning user");

          // Return user data in the expected format
          return {
            id: user.id.toString(),
            name: user.name || "",
            email: user.email,
            role: user.role || "user",
            client_id: user.client_id || null,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.client_id = user.client_id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.client_id = token.client_id as number;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: true,
  pages: {
    signIn: "/signin",
    error: "/unauthorize",
  },
};

export default NextAuth(authOptions);
