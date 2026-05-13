# License And Asset Policy

This file may be injected when AI recommends, generates, transforms, references, uploads, or embeds public-page assets.

## Allowed Sources

AI may use or recommend assets only when one of these is true:

- the user uploaded the asset and confirms they have rights to use it;
- the asset is project-owned;
- the source is listed in a reviewed governance allowlist;
- the license is explicitly free for commercial use, permits web display, and permits modification when modification is needed.

## Allowed License Families

These license families are acceptable when their full terms match the intended use:

- `CC0`
- `Public Domain`
- `MIT`
- `Apache-2.0`
- `BSD`
- `ISC`
- `SIL OFL` for fonts
- `CC BY 4.0` only when attribution can be displayed or stored as required

## Disallowed Sources

AI must not use or recommend:

- non-commercial licenses;
- no-derivatives licenses when modification is needed;
- editorial-only or personal-use-only assets;
- unknown licenses;
- Pinterest, generic image search results, or "free download" pages without license text;
- assets imitating existing VTuber, anime, game, brand, trademark, or celebrity characters;
- hotlinked external images, fonts, stickers, or illustrations without a reviewed source.

## Asset Manifest Requirement

Any reusable external asset source should be represented by a reviewed manifest before product use:

```yaml
assetId: public-presence-example
sourceUrl: https://example.invalid
author: Example Author
license: CC0
licenseUrl: https://example.invalid/license
commercialUse: true
modificationAllowed: true
attributionRequired: false
reviewedAt: 2026-05-13
reviewedBy: security-license-governance
fileHash: ""
```

If the manifest is missing or incomplete, AI should propose a CSS/native alternative or ask the user for an authorized upload.
