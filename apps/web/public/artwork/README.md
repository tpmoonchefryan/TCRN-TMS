# Artwork Staging

This directory stores web-consumable raster artwork that can be referenced
directly from the Next.js app by URL paths under `/artwork/...`.

Recommended usage:

- `brand/`
  - product brand marks, app-icon source masters, favicon source files
- `og/`
  - system-wide and page-level social preview images
- `homepage/backgrounds/`
  - wide background images for public homepage themes
- `homepage/gallery/`
  - editorial/gallery images used by public homepage blocks
- `login/`
  - optional login-page background artwork
- `marshmallow/`
  - optional public marshmallow background artwork
- `talent/demo-avatars/`
  - demo-only generated avatars; do not place approved production talent art here unless cleared

Notes:

- Files placed here are public web assets.
- For production talent portraits, prefer approved official source material.
- If app icons are later wired through Next metadata conventions, the final
  exported files may need to be copied to `public/` root or `src/app/`.
