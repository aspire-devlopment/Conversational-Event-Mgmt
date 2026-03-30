import React from 'react';
import HeroSection from './home/HeroSection';
import FeaturesSection from './home/FeaturesSection';
import BenefitsSection from './home/BenefitsSection';
import GettingStartedSection from './home/GettingStartedSection';
import CTASection from './home/CTASection';

/**
 * HomePage Component
 * Landing page showcasing AI Conversational event management features
 * Includes hero section, features, benefits, and getting started steps
 * Composed of decoupled sub-components for better maintainability
 * @returns {JSX.Element}
 */
const HomePage = () => {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <FeaturesSection />
      <BenefitsSection />
      <GettingStartedSection />
      <CTASection />
    </div>
  );
};

export default HomePage;
