/**
 * Type declaration for the `mjml` package (no @types/mjml available).
 *
 * Only declares what we actually use in snapshot comparison tests.
 */
declare module 'mjml' {
  interface MjmlResult {
    html: string;
    errors: { message: string; tagName: string; line: number }[];
  }

  function mjml(input: string, options?: Record<string, unknown>): MjmlResult;

  export default mjml;
}
