# Palette's Journal

## 2025-05-18 - Accessibility on Icon-Only Input Action Buttons
**Learning:** Icon-only buttons used inside interactive chat inputs (e.g. upload camera buttons) often rely only on visual tooltips (`title`), missing critical `aria-label` attributes for screen readers.
**Action:** Always ensure icon-only buttons receive an explicit `aria-label` attribute describing their action alongside any visual tooltips.
