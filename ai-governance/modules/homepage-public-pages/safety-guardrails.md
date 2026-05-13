# Homepage AI Safety Guardrails

This file is suitable for direct injection into Homepage AI authoring flows.

## Structured Mode

- Default output must be a template config patch.
- AI must not change layout except through approved template selection or explicitly allowed section controls.
- AI must not invent public routes, Marshmallow URLs, iframe providers, asset rights, or unavailable runtime capabilities.
- AI must not expose tenant internal IDs, user emails, private API paths, unpublished data, backend errors, schema names, or migration details.

## Advanced Source

Advanced Source is a one-way eject path. It may use HTML/CSS/layout only after explicit user confirmation.

Forbidden in Advanced Source:

- JavaScript;
- `<script>`;
- event handler attributes such as `onclick` or `onload`;
- `javascript:`, `data:`, `blob:`, or `file:` URLs;
- arbitrary `<form>`;
- arbitrary `<iframe>`;
- `srcdoc`;
- third-party tracking;
- unknown external assets;
- CSS `@import`;
- external CSS or font URLs without reviewed license and source policy.

If sanitizer or allowlist checks reject source, publication must fail with visible reasons.

## Iframe Allowlist

Homepage MVP supports iframe embeds only through `ai-governance/security/iframe-allowlist.yaml`.

AI must:

- match provider ID and normalized embed URL to the allowlist;
- include a meaningful iframe title;
- use lazy loading;
- preserve the provider sandbox and referrer policy;
- return a blocked request for unknown providers.

AI must not output raw iframe HTML in template patches.

## Asset And License

AI may use:

- user-provided assets with user-confirmed rights;
- project-owned assets;
- reviewed commercial-use assets with manifest evidence;
- CSS-native visuals that do not rely on external assets.

AI must not use unreviewed search results, non-commercial assets, no-derivatives assets where transformation is needed, or unofficial imitations of existing VTuber, anime, game, brand, trademark, or celebrity characters.

## Public Presence Style

AI may make public pages cute, warm, and Vup/Vtuber-aware. It must preserve:

- readable contrast;
- clear hierarchy;
- keyboard and screen-reader paths;
- reduced-motion fallback;
- mobile-safe layout;
- localized public copy;
- explicit CTA semantics.
