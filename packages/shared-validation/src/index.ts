import { z } from 'zod';

export const userMediumSchema = z.enum(['Sinhala', 'Tamil', 'English']);
export const educationMediumSchema = userMediumSchema;
export const userRoleSchema = z.enum(['student', 'teacher', 'reviewer', 'admin']);
export const userStatusSchema = z.enum(['active', 'disabled', 'suspended']);
export const subjectStatusSchema = z.enum(['active', 'archived']);
export const textbookResourceTypeSchema = z.enum([
  'textbook',
  'pupil-book',
  'workbook',
  'reading-book',
  'activity-book',
  'practical-book',
]);
export const hostingPermissionSchema = z.enum(['link-only', 'confirmed', 'pending']);

const epuAllowedHostname = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return normalized === 'edupub.gov.lk' || normalized === 'www.edupub.gov.lk';
};

export const epdUrlSchema = z.string().trim().min(1).url().refine((value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && epuAllowedHostname(parsed.hostname);
  } catch {
    return false;
  }
}, {
  message: 'Only official EPD HTTPS links are allowed.',
});

export const textbookChapterSchema = z.object({
  chapterNumber: z.number().int().nullable(),
  chapterTitle: z.string().trim().nullable(),
  officialPdfUrl: epdUrlSchema,
  verified: z.boolean(),
});

export const textbookSchema = z.object({
  id: z.string().trim().min(1),
  bookId: z.string().trim().min(1).optional(),
  grade: z.number().int().min(6).max(13).nullable(),
  gradeRange: z.array(z.number().int().min(6).max(13)).nullable().optional(),
  medium: educationMediumSchema,
  stream: z.string().trim().min(1).nullable().optional(),
  subjectId: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  officialTitle: z.string().trim().min(1),
  normalizedTitle: z.string().trim().min(1),
  part: z.string().trim().nullable().optional(),
  resourceType: textbookResourceTypeSchema,
  officialCatalogUrl: epdUrlSchema,
  officialPdfUrl: epdUrlSchema.nullable().optional(),
  chapters: z.array(textbookChapterSchema).default([]),
  sourceAuthority: z.literal('Educational Publications Department, Sri Lanka'),
  sourceDomain: z.literal('edupub.gov.lk'),
  hostingPermission: hostingPermissionSchema.default('link-only'),
  verified: z.boolean().default(false),
  accessEnabled: z.boolean().default(false),
  verificationMethod: z.string().trim().min(1),
  lastVerifiedDate: z.string().trim().min(1),
  downloadCount: z.number().int().nonnegative().default(0),
  lastDownloadedAt: z.string().nullable().optional(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
}).refine((value) => value.verificationMethod.length > 0, { message: 'Verification method is required.' });

const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

export const registrationSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: passwordSchema,
  confirmPassword: z.string().min(8).max(128),
  grade: z.number().int().min(6).max(13),
  medium: userMediumSchema,
  termsAccepted: z.boolean().refine((value) => value === true, {
    message: 'You must accept the terms to continue.',
  }),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmPassword'],
      message: 'Passwords do not match.',
    });
  }
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export const roleAssignmentSchema = z.object({
  role: userRoleSchema.refine((role) => role !== 'admin' && role !== 'teacher' && role !== 'reviewer', {
    message: 'Only trusted admin scripts may assign privileged roles.',
  }),
});

export const publicRegistrationRequestSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: passwordSchema,
  confirmPassword: z.string().min(8).max(128),
  grade: z.number().int().min(6).max(13),
  medium: userMediumSchema,
  termsAccepted: z.boolean().refine((value) => value === true, {
    message: 'You must accept the terms to continue.',
  }),
  role: z.literal('student').optional(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmPassword'],
      message: 'Passwords do not match.',
    });
  }
  if (data.role && data.role !== 'student') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['role'],
      message: 'Public registrations can only create student accounts.',
    });
  }
});

export const createSubjectSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  grade: z.number().int().min(6).max(13),
  medium: userMediumSchema,
  iconName: z.string().trim().max(80).optional().or(z.literal('')),
}).transform((value) => ({
  ...value,
  description: value.description?.trim() ? value.description.trim() : undefined,
  iconName: value.iconName?.trim() ? value.iconName.trim() : undefined,
}));

export const updateSubjectSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  grade: z.number().int().min(6).max(13).optional(),
  medium: userMediumSchema.optional(),
  iconName: z.string().trim().max(80).optional().or(z.literal('')),
  status: subjectStatusSchema.optional(),
  assignedTeacherIds: z.array(z.string().trim().min(1)).refine((teachers) => new Set(teachers).size === teachers.length, {
    message: 'Teacher IDs must be unique.',
  }).optional(),
}).transform((value) => ({
  ...value,
  description: value.description?.trim() ? value.description.trim() : undefined,
  iconName: value.iconName?.trim() ? value.iconName.trim() : undefined,
}));

export const assignSubjectTeachersSchema = z.object({
  teacherIds: z.array(z.string().trim().min(1)).refine((teachers) => new Set(teachers).size === teachers.length, {
    message: 'Teacher IDs must be unique.',
  }),
});

export const subjectFiltersSchema = z.object({
  search: z.string().trim().optional(),
  grade: z.number().int().min(6).max(13).optional(),
  medium: userMediumSchema.optional(),
  status: z.union([subjectStatusSchema, z.literal('all')]).optional(),
  assignedToUid: z.string().trim().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});

export const userFiltersSchema = z.object({
  search: z.string().trim().optional(),
  role: z.union([userRoleSchema, z.literal('all')]).optional(),
  status: z.union([userStatusSchema, z.literal('all')]).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});

export { z };
