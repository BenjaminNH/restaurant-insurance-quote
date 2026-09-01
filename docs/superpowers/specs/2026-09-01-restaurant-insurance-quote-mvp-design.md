# Restaurant Insurance Quote MVP Design

## 1. Status

- Status: Approved
- Approved on: 2026-09-01
- Rule version: `mvp-1.1`
- Delivery target: Mobile-first, statically exported MVP

## 2. Goal

Build a standalone mobile insurance estimator for a single restaurant location. A customer selects public liability insurance, food safety liability insurance, employers' liability insurance, or any combination of the three; completes only the steps relevant to those products; and receives an estimated annual premium or a clear non-standard outcome.

The estimator supports early consultation only. It does not perform underwriting, bind coverage, issue a policy, or save a formal quotation.

## 3. Confirmed Product Decisions

1. The Markdown business rules and `docs/餐饮保险报价器-MVP规则.json` are the business source of truth. Pencil is the visual and interaction reference when it does not conflict with those rules.
2. The employers' liability plan names are 基础版、升级版、尊享版 and 臻享版.
3. Fewer than eight covered employees produces `NOT_ELIGIBLE`. It does not produce an automatic premium and does not move to manual quotation.
4. The food safety document prompt uses 食品生产许可证.
5. The MVP accepts one restaurant location only. It has one business-area input and no store-count, add-store, or per-store editing interface.
6. Employers' liability includes an explicit yes/no input asking whether all covered employees are between 16 and 65 years old, inclusive.
7. Partial quotation is allowed. Known premiums may be shown as a subtotal, but a complete final premium must not be shown when one or more selected products cannot be automatically quoted.
8. Non-happy-path screens may be designed during implementation by following the established Pencil visual language. Their business meaning and displayed amounts must follow the rule source of truth.
9. Employee-specific configuration, employee routes, authentication, lead capture, a database, and an admin interface are outside the MVP. The code will retain a narrow configuration seam for adding an employee or sales-contact context later.
10. The project is an independent Git repository rooted in the current directory.

## 4. Scope

### 4.1 Included

- One restaurant location with a decimal business-area input greater than zero.
- Independent selection of the three supported insurance products.
- Four public liability plans.
- Three food safety liability plans.
- Four employers' liability plans.
- Employers' liability headcount by the three rule-defined role groups.
- Employers' liability minimum-headcount and age-eligibility checks.
- Versioned rule loading and validation.
- Automatic, ineligible, manual, partial-manual, and missing-input outcomes.
- Annual premium detail, known subtotal, final total when valid, coverage highlights, document prompts, disclaimer, and contact action.
- Draft recovery with `sessionStorage`.
- Static export with no platform-specific runtime dependency.
- Automated unit and browser-flow tests.

### 4.2 Excluded

- Multiple restaurant locations in one quotation.
- Employee-specific public URLs such as `/e/[employeeSlug]`.
- Employee or administrator authentication.
- Customer contact capture and persistence.
- Databases, server actions, runtime route handlers, or hosted functions.
- Formal underwriting, policy issuance, payment, discounts, tax, commission, regional adjustments, or minimum premiums.
- Collection of employee names, identity numbers, exact ages, or per-person job records.

## 5. Architecture

Use a modular single-page wizard in a Next.js App Router application. React Hook Form owns the quotation draft, Zod validates user input and rule configuration, and a pure TypeScript calculation module produces the complete result model. Tailwind CSS and CSS variables implement the Pencil visual language.

The UI never contains premium rates, area boundaries, or underwriting outcomes. It renders typed rule data and calculator results. The calculator has no React, browser, network, storage, or database dependency.

The application uses `output: "export"` and must build to `out/`. Fonts and important assets are hosted locally, and image handling must not require a server-side optimizer.

## 6. Proposed File Boundaries

