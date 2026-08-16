import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

import Hero from './components/Hero';
import TrustSection from './components/TrustSection';
import WhyCraly from './components/WhyCraly';
import HowItWorks from './components/HowItWorks';
import BuiltFor from './components/BuiltFor';
import FAQ from './components/FAQ';
import Foot from "./components/Foot";

function App() {
  return (
    <div className="App">
      <Hero />
      <TrustSection />
      <WhyCraly />
      <HowItWorks />
      <BuiltFor />
      <FAQ />
      <Foot />
    </div>
  );
}

export default App;
