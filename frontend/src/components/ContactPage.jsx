import React, { useCallback, useMemo } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useForm } from '../hooks/useForm';
import { validators, validateForm, hasErrors } from '../utils/validation';
import { FormInput, Button, Card, ErrorAlert } from './common/FormComponents';

/**
 * ContactPage Component
 * Contact form and company contact information
 * Includes form validation and submission handling
 * @returns {JSX.Element}
 */
const ContactPage = () => {
  const [generalError, setGeneralError] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');

  /**
   * Memoized validation rules for contact form
   */
  const validationRules = useMemo(
    () => ({
      name: (value) => {
        if (!value) return 'Name is required';
        if (value.length < 3) return 'Name must be at least 3 characters';
        return '';
      },
      email: validators.email,
      subject: (value) => {
        if (!value) return 'Subject is required';
        if (value.length < 5) return 'Subject must be at least 5 characters';
        return '';
      },
      message: (value) => {
        if (!value) return 'Message is required';
        if (value.length < 10) return 'Message must be at least 10 characters';
        if (value.length > 1000) return 'Message must not exceed 1000 characters';
        return '';
      },
    }),
    []
  );

  /**
   * Initialize form hook
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
    { name: '', email: '', subject: '', message: '' },
    handleSubmitForm
  );

  /**
   * Handle form submission
   * Validates and sends contact message
   * @param {Object} formValues - Form values
   * @param {Object} helpers - Helper functions
   */
  async function handleSubmitForm(formValues, helpers) {
    setGeneralError('');
    setSuccessMessage('');

    const validationErrors = validateForm(formValues, validationRules);

    if (hasErrors(validationErrors)) {
      helpers.setErrors(validationErrors);
      helpers.setIsLoading(false);
      return;
    }

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log('Contact message:', formValues);

      setSuccessMessage(
        '✅ Thank you for reaching out! We will get back to you soon.'
      );
      resetForm();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      setGeneralError('Failed to send message. Please try again.');
      console.error('Contact error:', error);
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
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Get in Touch</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Have questions? We'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact Information */}
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-gray-900">Contact Information</h2>

              {/* Email */}
              <div className="flex space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                  <a
                    href="mailto:info@aiconversational.com"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    info@aiconversational.com
                  </a>
                  <a
                    href="mailto:support@aiconversational.com"
                    className="block text-blue-600 hover:text-blue-700"
                  >
                    support@aiconversational.com
                  </a>
                </div>
              </div>

              {/* Phone */}
              <div className="flex space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                  <a
                    href="tel:+1555000123"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    +1 (555) 000-123
                  </a>
                  <p className="text-gray-600 text-sm">Mon - Fri, 9am - 6pm EST</p>
                </div>
              </div>

              {/* Address */}
              <div className="flex space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Office</h3>
                  <p className="text-gray-600">
                    123 Innovation Street
                    <br />
                    Tech City, TC 12345
                    <br />
                    United States
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Send us a Message</h2>

                {/* Error Alert */}
                <ErrorAlert
                  message={generalError}
                  onClose={() => setGeneralError('')}
                />

                {/* Success Message */}
                {successMessage && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-600 text-sm font-medium">{successMessage}</p>
                  </div>
                )}

                {/* Contact Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name Input */}
                  <FormInput
                    label="Full Name"
                    name="name"
                    type="text"
                    placeholder="Your Name"
                    value={values.name}
                    error={errors.name}
                    touched={touched.name}
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
                    value={values.email}
                    error={errors.email}
                    touched={touched.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isLoading}
                  />

                  {/* Subject Input */}
                  <FormInput
                    label="Subject"
                    name="subject"
                    type="text"
                    placeholder="How can we help?"
                    value={values.subject}
                    error={errors.subject}
                    touched={touched.subject}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isLoading}
                  />

                  {/* Message Textarea */}
                  <div className="space-y-2">
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Message ({values.message.length}/1000)
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows="6"
                      placeholder="Your message here..."
                      value={values.message}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isLoading}
                      maxLength={1000}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 disabled:bg-gray-50 disabled:opacity-60"
                    />
                    {errors.message && touched.message && (
                      <p className="text-sm text-red-500">⚠️ {errors.message}</p>
                    )}
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
                    <Send className="inline mr-2 w-4 h-4" />
                    Send Message
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section (Placeholder) */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-300 rounded-xl h-96 flex items-center justify-center">
            <p className="text-gray-600 text-lg">📍 Our Office Location</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
