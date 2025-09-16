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
import Head from "next/head";
import { appPageData } from "@/constants";
import ThemeToggler from "@/components/ThemeToggler";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
  router,
}: AppProps) {
  return (
    <SessionProvider
      session={session}
      refetchOnWindowFocus={false}
      refetchInterval={0}
    >
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
  const { seoMetaData } = appPageData;

  return (
    <>
      <Head>
        <meta name="title" content={seoMetaData.title} />
        <meta name="description" content={seoMetaData.description} />
        <meta name="keywords" content={seoMetaData.keywords} />
        <meta name="robots" content={seoMetaData.robots} />
        <meta httpEquiv="Content-Type" content={seoMetaData.contentType} />
        <meta name="language" content={seoMetaData.language} />
        <meta name="author" content={seoMetaData.author} />
        <meta name="viewport" content={seoMetaData.viewport} />

        <meta property="og:type" content={seoMetaData.og.type} />
        <meta property="og:url" content={seoMetaData.og.url} />
        <meta property="og:title" content={seoMetaData.og.title} />
        <meta property="og:description" content={seoMetaData.og.description} />

        <meta property="twitter:card" content={seoMetaData.twitter.card} />
        <meta property="twitter:url" content={seoMetaData.twitter.url} />
        <meta property="twitter:title" content={seoMetaData.twitter.title} />
        <meta
          property="twitter:description"
          content={seoMetaData.twitter.description}
        />

        <meta name="theme-color" content={seoMetaData.themeColor} />
        <meta
          name="msapplication-TileColor"
          content={seoMetaData.msTileColor}
        />
        <meta name="application-name" content={seoMetaData.appName} />

        <title>{seoMetaData.title}</title>
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
                        {appPageData.breadcrumb.first}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {" "}
                        {appPageData.breadcrumb.current}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <ThemeToggler />
            </header>
            <Component {...pageProps} />
            <Toaster />
          </SidebarInset>
        </SidebarProvider>
      ) : (
        <div>
          <Component {...pageProps} />
        </div>
      )}
    </>
  );
}
