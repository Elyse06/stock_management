export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validateRequired(value, fieldName) {
  if (!value || (typeof value === "string" && !value.trim())) {
    return `${fieldName} est requis`;
  }
  return null;
}

export function validateMaxLength(value, maxLength, fieldName) {
  if (value && value.length > maxLength) {
    return `${fieldName} ne doit pas dépasser ${maxLength} caractères`;
  }
  return null;
}

export function validateForm(fields) {
  const errors = {};
  for (const [fieldName, rules] of Object.entries(fields)) {
    for (const rule of rules) {
      const error = rule();
      if (error) {
        errors[fieldName] = error;
        break;
      }
    }
  }
  return errors;
}