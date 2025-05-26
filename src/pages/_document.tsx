import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body className="antialiased bg-white dark:bg-sidebar">
        <Main />

        <NextScript />
      </body>
    </Html>
  );
}
