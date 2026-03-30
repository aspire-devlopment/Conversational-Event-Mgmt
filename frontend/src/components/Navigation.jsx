import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Menu, X, Zap } from 'lucide-react';

/**
 * Navigation Component
 * Main header with logo, menu, and authentication links
 * Responsive design with mobile menu toggle
 * @returns {JSX.Element}
 */
const Navigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /**
   * Toggle mobile menu visibility
   */
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  /**
   * Close mobile menu when a link is clicked
   */
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <RouterLink
              to="/"
              className="text-xl font-bold text-gray-900 hover:text-blue-600 transition"
            >
              AI Conversational
            </RouterLink>
          </div>

          {/* Desktop Navigation Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <RouterLink
              to="/"
              className="text-gray-700 hover:text-blue-600 font-medium transition duration-200"
            >
              Home
            </RouterLink>
          </div>

          {/* Auth Buttons - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <RouterLink
              to="/login"
              className="px-6 py-2 text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 font-semibold transition duration-200"
            >
              Login
            </RouterLink>
            <RouterLink
              to="/signup"
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-semibold transition duration-200"
            >
              Sign Up
            </RouterLink>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-600 hover:text-blue-600 transition"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-200">
            <div className="space-y-2 pt-4">
              <RouterLink
                to="/"
                onClick={closeMobileMenu}
                className="block px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition"
              >
                Home
              </RouterLink>
            </div>

            {/* Mobile Auth Buttons */}
            <div className="pt-4 space-y-2 border-t border-gray-200 mt-4">
              <RouterLink
                to="/login"
                onClick={closeMobileMenu}
                className="block px-4 py-2 text-center text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 font-semibold transition"
              >
                Login
              </RouterLink>
              <RouterLink
                to="/signup"
                onClick={closeMobileMenu}
                className="block px-4 py-2 text-center bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-semibold transition"
              >
                Sign Up
              </RouterLink>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
