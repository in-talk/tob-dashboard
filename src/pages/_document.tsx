import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="title" content="InTalk AI Agent Call Center Dashboard - Smart Customer Service Management" />
        <meta name="description" content="Advanced AI-powered call center dashboard for managing customer service operations. Monitor agent performance, track call metrics, and optimize customer interactions with intelligent analytics and real-time insights." />
        <meta name="keywords" content="AI call center, customer service dashboard, call center analytics, agent performance, customer support, artificial intelligence, call monitoring, service metrics, contact center management" />
        <meta name="robots" content="index, follow" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="language" content="English" />
        <meta name="author" content="Your Company Name" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.intalk.ai/" />
        <meta property="og:title" content="AI Agent Call Center Dashboard - Smart Customer Service Management" />
        <meta property="og:description" content="Advanced AI-powered call center dashboard for managing customer service operations. Monitor agent performance, track call metrics, and optimize customer interactions with intelligent analytics." />


        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://www.intalk.ai/" />
        <meta property="twitter:title" content="AI Agent Call Center Dashboard - Smart Customer Service Management" />
        <meta property="twitter:description" content="Advanced AI-powered call center dashboard for managing customer service operations. Monitor agent performance and optimize customer interactions." />

        <meta name="theme-color" content="#ffffff" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="application-name" content="InTalk AI Call Center Dashboard" />
        
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

       
      </Head>
      <body className="antialiased bg-white dark:bg-sidebar">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}