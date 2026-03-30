import React from 'react';
import { CheckCircle } from 'lucide-react';

/**
 * BenefitsSection Component
 * Displays key benefits and success metrics
 * @returns {JSX.Element}
 */
const BenefitsSection = () => {
  const benefits = [
    'Increase registration completion by up to 40%',
    'Reduce event planning time by 60%',
    'Improve participant satisfaction scores',
    'Automate repetitive tasks and workflows',
    'Access data-driven insights for better decisions',
    'Scale your events without increasing overhead',
  ];

  const metrics = [
    { label: 'Registration Rate', value: 92 },
    { label: 'User Engagement', value: 88 },
    { label: 'Event Success Rate', value: 95 },
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Benefits List */}
          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-gray-900 mb-8">
              Why Choose AI Conversational?
            </h2>

            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <p className="text-lg text-gray-700">{benefit}</p>
              </div>
            ))}
          </div>

          {/* Success Metrics */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 text-white">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">Success Metrics</h3>
              <div className="space-y-3">
                {metrics.map((metric, index) => (
                  <div key={index} className="bg-blue-400 bg-opacity-30 rounded-lg p-4">
                    <p className="text-sm mb-2">{metric.label}</p>
                    <div className="w-full bg-blue-300 rounded-full h-2">
                      <div
                        className="bg-white h-2 rounded-full"
                        style={{ width: `${metric.value}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
