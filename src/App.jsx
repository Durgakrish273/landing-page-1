import Nav from "./components/Nav.jsx";
import Hero from "./components/Hero.jsx";
import Scanner from "./components/Scanner.jsx";
import HowItWorks from "./components/HowItWorks.jsx";
import Features from "./components/Features.jsx";
import Footer from "./components/Footer.jsx";

export default function App() {
  return (
    <>
      <Nav />
      <main id="top">
        <Hero />
        <Scanner />
        <HowItWorks />
        <Features />
      </main>
      <Footer />
    </>
  );
}
