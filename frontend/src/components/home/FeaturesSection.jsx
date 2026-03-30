import React from 'react';
import {
  MessageSquare,
  Calendar,
  Users,
  Zap,
  CheckCircle,
} from 'lucide-react';

/**
 * FeatureCard Component
 * Reusable card for displaying individual features
 */
const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="p-8 bg-gray-50 rounded-xl hover:shadow-lg transition duration-300">
    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-blue-600" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

/**
 * FeaturesSection Component
 * Displays 6 key features in a grid layout
 * @returns {JSX.Element}
 */
const FeaturesSection = () => {
  const features = [
    {
      icon: MessageSquare,
      title: 'Conversational Registration',
      description:
        'Intuitive AI-powered registration process that engages participants naturally and increases completion rates.',
    },
    {
      icon: Calendar,
      title: 'Event Management',
      description:
        'Complete event lifecycle management from planning to execution with real-time analytics and insights.',
    },
    {
      icon: Users,
      title: 'Participant Engagement',
      description:
        'Keep participants engaged before, during, and after events with personalized AI interactions.',
    },
    {
      icon: Zap,
      title: 'Real-time Analytics',
      description:
        'Gain actionable insights with comprehensive analytics and reporting dashboards.',
    },
    {
      icon: CheckCircle,
      title: 'Enterprise Security',
      description:
        'Bank-level security with encrypted data, compliance with GDPR, and secure data storage.',
    },
    {
      icon: Zap,
      title: 'Easy Integration',
      description:
        'Seamless integration with popular event platforms and third-party applications.',
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Powerful Features for Event Excellence
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to manage events like a pro
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
