# TCRN TMS Bruno Collection

Local/private Bruno collection placeholder for curated API smoke readback.

- Do not commit environment secrets.
- Keep generated exports out of source control unless a later API owner review accepts them.
- Use generated OpenAPI artifacts and product-owned API registry metadata as the source of truth.
- Health requests are the initial Phase 2 smoke surface.
- Run only against localhost, `127.0.0.1`, or an explicitly approved private test host:

```sh
TCRN_BRUNO_BASE_URL=http://127.0.0.1:3000 pnpm tooling:bruno:health
```
