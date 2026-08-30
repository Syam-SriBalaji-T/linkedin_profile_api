export type LinkedInFailureKind =
  | 'invalid_url'
  | 'not_found'
  | 'session_invalid'
  | 'rate_limited'
  | 'blocked'
  | 'timeout'
  | 'upstream_error'
  | 'not_configured';

export class LinkedInError extends Error {
  constructor(
    readonly kind: LinkedInFailureKind,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'LinkedInError';
  }

  static invalidUrl(url: string): LinkedInError {
    return new LinkedInError('invalid_url', `Not a LinkedIn profile URL: ${url}`, false);
  }

  static notFound(publicId: string): LinkedInError {
    return new LinkedInError('not_found', `Profile not found: ${publicId}`, false);
  }

  static sessionInvalid(): LinkedInError {
    return new LinkedInError(
      'session_invalid',
      'The stored LinkedIn session is no longer valid (LINKEDIN_LI_AT / LINKEDIN_CSRF_TOKEN)',
      false,
    );
  }

  static notConfigured(): LinkedInError {
    return new LinkedInError(
      'not_configured',
      'LinkedIn credentials are not configured (LINKEDIN_LI_AT / LINKEDIN_CSRF_TOKEN)',
      false,
    );
  }

  static rateLimited(): LinkedInError {
    return new LinkedInError('rate_limited', 'Rate limited by LinkedIn', true);
  }

  static blocked(detail: string): LinkedInError {
    return new LinkedInError('blocked', `Request blocked by LinkedIn: ${detail}`, true);
  }

  static timeout(ms: number): LinkedInError {
    return new LinkedInError('timeout', `Upstream request timed out after ${ms}ms`, true);
  }

  static upstream(status: number): LinkedInError {
    return new LinkedInError('upstream_error', `Unexpected upstream status ${status}`, status >= 500);
  }
}
