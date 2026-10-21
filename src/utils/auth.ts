import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

/**
 * Page guard for getServerSideProps. Uses getServerSession (not getSession)
 * so the full revocation check runs server-side without an HTTP round trip.
 */
export const withAuth = <P extends Record<string, unknown>>(
  handler: (ctx: GetServerSidePropsContext) => Promise<GetServerSidePropsResult<P>>,
  allowedRoles: string[]
) => {
  return async (ctx: GetServerSidePropsContext): Promise<GetServerSidePropsResult<P>> => {
    const session = await getServerSession(ctx.req, ctx.res, authOptions);

    if (!session?.user?.id) {
      return { redirect: { destination: "/signin", permanent: false } };
    }
    if (!allowedRoles.includes(session.user.role)) {
      return { redirect: { destination: "/unauthorize?reason=forbidden", permanent: false } };
    }

    return handler(ctx);
  };
};
