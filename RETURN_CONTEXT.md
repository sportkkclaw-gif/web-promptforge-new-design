# RETURN_CONTEXT — 20260428_promptforge_full_product_rebuild_v2

verdict: returned_for_fix
review_event: review.rejected
updated_at: 2026-04-29T19:45:53+08:00
review_report: D:\WORK\成品區\_驗收報告\Simon\20260428_promptforge_full_product_rebuild_v2\20260429T194553+0800_20260428_promptforge_full_product_rebuild_v2_returned_for_fix.md

## must_fix
1. Complete or formally re-scope the remaining full-product P0 checklist; current evidence shows 51/234 P0 complete (~22%).
2. Replace mock AI/demo-mode and mock Stripe happy paths with shippable real integrations/evidence, or record explicit Jason approval for any mock exception.
3. Re-run full build/test/live/browser acceptance and update RC.md / NEXT_STEP.md / TASK_META.json before resubmission.

## must_not_do
- Do not resubmit a partial/MVP/mock-only preview as final product.
- Do not use C:\WORK or /mnt/c/WORK as acceptance entry.
- Do not write review.rejected/review.done into next_event.

## resubmit_condition
Submit only when full-product acceptance gates are closed, no active mock-only final blockers remain, and truth pack status is pending_review with next_agent=simon and next_event=build.ready.
