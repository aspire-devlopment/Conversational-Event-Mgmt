import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * HeroSection Component
 * Hero banner with headline, description, CTAs, and statistics
 * @returns {JSX.Element}
 */
const HeroSection = () => {
  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-blue-100 py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Hero Text */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight">
                Revolutionize Event Management with{' '}
                <span className="bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                  AI Conversational
                </span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Seamlessly manage events with intelligent conversational AI.
                Simplify registration, enhance engagement, and create memorable
                experiences.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <RouterLink
                to="/signup"
                className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition duration-200 transform hover:scale-105"
              >
                Get Started Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </RouterLink>
              <RouterLink
                to="/about"
                className="inline-flex items-center justify-center px-8 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition duration-200"
              >
                Learn More
              </RouterLink>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-gray-200">
              <div>
                <p className="text-3xl font-bold text-blue-600">500+</p>
                <p className="text-sm text-gray-600">Events Managed</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">50K+</p>
                <p className="text-sm text-gray-600">Participants</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">99%</p>
                <p className="text-sm text-gray-600">Satisfaction</p>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="hidden md:flex items-center justify-center">
            <div className="relative w-full h-96">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl opacity-20 transform rotate-3"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-blue-300 rounded-3xl opacity-30 transform -rotate-3"></div>
              <div className="relative h-full flex items-center justify-center">
                <div className="text-8xl">🤖</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
