// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Form utilities with react-hook-form and Zod integration

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm as useReactHookForm,UseFormProps, UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

/**
 * Type for Zod object schemas that produce FieldValues-compatible output
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZodObjectSchema = z.ZodObject<any>;

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
export function useZodForm<TSchema extends ZodObjectSchema>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, 'resolver'>
): UseFormReturn<z.infer<TSchema>> {
   
  return useReactHookForm<z.infer<TSchema>>({
    ...options,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zodResolver requires any for generic schema compatibility
    resolver: zodResolver(schema as any),
  }) as UseFormReturn<z.infer<TSchema>>;
}

/**
 * Type helper for form data from Zod schema
 */
export type FormData<T extends ZodObjectSchema> = z.infer<T>;

/**
 * Re-export common hooks from react-hook-form for convenience
 */
export type {
    Control, FieldError, FieldErrors, FieldValues, SubmitHandler, UseFormGetValues, UseFormRegister, UseFormReturn, UseFormSetValue
} from 'react-hook-form';
export {
    Controller,
    FormProvider, useController, useFieldArray, useFormContext,
    useWatch
} from 'react-hook-form';

