import { type CustomField } from '@puckeditor/core';
import { type ReactNode, useId, useState } from 'react';

export type HomepagePuckImageUpload = (file: File) => Promise<string>;

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function isValidColorValue(value: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim());
}

function isRenderableImageSource(value: string) {
  const trimmed = value.trim();

  return trimmed.startsWith('data:image/')
    || trimmed.startsWith('http://')
    || trimmed.startsWith('https://')
    || trimmed.startsWith('/');
}

async function readFileAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(reader.error || new Error('Failed to read image file.'));
    };
    reader.onload = () => {
      const result = reader.result;

      if (typeof result === 'string') {
        resolve(result);
        return;
      }

      reject(new Error('Failed to read image file.'));
    };
    reader.readAsDataURL(file);
  });
}

function FieldFrame({
  children,
  description,
  label,
  tone = 'neutral',
}: Readonly<{
  children: ReactNode;
  description?: string;
  label: string;
  tone?: 'neutral' | 'solid' | 'gradient' | 'image';
}>) {
  const toneClass =
    tone === 'solid'
      ? 'border-sky-200 bg-sky-50/70'
      : tone === 'gradient'
        ? 'border-violet-200 bg-violet-50/70'
        : tone === 'image'
          ? 'border-emerald-200 bg-emerald-50/70'
          : 'border-slate-200 bg-white';

  return (
    <div className={`space-y-3 rounded-2xl border px-4 py-4 shadow-sm ${toneClass}`}>
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </div>
        {description ? <p className="text-xs leading-5 text-slate-500">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function ImagePreview({
  alt,
  value,
}: Readonly<{
  alt: string;
  value: string;
}>) {
  if (!value.trim()) {
    return (
      <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-xs font-medium text-slate-500">
        No image selected
      </div>
    );
  }

  if (isRenderableImageSource(value)) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        <img src={value} alt={alt} className="h-28 w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-xs font-medium text-slate-500"
      style={{ background: value }}
    >
      Preview
    </div>
  );
}

function asyncNoop() {
  return Promise.resolve();
}

function HomepagePuckImageFieldControl({
  clearLabel,
  description,
  label,
  name,
  onChange,
  onUpload,
  placeholder,
  readOnly,
  uploadErrorLabel,
  uploadLabel,
  uploadingLabel,
  value,
}: Readonly<{
  clearLabel: string;
  description?: string;
  label: string;
  name?: string;
  onChange: (value: string) => void;
  onUpload?: HomepagePuckImageUpload;
  placeholder: string;
  readOnly?: boolean;
  uploadErrorLabel?: string;
  uploadLabel: string;
  uploadingLabel?: string;
  value: string;
}>) {
  const uploadId = useId();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const currentValue = asString(value).trim();
  const isUploadDisabled = Boolean(readOnly || isUploading);

  return (
    <FieldFrame label={label} description={description} tone="image">
      <div className="space-y-3">
        <ImagePreview alt={label} value={currentValue} />
        <input
          type="text"
          aria-label={label}
          name={name}
          value={currentValue}
          placeholder={placeholder}
          onChange={(event) => {
            setUploadError(null);
            onChange(event.target.value);
          }}
          readOnly={readOnly}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={uploadId}
            aria-disabled={isUploadDisabled ? 'true' : undefined}
            aria-busy={isUploading ? 'true' : undefined}
            className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-2 text-xs font-medium transition ${
              isUploadDisabled
                ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                : 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50'
            }`}
          >
            {isUploading ? uploadingLabel || uploadLabel : uploadLabel}
          </label>
          <input
            id={uploadId}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="sr-only"
            disabled={isUploadDisabled}
            onChange={async (event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              input.value = '';

              if (!file || isUploadDisabled) {
                return;
              }

              setIsUploading(true);
              setUploadError(null);

              try {
                const nextValue = onUpload
                  ? await onUpload(file)
                  : await readFileAsDataUrl(file);

                onChange(nextValue);
              } catch {
                setUploadError(uploadErrorLabel || 'Image upload failed.');
                await asyncNoop();
              } finally {
                setIsUploading(false);
              }
            }}
          />
          <button
            type="button"
            disabled={readOnly || isUploading || !currentValue}
            onClick={() => {
              setUploadError(null);
              onChange('');
            }}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {clearLabel}
          </button>
        </div>
        {uploadError ? (
          <p className="text-xs font-medium text-rose-700">{uploadError}</p>
        ) : null}
      </div>
    </FieldFrame>
  );
}

function HomepagePuckBackgroundFieldControl({
  clearLabel,
  description,
  kind,
  label,
  name,
  onChange,
  onUpload,
  placeholder,
  readOnly,
  uploadErrorLabel,
  uploadLabel,
  uploadingLabel,
  value,
}: Readonly<{
  clearLabel: string;
  description?: string;
  kind: 'solid' | 'gradient' | 'image';
  label: string;
  name?: string;
  onChange: (value: string) => void;
  onUpload?: HomepagePuckImageUpload;
  placeholder: string;
  readOnly?: boolean;
  uploadErrorLabel?: string;
  uploadLabel: string;
  uploadingLabel?: string;
  value: string;
}>) {
  const currentValue = asString(value).trim();

  if (kind === 'image') {
    return (
      <HomepagePuckImageFieldControl
        clearLabel={clearLabel}
        description={description}
        label={label}
        name={name}
        onChange={onChange}
        onUpload={onUpload}
        placeholder={placeholder}
        readOnly={readOnly}
        uploadErrorLabel={uploadErrorLabel}
        uploadLabel={uploadLabel}
        uploadingLabel={uploadingLabel}
        value={currentValue}
      />
    );
  }

  if (kind === 'gradient') {
    const gradientPresets = [
      'linear-gradient(135deg, #FAFBFC 0%, #E0E7FF 100%)',
      'linear-gradient(135deg, #FFF1F5 0%, #FDE68A 100%)',
      'linear-gradient(135deg, #0F172A 0%, #334155 100%)',
    ];

    return (
      <FieldFrame label={label} description={description} tone="gradient">
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {gradientPresets.map((preset, index) => {
              const isActive = currentValue === preset;

              return (
                <button
                  key={preset}
                  type="button"
                  disabled={readOnly}
                  onClick={() => onChange(preset)}
                  aria-label={`${label} preset ${index + 1}`}
                  className={`h-14 rounded-xl border transition ${
                    isActive
                      ? 'border-slate-900 ring-2 ring-slate-900/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  style={{ background: preset }}
                />
              );
            })}
          </div>
          <textarea
            aria-label={label}
            name={name}
            value={currentValue}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            readOnly={readOnly}
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
          />
          <div
            className="h-20 rounded-2xl border border-slate-200"
            style={{ background: currentValue || gradientPresets[0] }}
          />
          <button
            type="button"
            disabled={readOnly || !currentValue}
            onClick={() => onChange('')}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {clearLabel}
          </button>
        </div>
      </FieldFrame>
    );
  }

  const normalizedSolid = isValidColorValue(currentValue) ? currentValue : '#FAFBFC';

  return (
    <FieldFrame label={label} description={description} tone="solid">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={normalizedSolid}
            onChange={(event) => onChange(event.target.value)}
            disabled={readOnly}
            aria-label={`${label} swatch`}
            className="h-12 w-16 rounded-xl border border-slate-200 bg-white p-1"
          />
          <input
            type="text"
            aria-label={label}
            name={name}
            value={currentValue}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            readOnly={readOnly}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
          />
        </div>
        <div
          className="h-20 rounded-2xl border border-slate-200"
          style={{ background: currentValue || normalizedSolid }}
        />
        <button
          type="button"
          disabled={readOnly || !currentValue}
          onClick={() => onChange('')}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {clearLabel}
        </button>
      </div>
    </FieldFrame>
  );
}