```text
src/
  app/
    globals.css
    layout.tsx
    page.tsx
  config/
    quote-rules/
      mvp-1.1.json
    site.ts
  features/
    quote/
      calculator/
        calculate-employers-liability.ts
        calculate-food-liability.ts
        calculate-public-liability.ts
        calculate-quote.ts
        match-area-band.ts
        money.ts
      components/
        employee-count-input.tsx
        manual-quote-card.tsx
        plan-selector.tsx
        product-selector.tsx
        quote-header.tsx
        quote-progress.tsx
        quote-result-view.tsx
        quote-wizard.tsx
        sales-contact-action.tsx
        sticky-summary.tsx
      schemas/
        quote-input-schema.ts
        quote-rules-schema.ts
      state/
        quote-draft-storage.ts
        quote-step-flow.ts
      steps/
        employee-info-step.tsx
        employer-plan-step.tsx
        liability-plans-step.tsx
        quote-result-step.tsx
        store-and-products-step.tsx
      types/
        quote-input.ts
        quote-result.ts
        quote-rules.ts
tests/
  e2e/
  fixtures/
  unit/
```

Each calculator file handles one product or one shared calculation concern. Step components handle form interaction only. Shared components express the visual system without owning business decisions. Storage and dynamic step selection are isolated from both calculation and presentation.

## 7. Wizard Flow

The conceptual flow contains five possible screens, but only relevant screens are included in a particular run.

1. **门店与险种:** Enter one business area and select one or more products.
2. **雇主险档位:** Include only when employers' liability is selected.
3. **员工信息:** Include only when employers' liability is selected. Enter counts for the three supported role groups and answer the age-eligibility question.
4. **公众与食责方案:** Include when public liability or food safety liability is selected, showing only selected product groups.
5. **报价结果:** Calculate and present the outcome.

Progress is computed from the active step list. A public-liability-only quotation therefore has three displayed steps: 门店与险种, 公众与食责方案, and 报价结果. Returning to an earlier step preserves valid input. Removing a product clears or ignores its downstream selections and premiums.

## 8. Input Model and Validation

The quotation input contains:

- Selected products: a non-empty set.
- Business area: decimal number greater than zero.
- Public liability plan: required only when that product is selected.
- Food safety liability plan: required only when that product is selected.
- Employers' liability plan: required only when that product is selected.
- Counts for BACK_OFFICE_OR_CASHIER, WAITER, and CHEF_OR_CLEANER: non-negative integers required when employers' liability is selected.
- Age eligibility: explicit boolean required when employers' liability is selected.

Every visible control has a persistent label, an associated error message, and a mobile-appropriate input mode. Headcounts can be typed directly even if increment and decrement buttons are also provided.

## 9. Calculation and Status Semantics

Each selected product produces its own result item. The aggregate result contains:

```ts
type QuoteStatus =
  | "QUOTED"
  | "NOT_ELIGIBLE"
  | "MANUAL_QUOTE"
  | "PARTIAL_MANUAL"
  | "MISSING_INPUT"

type QuoteResult = {
  status: QuoteStatus
  ruleVersion: string
  items: QuoteItem[]
  knownSubtotal: number | null
  totalPremium: number | null
}
```

Calculation order is deterministic:

1. Reject incomplete inputs with `MISSING_INPUT`.
2. For employers' liability, calculate total headcount first.
3. If total headcount is below eight, return `NOT_ELIGIBLE` for that product without evaluating age for a price.
4. If headcount is eligible but the age answer is false, return `MANUAL_QUOTE` for employers' liability.
5. Match public and food liability area bands without rounding the input first.
6. Calculate every selected product independently.
7. Aggregate product results.

Aggregate behavior:

- All selected products are quoted: overall `QUOTED`, `knownSubtotal` and `totalPremium` contain the same complete amount.
- One or more products require manual quotation and at least one product is quoted: overall `PARTIAL_MANUAL`, `knownSubtotal` contains quoted items, and `totalPremium` is `null`.
- Every selected product requires manual quotation: overall `MANUAL_QUOTE`, with no final total.
- Employers' liability is not eligible: overall `NOT_ELIGIBLE`; other automatically calculated products may remain visible as a known subtotal, but `totalPremium` is `null` because the requested selection was not fully quotable.
- Missing required data: overall `MISSING_INPUT`; the wizard remains on the relevant input step instead of presenting a result page.

