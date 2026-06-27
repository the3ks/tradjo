# Trading Journal UI Design Guidelines

These guidelines apply the installed `taste-skill` guidance to this specific product. The skill is strongest for landing pages, portfolios, and redesigns, while this project is a dense trading journal app with dashboards, tables, forms, and multi-step workflows. Use its anti-slop checks, but keep the interface practical and product-focused.

## Design Read

Reading this as: a personal trading operations app for active traders, with a calm, data-dense SaaS language, leaning toward customized shadcn/ui on Tailwind plus strong table, form, and dashboard patterns.

## Product UI Dials

- `DESIGN_VARIANCE: 4`
- `MOTION_INTENSITY: 3`
- `VISUAL_DENSITY: 7`

Reasoning:

- The app needs fast scanning, repeat use, and trustworthy financial data, not a marketing-page composition.
- Motion should provide state feedback and orientation only.
- Data views should be compact, but not cramped on mobile.

## Stack Impact

The original roadmap stack is still suitable with these refinements:

- Keep Next.js App Router, React, TypeScript, MariaDB, Prisma, Auth.js, Tailwind, shadcn/ui, TanStack Query, React Hook Form, Zod, and Recharts.
- Add TanStack Table for trade lists, order/fill history, sync logs, and other serious data tables.
- Treat shadcn/ui as owned source code, not a default theme. Customize tokens, spacing, radii, typography, tables, empty states, and forms.
- Use one icon family throughout the app. Follow the project implementation convention when one is established.
- Keep animation light. Use CSS transitions or Motion only for meaningful feedback, route transitions, disclosure panels, and loading skeletons.

No stack change to Fluent UI, Carbon, or Material is required unless the product direction shifts toward enterprise admin software, regulated institutional workflows, or a strict external design system.

## Visual System

- Use one neutral palette and one accent color across the app.
- Avoid generic AI-purple gradients and glow-heavy styling.
- Prefer off-white/off-black surfaces over pure `#fff` and `#000`.
- Define semantic tokens for background, surface, elevated surface, text, muted text, border, accent, profit, loss, warning, and danger.
- Keep radius rules consistent. Suggested MVP rule:
  - Buttons and inputs: 8px
  - Repeated cards: 8px
  - Modals and larger panels: 12px
  - Pills/chips: full radius
- Use cards only where they clarify repeated entities or contained tools. Prefer tables, sections, dividers, and whitespace for dense app surfaces.

## Typography

- Avoid defaulting to Inter unless there is a deliberate reason.
- Prefer a clean sans family such as Geist or similar, with a mono font for numbers and technical metadata.
- Use tabular numbers for P&L, prices, fees, quantities, and dashboard metrics.
- Keep dashboard and table headings compact. Do not use landing-page-scale typography inside app panels.

## Navigation and Layout

- Desktop: compact sidebar or top/sidebar hybrid optimized for repeated use.
- Mobile: bottom navigation for Dashboard, Collections, Trades, Sync, and Settings.
- Avoid wide desktop tables on mobile. Use cards, accordions, or compact stacked rows.
- Use stable layout dimensions for tables, metric cards, toolbars, filters, and trade cards to prevent jumping during loading and filtering.
- Avoid `h-screen`; use `min-h-[100dvh]` when full-height layouts are needed.

## Forms

- Labels must sit above inputs.
- Never use placeholder text as the only label.
- Helper text is allowed but should be concise.
- Inline validation errors should appear below the field.
- Provide loading, success, error, and disabled states for every mutation.
- Use sticky save actions for long mobile journal forms.

## Tables and Data Views

- Use TanStack Table for sortable/filterable desktop data.
- Use card or stacked-row alternatives under mobile breakpoints.
- Use skeletons matching final table/card geometry while loading.
- Show clear empty states with the next action.
- Use compact monospace number treatment for financial values.
- Profit/loss color must be consistent and accessible in light and dark modes.

## Motion

- Use motion only when it communicates feedback, hierarchy, or state change.
- Respect `prefers-reduced-motion`.
- Animate only transform and opacity.
- Do not use scroll hijacking, parallax, or decorative page motion in the app shell.
- Avoid `window.addEventListener("scroll")` for UI animation.

## Dashboard Rules

- Make metrics scannable before decorative.
- Avoid fake precision or invented benchmark numbers.
- Charts must be readable on mobile and must reserve layout space before rendering.
- Empty dashboard states should explain how to get data: connect BingX, configure a collection, sync trades.
- Use responsive filters that collapse cleanly on small screens.

## Screenshot Handling

- Screenshot uploads are product content, not decorative assets.
- Show real uploaded images with stable aspect-ratio containers.
- Do not create fake chart or trade screenshots as placeholders.
- Use clear upload, preview, replace, caption, and delete states.

## Pre-Flight UI Checklist

Before considering a UI surface done:

- The surface works in desktop and mobile viewports.
- Light and dark modes have readable contrast.
- Loading, empty, error, and success states exist.
- Buttons and form controls have clear hover, focus, disabled, and active states.
- Text fits inside buttons, chips, cards, and nav items.
- No generic landing-page sections were used inside the app.
- No fake product previews, fake logos, fake testimonials, or invented precision metrics were added.
- Tables are not forced onto mobile screens.
- User-scoped data boundaries are reflected in UI states and API calls.
- Motion is meaningful and reduced-motion safe.
