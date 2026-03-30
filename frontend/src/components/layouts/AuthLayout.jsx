import React from 'react';

/**
 * AuthLayout - Layout component for authentication pages
 * Provides consistent structure and background for login/signup pages
 * @param {Object} props - Component props
 * @returns {JSX.Element}
 */
export const AuthLayout = ({
  children,
  title,
  subtitle,
  icon: Icon,
  maxWidth = 'max-w-md',
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      {/* Main content */}
      <div className={`w-full ${maxWidth} relative z-10`}>
        {/* Header Section */}
        {(title || Icon) && (
          <div className="text-center mb-8">
            {Icon && (
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            )}
            {title && (
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-base text-gray-500 leading-relaxed">{subtitle}</p>
            )}
          </div>
        )}

        {/* Content */}
        {children}
      </div>
    </div>
  );
};

/**
 * FormWrapper - Wrapper for form sections
 * @param {Object} props - Component props
 * @returns {JSX.Element}
 */
export const FormWrapper = ({ children, className = '' }) => {
  return <div className={`space-y-5 ${className}`}>{children}</div>;
};

/**
 * FormFooter - Footer section for auth forms
 * @param {Object} props - Component props
 * @returns {JSX.Element}
 */
export const FormFooter = ({
  dividerText,
  mainText,
  linkText,
  linkHref = '#',
  termsText,
  privacyText,
}) => {
  return (
    <>
      {dividerText && (
        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-3 text-sm text-gray-500">{dividerText}</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>
      )}

      {mainText && (
        <p className="text-center text-gray-600 text-sm">
          {mainText}{' '}
          <a
            href={linkHref}
            className="text-blue-600 font-semibold hover:text-blue-700 transition"
          >
            {linkText}
          </a>
        </p>
      )}

      {(termsText || privacyText) && (
        <p className="mt-6 text-center text-xs text-gray-500">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-blue-600 hover:text-blue-700 transition">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-blue-600 hover:text-blue-700 transition">
            Privacy Policy
          </a>
        </p>
      )}
    </>
  );
};
