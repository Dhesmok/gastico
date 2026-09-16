# Palette's Journal - UX & Accessibility Learnings

## 2025-05-18 - Dialog Modal Accessibility in CategorySheet
**Learning:** Bottom sheet modal dialogs and picker options need explicit `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and `aria-pressed` attributes so screen readers accurately identify modal contexts and active category states.
**Action:** Ensure all interactive modal dialogs and toggle options in picker components include appropriate ARIA dialog structure and selection attributes.
