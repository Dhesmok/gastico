## 2026-09-13 - Modal Dialog & Bottom Nav Accessibility Patterns
**Learning:** Custom modal overlays in this project lacked `Escape` key listeners and ARIA dialog properties (`role="dialog"`, `aria-modal="true"`), preventing screen readers and keyboard users from navigating modals predictably. Icon-only buttons (close X and camera upload) lacked `aria-label`s.
**Action:** Always pair custom dialog overlays with `Escape` keyboard shortcuts, ARIA modal attributes, and explicit `aria-label` attributes for icon-only action buttons.
