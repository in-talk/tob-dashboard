import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { getSession } from "next-auth/react";

export const withAuth = <P extends Record<string, unknown>>(
  handler: (ctx: GetServerSidePropsContext) => Promise<GetServerSidePropsResult<P>>,
  allowedRoles: string[]
) => {
  return async (ctx: GetServerSidePropsContext) => {
    const session = await getSession(ctx);

    if (!session || !allowedRoles.includes(session.user?.role)) {
      return {
        redirect: {
          destination: "/signin",
          permanent: false,
        },
      };
    }

    return handler(ctx);
  };
};