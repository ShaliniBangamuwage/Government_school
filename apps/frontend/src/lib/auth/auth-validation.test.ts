import { describe, expect, it } from 'vitest';
import { publicRegistrationRequestSchema } from '@edunexa/shared-validation';

describe('publicRegistrationRequestSchema', () => {
  it('rejects privileged role values from public registration requests', () => {
    const result = publicRegistrationRequestSchema.safeParse({
      fullName: 'Ava Student',
      email: 'ava@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      grade: 10,
      medium: 'English',
      termsAccepted: true,
      role: 'teacher',
    });

    expect(result.success).toBe(false);
  });
});
