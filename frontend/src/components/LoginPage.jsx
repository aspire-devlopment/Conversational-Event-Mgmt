import React, { useCallback, useMemo } from 'react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm, useToggle } from '../hooks/useForm';
import { validators, validateForm, hasErrors } from '../utils/validation';
import { APP_ROUTES } from '../constants/appConstants';
import { useAuth } from '../context/AuthContext';
import {
  FormInput,
  FormCheckbox,
  Button,
  Card,
  ErrorAlert,
  Divider,
  Link,
} from './common/FormComponents';
import { AuthLayout, FormWrapper } from './layouts/AuthLayout';

/**
 * LoginPage Component
 * Professional login page with form validation, reusable components, and custom hooks
 * @returns {JSX.Element}
 */
const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isOpen: showPassword, toggle: togglePasswordVisibility } =
    useToggle(false);
  const [generalError, setGeneralError] = React.useState('');

  // Form validation rules
  const validationRules = useMemo(
    () => ({
      email: validators.email,
      password: validators.password,
    }),
    []
  );

  // Initialize form hook
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
    setTouched,
  } = useForm(
    { email: '', password: '', rememberMe: false },
    handleSubmitForm
  );

  /**
   * Handle form submisscalls backend API
   * @param {Object} formValues - Form values
   * @param {Object} helpers - Helper functions (setErrors, setIsLoading)
   */
  async function handleSubmitForm(formValues, helpers) {
    setGeneralError('');

    // Validate form
    const validationErrors = validateForm(formValues, validationRules);

    if (hasErrors(validationErrors)) {
      helpers.setErrors(validationErrors);
      helpers.setIsLoading(false);
      return;
    }

    try {
      // Use the shared auth context so the whole app sees the logged-in user immediately.
      const response = await login(
        formValues.email.toLowerCase().trim(), // Normalize email
        formValues.password
      );

      // Success handling
      console.log('Login successful:', response.data.user);

      // Reset form and redirect
      resetForm();
      
      // Redirect to home page after successful login
      setTimeout(() => {
        navigate(APP_ROUTES.ADMIN_EVENTS, { replace: true });
      }, 500);
    } catch (error) {
      setGeneralError(
        error?.message || 'An error occurred during login. Please try again.'
      );
      console.error('Login error:', error);
    } finally {
      helpers.setIsLoading(false);
    }
  }

  // Handle form submission with validation
  const handleSubmit = useCallback(
    (e) => {
      // Validate all fields before submission
      const validationErrors = validateForm(values, validationRules);
      setErrors(validationErrors);

      if (!hasErrors(validationErrors)) {
        handleFormSubmit(e);
      } else {
        setTouched({
          email: true,
          password: true,
        });
        e.preventDefault();
      }
    },
    [values, validationRules, handleFormSubmit, setErrors, setTouched]
  );

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your account to continue"
      icon={Lock}
    >
      <Card>
        {/* Error Alert */}
        <ErrorAlert message={generalError} onClose={() => setGeneralError('')} />

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <FormWrapper>
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

            {/* Password Input */}
            <FormInput
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              icon={Lock}
              rightIcon={showPassword ? EyeOff : Eye}
              onRightIconClick={togglePasswordVisibility}
              autoComplete="current-password"
              value={values.password}
              error={errors.password}
              touched={touched.password}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
            />

            {/* Remember Me & account recovery note */}
            <div className="flex items-center justify-between pt-2">
              <FormCheckbox
                name="rememberMe"
                label="Remember me"
                value={values.rememberMe}
                onChange={handleChange}
                disabled={isLoading}
              />
              <span className="text-sm text-gray-500">
                Contact an admin to reset your password
              </span>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              loading={isLoading}
              disabled={isLoading || hasErrors(errors)}
            >
              Sign In
            </Button>
          </FormWrapper>
        </form>

        {/* Divider */}
        <Divider text="New user?" />

        {/* Sign Up Link */}
        <p className="text-center text-gray-600 text-sm">
          Don't have an account?{' '}
          <Link href="/signup">Sign up here</Link>
        </p>

        {/* Terms & Privacy */}
        <p className="mt-6 text-center text-xs text-gray-500">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-xs">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-xs">
            Privacy Policy
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
};

export default LoginPage;