function HomepagePuckBackgroundOverlayFieldControl({
  description,
  label,
  onChange,
  readOnly,
  value,
}: Readonly<{
  description?: string;
  label: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  value: string;
}>) {
  const overlayPresets = [
    'rgba(15, 23, 42, 0.20)',
    'rgba(15, 23, 42, 0.35)',
    'rgba(15, 23, 42, 0.55)',
  ];
  const currentValue = asString(value).trim() || 'rgba(15, 23, 42, 0.35)';

  return (
    <FieldFrame label={label} description={description} tone="image">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {overlayPresets.map((preset) => {
            const isActive = currentValue === preset;

            return (
              <button
                key={preset}
                type="button"
                disabled={readOnly}
                onClick={() => onChange(preset)}
                className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                } ${readOnly ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                {preset}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={currentValue}
          placeholder="rgba(15, 23, 42, 0.35)"
          onChange={(event) => onChange(event.target.value)}
          readOnly={readOnly}
          aria-label={label}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
        />
      </div>
    </FieldFrame>
  );
}

export function createHomepagePuckImageField({
  clearLabel,
  description,
  label,
  onUpload,
  placeholder,
  uploadErrorLabel,
  uploadLabel,
  uploadingLabel,
}: Readonly<{
  clearLabel: string;
  description?: string;
  label: string;
  onUpload?: HomepagePuckImageUpload;
  placeholder: string;
  uploadErrorLabel?: string;
  uploadLabel: string;
  uploadingLabel?: string;
}>): CustomField<string> {
  return {
    type: 'custom',
    label,
    render: ({ name, readOnly, value, onChange }) => (
      <HomepagePuckImageFieldControl
        clearLabel={clearLabel}
        description={description}
        label={label}
        name={name}
        onChange={onChange}
        onUpload={onUpload}
        placeholder={placeholder}
        readOnly={readOnly}
        uploadErrorLabel={uploadErrorLabel}
        uploadLabel={uploadLabel}
        uploadingLabel={uploadingLabel}
        value={asString(value)}
      />
    ),
  };
}

export function createHomepagePuckBackgroundField({
  clearLabel,
  description,
  kind,
  label,
  onUpload,
  placeholder,
  uploadErrorLabel,
  uploadLabel,
  uploadingLabel,
}: Readonly<{
  clearLabel: string;
  description?: string;
  kind: 'solid' | 'gradient' | 'image';
  label: string;
  onUpload?: HomepagePuckImageUpload;
  placeholder: string;
  uploadErrorLabel?: string;
  uploadLabel: string;
  uploadingLabel?: string;
}>): CustomField<string> {
  return {
    type: 'custom',
    label,
    render: ({ name, readOnly, value, onChange }) => (
      <HomepagePuckBackgroundFieldControl
        clearLabel={clearLabel}
        description={description}
        kind={kind}
        label={label}
        name={name}
        onChange={onChange}
        onUpload={onUpload}
        placeholder={placeholder}
        readOnly={readOnly}
        uploadErrorLabel={uploadErrorLabel}
        uploadLabel={uploadLabel}
        uploadingLabel={uploadingLabel}
        value={asString(value)}
      />
    ),
  };
}

export function createHomepagePuckBackgroundOverlayField({
  description,
  label,
}: Readonly<{
  description?: string;
  label: string;
}>): CustomField<string> {
  return {
    type: 'custom',
    label,
    render: ({ readOnly, value, onChange }) => (
      <HomepagePuckBackgroundOverlayFieldControl
        description={description}
        label={label}
        onChange={onChange}
        readOnly={readOnly}
        value={asString(value)}
      />
    ),
  };
}
