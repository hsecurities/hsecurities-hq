import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>hSECURITIES HQ — Virtual Cyber Campus</title>
        <meta name="description" content="Self-hosted virtual cyber school and headquarters for hSECURITIES. Strategy. Security. Solutions." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/icons/favicon-32x32.svg" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
