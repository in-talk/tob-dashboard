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
import { PrimeReactProvider } from "primereact/api";

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
import { ThemeProviders } from "@/theme/ThemeProviders";
import "primereact/resources/themes/lara-dark-indigo/theme.css";

// import { CallDataProvider } from "@/context/CallRecordContext";
import Head from "next/head";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
  router,
}: AppProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProviders>
        <PrimeReactProvider>
          <MainLayout
            Component={Component}
            pageProps={pageProps}
            router={router}
          />

          <Toaster />
        </PrimeReactProvider>
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
      <Head>
        <meta
          name="title"
          content="InTalk AI Agent Call Center Dashboard - Smart Customer Service Management"
        />
        <meta
          name="description"
          content="Advanced AI-powered call center dashboard for managing customer service operations. Monitor agent performance, track call metrics, and optimize customer interactions with intelligent analytics and real-time insights."
        />
        <meta
          name="keywords"
          content="AI call center, customer service dashboard, call center analytics, agent performance, customer support, artificial intelligence, call monitoring, service metrics, contact center management"
        />
        <meta name="robots" content="index, follow" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="language" content="English" />
        <meta name="author" content="Your Company Name" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.intalk.ai/" />
        <meta
          property="og:title"
          content="AI Agent Call Center Dashboard - Smart Customer Service Management"
        />
        <meta
          property="og:description"
          content="Advanced AI-powered call center dashboard for managing customer service operations. Monitor agent performance, track call metrics, and optimize customer interactions with intelligent analytics."
        />

        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://www.intalk.ai/" />
        <meta
          property="twitter:title"
          content="AI Agent Call Center Dashboard - Smart Customer Service Management"
        />
        <meta
          property="twitter:description"
          content="Advanced AI-powered call center dashboard for managing customer service operations. Monitor agent performance and optimize customer interactions."
        />

        <meta name="theme-color" content="#ffffff" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta
          name="application-name"
          content="InTalk AI Call Center Dashboard"
        />
      </Head>
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
            </header>
            {/* <CallDataProvider> */}
            <Component {...pageProps} />
            {/* </CallDataProvider> */}
            <Toaster />
          </SidebarInset>
        </SidebarProvider>
      ) : (
        <div>
          {/* <SimpleHeader /> */}
          {/* <CallDataProvider> */}
          <Component {...pageProps} />
          {/* </CallDataProvider> */}
        </div>
      )}
    </>
  );
}
