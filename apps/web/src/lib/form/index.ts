// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Form utilities with react-hook-form and Zod integration

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  type FieldValues,
  useForm as useReactHookForm,
  type UseFormProps,
  type UseFormReturn,
} from 'react-hook-form';
import { z } from 'zod';

/**
 * Type for Zod schemas that produce react-hook-form compatible values
 */
type ZodFormSchema = z.ZodType<FieldValues, FieldValues>;

/**
 * useZodForm - Wrapper around react-hook-form with Zod validation
 * 
 * @example
 * ```tsx
 * import { CustomerSchema } from '@tcrn/shared';
 * 
 * function CustomerForm() {
 *   const form = useZodForm(CustomerSchema, {
 *     defaultValues: { name: '', email: '' }
 *   });
 * 
 *   return (
 *     <form onSubmit={form.handleSubmit(onSubmit)}>
 *       <input {...form.register('name')} />
 *       {form.formState.errors.name && (
 *         <span>{form.formState.errors.name.message}</span>
 *       )}
 *     </form>
 *   );
 * }
 * ```
 */
export function useZodForm<TSchema extends ZodFormSchema>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.input<TSchema>, unknown, z.output<TSchema>>, 'resolver'>
): UseFormReturn<z.input<TSchema>, unknown, z.output<TSchema>> {
  return useReactHookForm<z.input<TSchema>, unknown, z.output<TSchema>>({
    ...options,
    resolver: zodResolver(schema),
  });
}

/**
 * Type helper for form data from Zod schema
 */
export type FormData<T extends ZodFormSchema> = z.output<T>;

/**
 * Re-export common hooks from react-hook-form for convenience
 */
export type {
  Control,
  FieldError,
  FieldErrors,
  FieldValues,
  SubmitHandler,
  UseFormGetValues,
  UseFormRegister,
  UseFormReturn,
  UseFormSetValue,
} from 'react-hook-form';
export {
  Controller,
  FormProvider,
  useController,
  useFieldArray,
  useFormContext,
  useWatch,
} from 'react-hook-form';
