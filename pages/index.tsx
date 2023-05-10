import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { useRef, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import DropDown, { VibeType } from "../components/DropDown";
import Footer from "../components/Footer";
import Github from "../components/GitHub";
import Header from "../components/Header";
import Chat from '../components/Chat';
import LoadingDots from "../components/LoadingDots";

const Home: NextPage = () => {
  return (
    <div className="page-container">
      <Head>
        <title>Boost Your Work Efficiency with the Power of AI</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* <Header /> */}
      <Chat />
      {/* <Footer /> */}
    </div>
  );
};

export default Home;
