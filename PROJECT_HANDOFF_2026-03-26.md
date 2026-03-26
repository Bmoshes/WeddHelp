# WeddHelp Handoff - 2026-03-26

## File purpose
This file is the single source of truth for the current project state at the end of this session.
Use it tomorrow before making more changes.

## Recommended filename
`PROJECT_HANDOFF_2026-03-26.md`

## Current project state

### General
- Frontend: React + TypeScript
- Backend: Express + MongoDB
- Main product areas currently in use:
  - dashboard
  - invitations
  - guests
  - seating
  - tasks
  - budget

### What was verified in code today

#### Seating
- Proximity seating mode exists and is wired into the backend.
- Knight table group selection exists from imported relationship groups.
- Manual seating edits exist:
  - remove guest from table
  - unseated pool
  - drag guest between tables and unseated pool
- Drag overlay was moved to a portal so it stays above the layout.
- Seating tables display seat counts using `amount`.
- Guest cards in seating display `amount` when greater than 1.

#### Tasks
- `TasksPage` now uses local state updates instead of full `load()` on every mutation.
- There is scroll-lock logic in task toggle:
  - `useLayoutEffect`
  - `scrollLockRef`
  - restore `window.scrollTo(0, savedY)`
- `requiresPayment` exists in:
  - frontend types
  - backend Task schema
  - validators
  - task templates
- Backend task payment logic now uses shared `isPaymentTask(task)` with:
  - `requiresPayment === true`
  - `category === 'vendors'`
  - `category === 'attire'`
- This closes the old backend gap for legacy attire tasks such as `חליפת חתן`.

#### Budget
- Budget entries now support:
  - `remainingCashAmount`
  - `remainingCreditAmount`
  - `remainingBankTransferAmount`
  - `paymentProofs`
- Receipt/proof upload exists in backend and frontend.
- Static uploads route exists: `/uploads`
- Budget page was rewritten to show:
  - planned total
  - paid total
  - remaining total
  - remaining by cash / credit / bank transfer
  - proof thumbnails
- Cross-field validation now exists:
  - frontend validation before save
  - backend Zod `superRefine`
- Enforced rule:
  - `cash + credit + bank <= max(0, plannedCost - actualCost)`

#### Dashboard
- Dashboard top stat cards were visually redesigned.
- Days-until-wedding card exists.

#### Numeric inputs
- A shared `SmartNumberInput` exists in `src/app/ui.tsx`.
- It was connected to major number-entry screens to avoid the old leading-zero input issue.

## What appears to work well right now
- Budget proof upload/delete flow is present in code.
- Budget remaining-payment breakdown validation is present in code.
- Legacy `attire` tasks are now included in backend payment logic.
- Tasks page no longer relies on full page reload for every toggle.
- Seating drag-and-drop infrastructure is present and significantly more advanced than before.

## What still needs real manual verification
These items were verified in code, but should still be tested in the UI:

- Tasks checkbox scroll:
  - verify again that checking/unchecking a task no longer jumps to top
- Legacy attire task flow:
  - verify `חליפת חתן` shows payment fields
  - verify saving payment creates/updates budget entry
- Budget proof upload:
  - upload image
  - refresh page
  - verify thumbnail persists
- Budget validation:
  - verify invalid breakdown is blocked in UI
  - verify invalid breakdown is rejected by backend
- Seating:
  - verify no table exceeds real seat capacity after import
  - verify drag between unseated and tables still works smoothly after latest changes

## Known weak spots / likely next issues

### 1. Tasks scroll bug
- Code fix exists.
- User reported it still happened before the last change.
- This must be retested manually.
- If it still jumps:
  - inspect checkbox focus behavior
  - inspect label click behavior
  - inspect any parent scroll container behavior

### 2. Budget consistency
- Current validation prevents breakdown total exceeding remaining amount.
- But the system still allows remaining amount to be partially unassigned by design.
- This is acceptable product behavior, but should be confirmed with the user.

### 3. Text encoding / gibberish
- Some files still contain mojibake comments or strings from earlier edits.
- Functional code is mostly intact, but text cleanup may still be needed in some files.

### 4. Budget page create form
- New budget entry form currently focuses mainly on planned cost.
- If future product needs require full entry creation with payment breakdown and proof at creation time, this should be extended.

## Important product rules currently implemented

### Amount / seat count
- Excel `amount` includes the named guest.
- Example:
  - if amount is `1` -> one seat total
  - if amount is `2` -> guest + 1 more person -> two seats total

### Task payment relevance
- Payment-relevant tasks currently include:
  - all `vendors`
  - all `attire`
  - any task with `requiresPayment === true`

### Budget breakdown rule
- Remaining payment method total may not exceed remaining unpaid amount.

## Suggested first checklist for tomorrow
1. Run the app.
2. Retest Tasks checkbox scroll behavior manually.
3. Open an old `חליפת חתן` task and verify full payment -> budget sync.
4. Test Budget proof upload and delete with a real image.
5. Test one invalid budget breakdown case and one valid case.
6. Only after these checks, continue to new features.

## Suggested next feature candidates
- Polish the dashboard lower sections visually.
- Improve task payment UX and status clarity.
- Add stronger receipt/proof management in budget.
- Add explicit payment-status summaries for after-wedding settlement.
- Clean text encoding issues in remaining older files.

## Files most recently relevant
- `src/pages/TasksPage.tsx`
- `src/pages/BudgetPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/SeatingPage.tsx`
- `src/app/ui.tsx`
- `src/app/types.ts`
- `backend/src/routes/task.routes.js`
- `backend/src/routes/budget.routes.js`
- `backend/src/models/Task.js`
- `backend/src/models/Budget.js`
- `backend/src/services/taskTemplateService.js`
- `backend/src/app.js`

## Notes for future review
- Distinguish between:
  - verified in code
  - verified manually in UI
- Do not trust summary-only Claude answers without checking the actual files.
