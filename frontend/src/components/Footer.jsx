import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Zap, Mail, MapPin, Phone } from 'lucide-react';

/**
 * Footer Component
 * Complete footer with company info, quick links, social media, and contact
 * Responsive design for mobile and desktop
 * @returns {JSX.Element}
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">AI Conversational</h3>
            </div>
            <p className="text-sm leading-relaxed">
              Revolutionizing event management with AI-powered conversational
              solutions for seamless registration and participant engagement.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <RouterLink
                  to="/"
                  className="hover:text-blue-400 transition duration-200"
                >
                  Home
                </RouterLink>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <RouterLink
                  to="/"
                  className="hover:text-blue-400 transition duration-200"
                >
                  Documentation
                </RouterLink>
              </li>
              <li>
                <RouterLink
                  to="/"
                  className="hover:text-blue-400 transition duration-200"
                >
                  Blog
                </RouterLink>
              </li>
              <li>
                <RouterLink
                  to="/contact"
                  className="hover:text-blue-400 transition duration-200"
                >
                  FAQ
                </RouterLink>
              </li>
              <li>
                <RouterLink
                  to="/"
                  className="hover:text-blue-400 transition duration-200"
                >
                  API Reference
                </RouterLink>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2">
                <Mail className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <a
                  href="mailto:info@aiconversational.com"
                  className="hover:text-blue-400 transition duration-200"
                >
                  info@aiconversational.com
                </a>
              </li>
              <li className="flex items-start space-x-2">
                <Phone className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <a
                  href="tel:+1234567890"
                  className="hover:text-blue-400 transition duration-200"
                >
                  +1 (234) 567-890
                </a>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <span>
                  123 Innovation Street
                  <br />
                  Tech City, TC 12345
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 my-8"></div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Copyright */}
          <p className="text-sm">
            &copy; {currentYear} AI Conversational. All rights reserved.
          </p>

          {/* Legal Links */}
          <div className="flex space-x-6 text-sm">
            <RouterLink
              to="/privacy"
              className="hover:text-blue-400 transition duration-200"
            >
              Privacy Policy
            </RouterLink>
            <RouterLink
              to="/terms"
              className="hover:text-blue-400 transition duration-200"
            >
              Terms of Service
            </RouterLink>
            <RouterLink
              to="/privacy"
              className="hover:text-blue-400 transition duration-200"
            >
              Cookie Policy
            </RouterLink>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
