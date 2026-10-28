---
id: 49
type: Issue
title: Forms: let the owner create new form templates
state: New
tags: needs-triage
parent: 
created: 2026-10-27
modified: 2026-10-27
---
The owner should be able to create new form templates (a waiver, a consignment agreement, a custom request) from the console, not only use the Sales Order.

What exists (2026-10-27):
- Templates live in the console schema under `forms.<name>` (`_eotm-console/console/schema/sites/storyshaped.json`). `forms.salesOrder` lists every section and field of the Sales Order: customer, invoice details, line items, payment, notes and terms, totals, customer acceptance (signature, date, printed name), plus company lines, footer tagline, payment methods and terms.
- Entries from a template file into the folder named from its title (`folderOf` in `frontend/src/pages/Admin/Forms.jsx`: "Waiver" -> `waivers`), stored in `form_entries` (`backend/server/utils/forms.js`), numbered per folder.
- The Forms tool (`/admin/forms`) lists every template in `forms`, but only the Sales Order has an editor (`EDITORS` in Forms.jsx). Any other template shows "Editor not built yet".

To do:
- Render any form from its schema `sections` (field types: text, email, tel, textarea, date, select, number, money, percent, calculated, signature; repeat sections such as line items).
- Let the owner add a template in the console (title, sections, fields), checked by `checkSchema` (`forms.<name>` rule in `schema/schema.js`).
- Move the Sales Order onto the same renderer so it stops being a special case.
- Per-folder number start is still code (`FIRST_NUMBERS` in forms.js); a new template needs its own start, from the schema.
