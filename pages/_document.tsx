import Document, { Head, Html, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <meta
            name="description"
            content="Discover the ultimate solution to streamline your work process! Our AI-powered chat app allows you to easily query data online, saving you time and effort. With our user-friendly interface, you can efficiently manage your workload and increase productivity. Say goodbye to manual data entry and hello to smarter, faster results with our cutting-edge technology. Try it now and experience the power of AI chat!"
          />
          <meta property="og:site_name" content="webinfra.cloud" />
          <meta
            property="og:description"
            content="Discover the ultimate solution to streamline your work process! Our AI-powered chat app allows you to easily query data online, saving you time and effort. With our user-friendly interface, you can efficiently manage your workload and increase productivity. Say goodbye to manual data entry and hello to smarter, faster results with our cutting-edge technology. Try it now and experience the power of AI chat!"
          />
          <meta property="og:title" content="Boost Your Work Efficiency with the Power of AI" />
          <meta name="twitter:title" content="Boost Your Work Efficiency with the Power of AI" />
          <meta
            name="twitter:description"
            content="Discover the ultimate solution to streamline your work process! Our AI-powered chat app allows you to easily query data online, saving you time and effort. With our user-friendly interface, you can efficiently manage your workload and increase productivity. Say goodbye to manual data entry and hello to smarter, faster results with our cutting-edge technology. Try it now and experience the power of AI chat!"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
