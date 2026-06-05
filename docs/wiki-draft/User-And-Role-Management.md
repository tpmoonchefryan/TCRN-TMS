# User And Role Management

TCRN TMS uses a three-state role permission model:

- `deny`: explicitly forbidden; wins over grants from other assigned roles.
- `grant`: explicitly allowed unless another assigned role denies it.
- `unset`: this role does not decide the permission.

The intended built-in recovery role is `INITIAL_ADMIN`. Day-to-day roles are user-created custom roles. Current UI proof still showed additional default role assignments in at least the AC tenant, so this baseline is recorded as a known limitation until rechecked.

Detailed guide: [User and Role Management](../user-guide/user-and-role-management/README.md).

