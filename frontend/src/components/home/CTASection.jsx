import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * CTASection Component
 * Final call-to-action section to drive sign-ups
 * @returns {JSX.Element}
 */
const CTASection = () => {
  return (
    <section className="bg-gradient-to-r from-blue-500 to-blue-600 py-20">
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-white mb-6">
          Ready to Transform Your Events?
        </h2>
        <p className="text-xl text-blue-100 mb-8">
          Join thousands of event organizers already using AI Conversational
        </p>
        <RouterLink
          to="/signup"
          className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition duration-200 transform hover:scale-105"
        >
          Get Started Free Today
          <ArrowRight className="ml-2 w-5 h-5" />
        </RouterLink>
      </div>
    </section>
  );
};

export default CTASection;
