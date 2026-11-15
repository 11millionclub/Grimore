import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'At least 3 characters')
  .max(24, 'At most 24 characters')
  .regex(/^[A-Za-z0-9_.]+$/, 'Letters, numbers, dots and underscores only');

export const emailSchema = z.string().trim().min(1, 'Enter your email').pipe(z.email('Enter a valid email address'));

export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(72, 'At most 72 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Enter your password') });
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  displayName: z.string().trim().min(1, 'Tell us what to call you').max(60),
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type SignUpValues = z.infer<typeof signUpSchema>;

export const resetRequestSchema = z.object({ email: emailSchema });
export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export const profileSchema = z.object({
  display_name: z.string().trim().min(1, 'Required').max(60),
  username: usernameSchema,
  bio: z.string().trim().max(280, 'At most 280 characters'),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const postSchema = z.object({ body: z.string().trim().min(1, 'Write something first').max(4000, 'At most 4,000 characters') });
export const commentSchema = z.object({ body: z.string().trim().min(1).max(2000) });

export const reviewSchema = z.object({
  rating: z.number().min(0.5, 'Choose a rating').max(5),
  headline: z.string().trim().max(140, 'At most 140 characters'),
  body: z.string().trim().max(20000),
  hasSpoilers: z.boolean(),
});
export type ReviewValues = z.infer<typeof reviewSchema>;

export const manualBookSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(500),
  authors: z.string().trim().min(1, 'Add at least one author').max(400),
  year: z
    .string()
    .trim()
    .regex(/^$|^-?\d{1,4}$/, 'Use a year such as 1967'),
  pages: z
    .string()
    .trim()
    .regex(/^$|^\d{1,5}$/, 'Numbers only'),
  isbn: z
    .string()
    .trim()
    .regex(/^$|^[\dXx-]{10,17}$/, 'ISBN-10 or ISBN-13'),
});
export type ManualBookValues = z.infer<typeof manualBookSchema>;

export const quoteSchema = z.object({ body: z.string().trim().min(1, 'Add a quote').max(600), attribution: z.string().trim().max(160) });
