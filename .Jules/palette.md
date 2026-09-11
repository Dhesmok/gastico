## 2025-05-18 - ARIA Labels on Title-Only Icon Buttons
**Learning:** Icon buttons with `title` attributes (like action buttons or close icons) still lack accessible names in screen readers if `aria-label` is not explicitly provided.
**Action:** Always pair icon-only interactive elements (`button`, `input[type="file"]`) with explicit `aria-label` attributes even when `title` or visual icons are present.
