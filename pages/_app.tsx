import { Analytics } from "@vercel/analytics/react";
import type { AppProps } from "next/app";
import Script from 'next/script'
import "../styles/globals.css";


function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3614870144525266" crossOrigin="anonymous"></Script>
      <Script src="https://unpkg.com/vconsole@latest/dist/vconsole.min.js"
        strategy="lazyOnload"
        onLoad={() => {
          if (typeof window !== 'undefined') {
            console.log('Script has loaded');
            setTimeout(() => {
              new (window as any).VConsole();
            }, 300)
          }
        }}
      />
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}

export default MyApp;
