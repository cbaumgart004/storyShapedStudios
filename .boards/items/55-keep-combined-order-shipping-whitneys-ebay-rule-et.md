---
id: 55
type: Issue
title: Keep combined-order shipping (Whitney's eBay rule; Etsy does it natively)
state: New
tags: needs-triage
parent: 
created: 2026-11-14
modified: 2026-11-14
---
Customer feedback 2026-11-14: Whitney set up a complicated eBay rule for combined-order shipping; Etsy combines on its own. That behavior must not be lost on the site checkout or the sync. Step 1 (done, unverified live): GET /api/marketplace/ebay/shipping reads her shipping discount profiles (Trading GetShippingDiscountProfiles) and fulfillment policies, read only. Step 2: record the rule here, then carry it into site checkout and keep pushes from overwriting it.
