import "@/styles/globals.css";
import type { AppProps } from "next/app";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

import { Toaster } from "@/components/ui/toaster";
import { SessionProvider, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import ThemeToggler from "@/components/ThemeToggler";
import { ThemeProviders } from "@/theme/ThemeProviders";
import { CallDataProvider } from "@/context/CallRecordContext";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
  router,
}: AppProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProviders>
        <MainLayout
          Component={Component}
          pageProps={pageProps}
          router={router}
        />
        <Toaster />
      </ThemeProviders>
    </SessionProvider>
  );
}

export function MainLayout({ Component, pageProps }: AppProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const isLoginPage = router.pathname === "/signin";

  return (
    <>
      {session && !isLoginPage ? (
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">
                        Building Your Application
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Dashboard</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <ThemeToggler />
            </header>
            <CallDataProvider>
              <Component {...pageProps} />
            </CallDataProvider>
            <Toaster />
          </SidebarInset>
        </SidebarProvider>
      ) : (
        <div>
          {/* <SimpleHeader /> */}
            <CallDataProvider>
          <Component {...pageProps} />
          </CallDataProvider>
        </div>
      )}
    </>
  );
}