Premium display rounds half up to whole CNY only at the defined final display boundary. Calculations retain the rule-defined numeric precision until then.

## 10. Draft Persistence

The form draft is stored in `sessionStorage` under a versioned key. The stored envelope contains a draft schema version, rule version, timestamp, and form values. Invalid, incompatible, or corrupted drafts are discarded safely and the user receives a non-blocking message.

No formal quote, customer personal information, or authoritative premium record is persisted. A future server-backed version must validate input and recalculate from the saved rule version rather than trusting a client result.

## 11. Employee-Configuration Extension Seam

The MVP exposes only the root quotation page. Sales contact rendering is isolated in `sales-contact-action.tsx`, and its default public data comes from `src/config/site.ts`. The wizard may receive a small public context object containing a source identifier and display-safe contact configuration.

A later `/e/[employeeSlug]` route can resolve an enabled employee profile and pass that same context to the existing wizard. It must not copy the wizard, step components, schemas, or calculator. No employee registry, dynamic route, authentication, or database abstraction is implemented in this MVP.

## 12. UI and Error Handling

The current Pencil frames define the visual baseline: dark navy text, green primary actions, light blue informational surfaces, outlined cards, mobile-first spacing, and a sticky bottom summary/action area. The implementation may create missing states in that language without modifying `docs/design.pen`.

Required non-happy-path presentations include:

- Inline field validation.
- Fewer-than-eight-employees non-eligibility.
- Age-based manual quotation.
- Public or food liability area-based manual quotation.
- Partial quotation with known subtotal and no final total.
- Invalid saved draft recovery.
- Rule configuration failure with a safe unavailable state rather than a guessed quote.

Business errors are never hidden behind a generic failure message. Technical failures never produce a premium.

## 13. Testing Strategy

### 13.1 Unit Tests

- Validate a correct rule file and reject malformed plans or area bands.
- Public liability boundaries: 99.99, 100, 499.99, 500, 999.99, 1000, 2999.99, and 3000.
- Food safety boundaries: 99.99, 100, 499.99, 500, 999.99, 1000, 1999.99, and 2000.
- Employers' liability: seven, eight, and nine people; each plan and role rate; false age confirmation.
- Status aggregation for fully quoted, not eligible, fully manual, and partial-manual selections.
- Confirmed examples: CNY 5,432 from the rule document and CNY 3,984 from the approved happy-path design.
- Whole-yuan rounding behavior.

### 13.2 Browser Tests

- Public-only, food-only, employer-only, two-product, and three-product flows.
- Dynamic step count and skipped conditional steps.
- Back navigation and downstream-value invalidation.
- Refresh recovery from a valid draft and safe recovery from a corrupt draft.
- Inline error focus and keyboard-accessible controls.
- Mobile viewports, sticky footer, scrolling, and bottom safe-area behavior.
- Normal, not-eligible, manual, and partial-manual result presentations.

### 13.3 Build Verification

- Lint, TypeScript checking, unit tests, and browser tests pass.
- `pnpm build` creates `out/` without a server runtime.
- The exported application completes a quote when served by a generic static file server.
- Fonts, icons, and required assets do not depend on inaccessible third-party CDNs.

## 14. Delivery and Version-Control Policy

Implementation proceeds in test-driven, independently verifiable slices. Commits use English and remain narrowly scoped: repository/tooling setup, rule schema, calculation engine, wizard state, individual UI stages, result states, persistence, and end-to-end verification.

The implementation must preserve `docs/design.pen`, the approved Markdown business rules, the source JSON rule file, and unrelated user files. Any later rule change requires a new rule version or an explicitly approved correction plus matching tests.

