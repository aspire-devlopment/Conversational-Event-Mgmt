import React from 'react';
import { Zap, Target, Heart, Users } from 'lucide-react';

/**
 * AboutPage Component
 * Information about AI Conversational company and mission
 * @returns {JSX.Element}
 */
const AboutPage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">About AI Conversational</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're on a mission to revolutionize event management through intelligent
            conversational AI technology.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-600 text-lg leading-relaxed">
                <p>
                  AI Conversational was founded in 2023 by a team of passionate
                  engineers and event professionals who recognized a gap in the
                  market: event management was still tedious and time-consuming.
                </p>
                <p>
                  We started with a simple mission: leverage cutting-edge AI technology
                  to make event management intuitive, engaging, and delightful for both
                  organizers and participants.
                </p>
                <p>
                  Today, we serve hundreds of event organizers worldwide, helping them
                  create memorable experiences while saving time and resources.
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-8 text-white">
              <div className="text-6xl mb-4">📈</div>
              <h3 className="text-2xl font-bold mb-4">Our Growth</h3>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <span className="mr-3">✓</span>
                  Founded 2023
                </li>
                <li className="flex items-center">
                  <span className="mr-3">✓</span>
                  500+ Events Managed
                </li>
                <li className="flex items-center">
                  <span className="mr-3">✓</span>
                  50K+ Participants
                </li>
                <li className="flex items-center">
                  <span className="mr-3">✓</span>
                  99% Satisfaction Rate
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-16">
            Our Core Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: Target, title: 'Innovation', description: 'We constantly push the boundaries of what\'s possible with AI' },
              { icon: Heart, title: 'Customer Focus', description: 'Your success is our success' },
              { icon: Zap, title: 'Excellence', description: 'We deliver nothing but the best' },
              { icon: Users, title: 'Community', description: 'We build products for people, by people' },
            ].map((value, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-16">
            Meet Our Team
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Team Member A', role: 'Founder & CEO', avatar: '👩‍💼' },
              { name: 'Team Member B', role: 'CTO & Co-founder', avatar: '👨‍💼' },
              { name: 'Team Member C', role: 'VP Product', avatar: '👩‍💼' },
            ].map((member, index) => (
              <div key={index} className="text-center">
                <div className="text-6xl mb-4">{member.avatar}</div>
                <h3 className="text-xl font-semibold text-gray-900">{member.name}</h3>
                <p className="text-gray-600">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
