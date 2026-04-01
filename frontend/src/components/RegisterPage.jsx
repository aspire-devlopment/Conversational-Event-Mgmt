import React, { useCallback } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Phone, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm, useToggle } from '../hooks/useForm';
import { validators, validateForm, hasErrors } from '../utils/validation';
import { authAPI } from '../services/api';
import {
  FormInput,
  FormSelect,
  Button,
  Card,
  ErrorAlert,
  Divider,
  Link,
} from './common/FormComponents';
import { AuthLayout, FormWrapper } from './layouts/AuthLayout';

/**
 * RegisterPage Component
 * Professional registration page with comprehensive validation
 * Simple form with First Name, Last Name, Email, Password, and Contact Number
 * @returns {JSX.Element}
 */
const RegisterPage = () => {
  const navigate = useNavigate();
  const { isOpen: showPassword, toggle: togglePasswordVisibility } =
    useToggle(false);
  const [generalError, setGeneralError] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');

  /**
   * Extended validators for registration form
   */
  const extendedValidators = {
    ...validators,
    firstName: (value) => {
      if (!value) return 'First name is required';
      if (value.length < 2) return 'First name must be at least 2 characters';
      if (!/^[a-zA-Z\s]+$/.test(value)) {
        return 'First name can only contain letters';
      }
      return '';
    },
    lastName: (value) => {
      if (!value) return 'Last name is required';
      if (value.length < 2) return 'Last name must be at least 2 characters';
      if (!/^[a-zA-Z\s]+$/.test(value)) {
        return 'Last name can only contain letters';
      }
      return '';
    },
    phone: (value) => {
      if (!value) return 'Contact number is required';
      if (!/^[\d\s\-+()]{10,}$/.test(value)) {
        return 'Please enter a valid contact number';
      }
      return '';
    },
    role: (value) => {
      if (!value) return 'Please select a role';
      return '';
    },
  };

  /**
   * Memoized validation rules for registration form
   */
  const validationRules = {
    firstName: extendedValidators.firstName,
    lastName: extendedValidators.lastName,
    email: extendedValidators.email,
    phone: extendedValidators.phone,
    role: extendedValidators.role,
    password: extendedValidators.password,
  };

  /**
   * Initialize form hook with registration fields
   */
  const {
    values,
    errors,
    touched,
    isLoading,
    handleChange,
    handleBlur,
    handleSubmit: handleFormSubmit,
    resetForm,
    setErrors,
  } = useForm(
    {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: '',
      password: '',
    },
    handleSubmitForm
  );

  /**
   * Handle form submisscalls backend API
   * @param {Object} formValues - Form values
   * @param {Object} helpers - Helper functions
   */
  async function handleSubmitForm(formValues, helpers) {
    setGeneralError('');
    setSuccessMessage('');

    // Validate form
    const validationErrors = validateForm(formValues, validationRules);

    if (hasErrors(validationErrors)) {
      helpers.setErrors(validationErrors);
      helpers.setIsLoading(false);
      return;
    }

    try {
      // Call backend API with normalized email (lowercase)
      const response = await authAPI.register(
        formValues.firstName,
        formValues.lastName,
        formValues.email.toLowerCase().trim(), // Normalize email
        formValues.phone,
        formValues.password,
        formValues.role
      );

      // Success handling
      console.log('Registration successful:', response.data);

      setSuccessMessage(
        '✅ Registration successful! Redirecting to login...'
      );
      resetForm();

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      setGeneralError(
        error?.message ||
          'An error occurred during registration. Please try again.'
      );
      console.error('Registration error:', error);
    } finally {
      helpers.setIsLoading(false);
    }
  }

  /**
   * Handle form submission with validation
   */
  const handleSubmit = useCallback(
    (e) => {
      const validationErrors = validateForm(values, validationRules);
      setErrors(validationErrors);

      if (!hasErrors(validationErrors)) {
        handleFormSubmit(e);
      } else {
        e.preventDefault();
      }
    },
    [values, validationRules, handleFormSubmit, setErrors]
  );

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join AI Conversational for event management excellence"
    >
      <Card>
        {/* Error Alert */}
        <ErrorAlert message={generalError} onClose={() => setGeneralError('')} />

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 text-sm font-medium">{successMessage}</p>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit}>
          <FormWrapper>
            {/* First Name Input */}
            <FormInput
              label="First Name"
              name="firstName"
              type="text"
              placeholder="John"
              icon={User}
              autoComplete="given-name"
              value={values.firstName}
              error={errors.firstName}
              touched={touched.firstName}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
            />

            {/* Last Name Input */}
            <FormInput
              label="Last Name"
              name="lastName"
              type="text"
              placeholder="Doe"
              icon={User}
              autoComplete="family-name"
              value={values.lastName}
              error={errors.lastName}
              touched={touched.lastName}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
            />

            {/* Email Input */}
            <FormInput
              label="Email Address"
              name="email"
              type="email"
              placeholder="your@email.com"
              icon={Mail}
              autoComplete="email"
              value={values.email}
              error={errors.email}
              touched={touched.email}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
            />

            {/* Contact Number Input */}
            <FormInput
              label="Contact Number"
              name="phone"
              type="tel"
              placeholder="+1 (123) 456-7890"
              icon={Phone}
              autoComplete="tel"
              value={values.phone}
              error={errors.phone}
              touched={touched.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
            />

            {/* Role Selection */}
            <FormSelect
              label="Select Role"
              name="role"
              options={[
                { value: 'Manager', label: 'Manager' },
                { value: 'Sales Rep', label: 'Sales Representative' },
                { value: 'Viewer', label: 'Viewer' },
              ]}
              placeholder="Choose your role"
              icon={Shield}
              value={values.role}
              error={errors.role}
              touched={touched.role}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
            />

            {/* Password Input */}
            <FormInput
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              icon={Lock}
              rightIcon={showPassword ? EyeOff : Eye}
              onRightIconClick={togglePasswordVisibility}
              autoComplete="new-password"
              value={values.password}
              error={errors.password}
              touched={touched.password}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              loading={isLoading}
              disabled={isLoading || hasErrors(errors)}
            >
              Create Account
            </Button>
          </FormWrapper>
        </form>

        {/* Divider */}
        <Divider text="Already have an account?" />

        {/* Login Link */}
        <p className="text-center text-gray-600 text-sm">
          Sign in to your existing account{' '}
          <Link href="/login">Login here</Link>
        </p>
      </Card>
    </AuthLayout>
  );
};

export default RegisterPage;
