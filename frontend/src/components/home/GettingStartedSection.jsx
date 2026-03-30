import React from 'react';

/**
 * StepCard Component
 * Reusable card for displaying getting started steps
 */
const StepCard = ({ step, title, description }) => (
  <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-lg transition duration-300">
    <div className="flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full text-3xl font-bold mb-6">
      {step}
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

/**
 * GettingStartedSection Component
 * Simple A, B, C getting started steps
 * @returns {JSX.Element}
 */
const GettingStartedSection = () => {
  const steps = [
    {
      step: 'A',
      title: 'Create Your Account',
      description: 'Sign up and set up your event management profile in seconds.',
    },
    {
      step: 'B',
      title: 'Configure Your Event',
      description:
        'Customize registration forms, set event details, and configure AI interactions.',
    },
    {
      step: 'C',
      title: 'Launch & Engage',
      description:
        'Deploy your event and watch participants register with conversational AI.',
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Get Started in 3 Simple Steps
          </h2>
          <p className="text-xl text-gray-600">
            Launch your first event in minutes
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((item, index) => (
            <StepCard key={index} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default GettingStartedSection;
