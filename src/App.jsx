import Navbar from './components/Navbar';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import DualCreation from './components/DualCreation';
import TrendingGames from './components/TrendingGames';
import RemixExplainer from './components/RemixExplainer';
import CTASection from './components/CTASection';
import Footer from './components/Footer';
import FloatingParticles from './components/FloatingParticles';

export default function App() {
  return (
    <div className="scanlines relative min-h-screen">
      <FloatingParticles />
      <Navbar />
      <main className="relative z-10 pixel-grid">
        <Hero />
        <HowItWorks />
        <DualCreation />
        <TrendingGames />
        <RemixExplainer />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
