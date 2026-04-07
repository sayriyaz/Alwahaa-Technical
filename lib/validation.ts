export type ValidationRule = {
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  email?: boolean
  message?: string
}

export type ValidationSchema = Record<string, ValidationRule>

export type ValidationErrors = Record<string, string>

export function validateField(
  name: string,
  value: string | number | boolean | null | undefined,
  rules: ValidationRule
): string | null {
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return rules.message || `${name} is required`
  }

  if (value === null || value === undefined || value === '') {
    return null
  }

  const strValue = String(value)

  if (rules.minLength && strValue.length < rules.minLength) {
    return rules.message || `${name} must be at least ${rules.minLength} characters`
  }

  if (rules.maxLength && strValue.length > rules.maxLength) {
    return rules.message || `${name} must be at most ${rules.maxLength} characters`
  }

  if (rules.min && Number(value) < rules.min) {
    return rules.message || `${name} must be at least ${rules.min}`
  }

  if (rules.max && Number(value) > rules.max) {
    return rules.message || `${name} must be at most ${rules.max}`
  }

  if (rules.pattern && !rules.pattern.test(strValue)) {
    return rules.message || `${name} is invalid`
  }

  if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) {
    return rules.message || 'Please enter a valid email address'
  }

  return null
}

export function validateForm(
  data: Record<string, string | number | boolean | null | undefined>,
  schema: ValidationSchema
): ValidationErrors {
  const errors: ValidationErrors = {}

  Object.entries(schema).forEach(([field, rules]) => {
    const error = validateField(field, data[field], rules)
    if (error) {
      errors[field] = error
    }
  })

  return errors
}

export function sanitizeInput(value: string): string {
  return value
    .replace(/<script\b[^\u003c]*(?:(?!<\/script>)<[^\u003c]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
}

export const commonSchemas = {
  email: { required: true, email: true },
  phone: {
    pattern: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
    message: 'Please enter a valid phone number',
  },
  currency: {
    required: true,
    min: 0,
    message: 'Amount must be 0 or greater',
  },
  requiredString: { required: true, minLength: 1 },
  date: { required: true },
}
