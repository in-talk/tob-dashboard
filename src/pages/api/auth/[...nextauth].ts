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
        try {

          if (!credentials?.email || !credentials?.password) {
            throw new Error("Missing email or password");
          }

          const { email, password } = credentials;

          // Query the database directly
          const result = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
          );

          const user = result.rows[0];


          if (!user) {
            throw new Error("Email not found");
          }

          const isValid = await compare(password, user.password);

          if (!isValid) {
            throw new Error("Invalid password");
          }


          // Return user data in the expected format
          return {
            id: user.id.toString(),
            name: user.name || "",
            email: user.email,
            role: user.role || "user",
            client_id: user.client_id || null
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === "development",
  pages: {
    signIn: "/signin",
    error: "/unauthorize",
  },
};

export default NextAuth(authOptions);