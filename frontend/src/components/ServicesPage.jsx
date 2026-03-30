import React from 'react';
import { MessageSquare, Calendar, BarChart3, Zap, Shield, Globe } from 'lucide-react';

/**
 * ServicesPage Component
 * Comprehensive overview of AI Conversational services
 * @returns {JSX.Element}
 */
const ServicesPage = () => {
  const services = [
    {
      icon: MessageSquare,
      title: 'Conversational Registration',
      description:
        'AI-powered registration flows that engage participants naturally and increase completion rates by 40%.',
      features: ['Natural Language Processing', 'Smart Form Validation', 'Real-time Feedback'],
    },
    {
      icon: Calendar,
      title: 'Event Management',
      description:
        'Complete lifecycle management from planning to execution with real-time coordination.',
      features: ['Schedule Management', 'Attendee Tracking', 'Budget Control'],
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reporting',
      description:
        'Comprehensive analytics dashboards providing actionable insights for better decisions.',
      features: ['Real-time Metrics', 'Custom Reports', 'Predictive Analytics'],
    },
    {
      icon: Zap,
      title: 'Automation',
      description: 'Automate repetitive tasks and workflows to save time and reduce errors.',
      features: ['Email Notifications', 'Workflow Automation', 'Smart Scheduling'],
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level security with encryption, compliance, and secure data storage.',
      features: ['Data Encryption', 'GDPR Compliant', 'Regular Audits'],
    },
    {
      icon: Globe,
      title: 'Global Integration',
      description:
        'Seamless integration with popular platforms and third-party applications.',
      features: ['API Access', 'Webhooks', 'Third-party Integrations'],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Our Services</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive solutions for modern event management
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="p-8 bg-gray-50 rounded-xl hover:shadow-lg transition duration-300"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-6">
                  <service.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  {service.title}
                </h3>
                <p className="text-gray-600 mb-6">{service.description}</p>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Key Features:</p>
                  <ul className="space-y-2">
                    {service.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-center text-gray-600 text-sm">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-500 to-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Transform your event management experience with AI Conversational today.
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition duration-200">
            Request a Demo
          </button>
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
