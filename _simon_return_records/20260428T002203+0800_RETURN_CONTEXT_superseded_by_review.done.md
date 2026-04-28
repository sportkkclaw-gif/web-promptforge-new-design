# RETURN_CONTEXT — 20260427_ai_promptforge_new_design_plan_mockups

returned_at: 2026-04-28T00:16:45+08:00
returned_by: Simon / 蘇橫
verdict: returned_for_fix
review_event: review.rejected
reason: Source truth-pack build.ready wrong-entry; formal 03 pending_review deliverable missing.
current_lane: 04_打回修改/sebastian
next_agent: sebastian
next_event: null

## must-fix
1. 重新送驗時必須建立正式待驗收實體資料夾：/home/sport/WORK/AGENTS/03_待驗收/sebastian/20260427_ai_promptforge_new_design_plan_mockups；build.ready payload 的 task_path 必須指向該正式 03 路徑，不可指向 01_選題池/sophie_research。
2. 交付內容必須是可執行 MVP 成品，不得只有 Sophie 規劃文件；至少需包含 Web/App 專案入口、package.json 或等價啟動/建置設定、實作頁面/API/seed/templates。
3. RC.md、NEXT_STEP.md、TASK_META.json current header 必須一致：status=pending_review、current_lane=03_待驗收、next_agent=simon、next_event=null；review.done/review.rejected 只能放 review_event/verdict/history，禁止放 next_event。
4. 補齊 build/test/可操作證據：安裝依賴、lint/test/build 結果、production next start 或等價 live route probe；若部分測試不可跑，需寫明等價驗證與阻塞原因。
5. 重新送 build.ready 前，TASK_META.webhook_deliveries 必須記錄新的 build.ready delivery id、revision、sent_at、http_status。

## must-not-do
1. 不得再用 01_選題池/Sophie source truth pack 直接送 Simon 驗收。
2. 不得以 plan.ready、開發案、mockup、規格書當成 build.ready 成品。
3. 不得把 review.done 或 review.rejected 寫入 next_event；next_event 只能是 topic.created/plan.ready/build.ready/null。
4. 不得寫入或要求使用者從 C:\WORK、/mnt/c/WORK、Desktop、Downloads、OneDrive 桌面驗收。
5. 不得偏離已核准產品邊界：不做站內圖片生成、圖片社群、企業級 PromptOps/LLMOps。

## resubmit condition
1. 正式 03_待驗收/sebastian task folder 存在且包含可執行交付物。
2. truth pack 三件套 current status 全部一致並指向 Simon pending_review。
3. build/test/live probe 證據寫入 RC.md/TASK_META.json。
4. 新 build.ready webhook delivery 成功，payload task_path 指向正式 03 路徑。

## Simon evidence
- formal 03 path checked: `/home/sport/WORK/AGENTS/03_待驗收/sebastian/20260427_ai_promptforge_new_design_plan_mockups` -> missing
- source payload path: `/home/sport/WORK/AGENTS/01_選題池/sophie_research/20260427_ai_promptforge_new_design_plan_mockups` -> non-formal for Simon acceptance
- live returned path: `/home/sport/WORK/AGENTS/04_打回修改/sebastian/20260427_ai_promptforge_new_design_plan_mockups`
- implementation markers found: ['app/page.tsx', 'next.config.mjs', 'package.json']
- planning files found: []
- pollutant scan found=0, cleaned=0
- D report: `/mnt/d/WORK/成品區/_驗收報告/Simon/20260427_ai_promptforge_new_design_plan_mockups/20260428T001645+0800_20260427_ai_promptforge_new_design_plan_mockups_review.rejected.md`
