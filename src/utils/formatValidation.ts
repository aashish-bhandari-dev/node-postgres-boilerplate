import { ZodError, ZodIssue } from 'zod';

/**
 * Format field name into human-readable Title Case
 * e.g. "email" -> "Email", "authorId" -> "Author Id", "first_name" -> "First Name"
 */
export function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Transforms generic Zod error messages into frontend-friendly human-readable messages.
 * e.g. "Required" -> "Email is required"
 */
export function formatZodIssueMessage(issue: ZodIssue): string {
  const rawField = issue.path[issue.path.length - 1];
  const fieldName = typeof rawField === 'string' ? formatFieldName(rawField) : 'Field';

  // If Zod generated generic "Required" message or undefined type check
  const isRequiredError =
    issue.message.toLowerCase() === 'required' ||
    (issue.code === 'invalid_type' &&
      'received' in issue &&
      (issue as { received: string }).received === 'undefined');

  if (isRequiredError) {
    return `${fieldName} is required`;
  }

  return issue.message;
}

/**
 * Formats a ZodError into a clean firstErrorMessage and list of field errors
 */
export function formatZodErrors(error: ZodError): {
  firstErrorMessage: string;
  errors: { field: string; message: string }[];
} {
  const formattedErrors = error.errors.map((issue) => ({
    field: issue.path.join('.'),
    message: formatZodIssueMessage(issue),
  }));

  const firstErrorMessage = formattedErrors[0]?.message || 'Validation failed';

  return {
    firstErrorMessage,
    errors: formattedErrors,
  };
}
