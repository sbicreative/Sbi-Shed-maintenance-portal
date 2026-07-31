# Master PF Mapping Audit

Audit date: 2026-07-31

## Source workbooks

| Workbook | Rows | Available columns | PF result |
|---|---:|---|---|
| Employee Master.xlsx | 46 | SN, Department, Section, Name, Designation | PF column absent; all 46 records need PF values |
| Supervisor Master.xlsx | 39 | SN, Name, Designation, Department, Section, Role | PF column absent; all 39 records need PF values |

No duplicate normalized names were found within either workbook. This does not make names a reliable permanent identity key.

## Live-table audit

At audit time, `employee_master` had 46 rows and `supervisor_master` had 39 rows. Neither table had a `pf_no` column. `user_master` had four rows and did have `pf_no`; three operational users were already linked to a master ID.

The existing linked rows demonstrate why name mapping is unsafe:

| User name | Master name | Current link |
|---|---|---|
| Kalu Ram Prajapat | `" Kaluram Prajapat` | employee_master ID 12 |
| Diwan Dinesh chandra | DIWAN DINESHCHANDRA (Incharge) | supervisor_master ID 23 |
| Jignesh Zinzala | Sh. Jignesh Zinzala | supervisor_master ID 28 |

The three operational PF numbers were distinct. The Administration user is intentionally not mapped to employee/supervisor master.

## Safe rollout

1. Run `database/07_pf_master_mapping.sql` in Supabase. It adds nullable PF columns, backfills the three existing linked records, and creates uniqueness constraints plus an automatic mapping trigger.
2. Add a `PF Number` column to both Excel masters and populate every row. Keep PF values as text so leading zeroes are preserved.
3. Run `node import-employee-master.js` and `node import-supervisor-master.js`. The default mode is validation/audit only and makes no database changes.
4. Resolve every missing/duplicate/cross-master PF error. Then run each command with `--apply`.
5. Registration and login mapping will resolve staff/supervisor/incharge identities by canonical PF only. Name differences no longer decide identity.

The import no longer deletes master tables. Existing IDs are retained when PF or one unique legacy identity matches, protecting foreign-key references from the Staff Dashboard and schedule workflows.
