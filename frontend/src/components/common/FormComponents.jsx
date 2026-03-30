import React from 'react';

/**
 * FormInput component - Reusable input field with icon and validation
 * @param {Object} props - Component props
 * @returns {JSX.Element}
 */
export const FormInput = ({
  label,
  name,
  type = 'text',
  placeholder,
  icon: Icon,
  rightIcon: RightIcon,
  onRightIconClick,
  error,
  touched,
  value,
  onChange,
  onBlur,
  disabled = false,
  autoComplete,
}) => {
  const hasError = error && touched;

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`
            w-full px-4 py-2.5 border rounded-lg
            focus:outline-none focus:ring-2 transition duration-200
            ${Icon ? 'pl-10' : ''}
            ${RightIcon ? 'pr-10' : ''}
            ${
              hasError
                ? 'border-red-300 focus:ring-red-500 focus:border-transparent'
                : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
            }
            ${disabled ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''}
          `}
        />
        {RightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition disabled:cursor-not-allowed"
            disabled={disabled}
            aria-label="Toggle visibility"
          >
            <RightIcon className="w-5 h-5" />
          </button>
        )}
      </div>
      {hasError && (
        <p className="text-sm text-red-500 mt-1 flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * FormSelect component - Reusable select field with icon and validation
 * @param {Object} props - Component props
 * @returns {JSX.Element}
 */
export const FormSelect = ({
  label,
  name,
  options = [],
  placeholder,
  icon: Icon,
  error,
  touched,
  value,
  onChange,
  onBlur,
  disabled = false,
}) => {
  const hasError = error && touched;

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none z-10" />
        )}
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={`
            w-full px-4 py-2.5 border rounded-lg
            focus:outline-none focus:ring-2 transition duration-200
            ${Icon ? 'pl-10' : ''}
            ${
              hasError
                ? 'border-red-300 focus:ring-red-500 focus:border-transparent'
                : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
            }
            ${disabled ? 'bg-gray-50 cursor-not-allowed opacity-60' : 'bg-white'}
            appearance-none
          `}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
      {hasError && (
        <p className="text-sm text-red-500 mt-1 flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * FormCheckbox component - Reusable checkbox field
 * @param {Object} props - Component props
 * @returns {JSX.Element}
 */
export const FormCheckbox = ({
  name,
  label,
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <label className="flex items-center cursor-pointer group">
      <input
        type="checkbox"
        name={name}
        checked={value}
        onChange={onChange}
        disabled={disabled}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-700 transition group-disabled:opacity-50">
        {label}
      </span>
    </label>
  );
};

/**
 * Button component - Reusable button with loading state
 * @param {Object} props - Component props
 * @returns {JSX.Element}
 */
export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  className = '',
}) => {
  const baseStyles =
    'font-semibold rounded-lg transition duration-200 transform focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100';

  const variants = {
    primary:
      'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white focus:ring-blue-500',
    secondary:
      'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500',
    outline:
      'bg-transparent border-2 border-blue-500 text-blue-500 hover:bg-blue-50 focus:ring-blue-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${widthClass}
        ${className}
        hover:scale-105
      `}
    >
      <div className="flex items-center justify-center">
        {loading && (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
        )}
        {children}
      </div>
    </button>
  );
};

/**
 * Card component - Reusable card container
 * @param {Object} props - Component props
 * @returns {JSX.Element}
 */
export const Card = ({
  children,
  className = '',
  shadow = 'xl',
  padding = '8',
}) => {
  const shadowMap = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };

  const paddingMap = {
    '4': 'p-4',
    '6': 'p-6',
    '8': 'p-8 sm:p-10',
    '10': 'p-10',
  };

  return (
    <div
      className={`
        bg-white rounded-2xl backdrop-blur-xl bg-opacity-95
        ${shadowMap[shadow]}
        ${paddingMap[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/**
 * ErrorAlert component - Reusable error message display
 * @param {Object} props - Component props
 * @returns {JSX.Element|null}
 */
export const ErrorAlert = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between">
      <div className="flex items-start">
        <svg
          className="w-5 h-5 text-red-600 mt-0.5 mr-3"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-red-600 text-sm font-medium">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-red-600 hover:text-red-700 ml-3"
          aria-label="Close alert"
        >
          ✕
        </button>
      )}
    </div>
  );
};

/**
 * Divider component - Reusable divider with text
 * @param {Object} props - Component props
 * @returns {JSX.Element}
 */
export const Divider = ({ text }) => {
  return (
    <div className="my-6 flex items-center">
      <div className="flex-1 border-t border-gray-300"></div>
      {text && <span className="px-3 text-sm text-gray-500">{text}</span>}
      <div className="flex-1 border-t border-gray-300"></div>
    </div>
  );
};

/**
 * Link component - Reusable link with consistent styling
 * @param {Object} props - Component props
 * @returns {JSX.Element}
 */
export const Link = ({ href = '#', children, className = '' }) => {
  return (
    <a
      href={href}
      className={`text-blue-600 font-semibold hover:text-blue-700 transition ${className}`}
    >
      {children}
    </a>
  );
};
