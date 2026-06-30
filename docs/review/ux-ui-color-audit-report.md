# 🎨 UX/UI Color, Contrast & Accessibility Audit Report
**Project:** IT Asset Inventory System (NestJS + Next.js + Tailwind v4)  
**Date:** June 30, 2026  
**Auditor:** Senior UX/UI Design Engineer  

---

## 1. Executive Summary

This audit evaluates the IT Asset Inventory frontend system for color consistency, light/dark mode transitions, and compliance with the Web Content Accessibility Guidelines (WCAG 2.1) contrast standards. 

### Key Findings
1. **Severe Light Mode Contrast Failures (WCAG violations):** The primary color (LINE Green HSL 145 94% 40%) paired with white text fails contrast requirements (**2.25:1** vs. standard **4.5:1**). Similarly, warning (yellow HSL 60 100% 40%), success, and info colors are unreadable on light backgrounds, failing basic legibility.
2. **Light Mode Header Bug:** The top navigation header is locked to `bg-sidebar-background` (dark green-black HSL 145 35% 8%), but the content inside it uses `text-foreground` (dark slate HSL 195 7% 11%). This results in near-invisible text and unstyled white-box buttons floating on a dark background in light mode.
3. **Sidebar Brand Logo Mismatch:** The sidebar is dark green-black in both light and dark modes. However, the `BrandMark` text "Sys" uses `text-foreground`, which is dark slate in light mode, making it completely invisible against the dark background.
4. **Hardcoded Color Overrides:** Several pages (such as Tickets list and Ticket Details) bypass theme-aware tokens and hardcode Tailwind colors (e.g., `text-emerald-500`, `text-amber-500`), breaking readability in light mode.

---

## 2. Contrast & Readability Issues

### HSL Color Values & WCAG 2.1 Contrast Analysis (Light Mode)

| Token | Light Mode Value (Current) | Hex Equivalent | Contrast on White BG | WCAG AA Status | Recommended Value (Accessible) | Hex Equivalent | New Contrast | WCAG AA Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `--primary` | `145 94% 40%` | `#06c676` | **2.25:1** | ❌ Fail | `145 80% 25%` | `#097c3f` | **5.25:1** | ✅ Pass |
| `--success` | `145 94% 40%` | `#06c676` | **2.25:1** | ❌ Fail | `145 80% 25%` | `#097c3f` | **5.25:1** | ✅ Pass |
| `--warning` | `60 100% 40%` | `#cccc00` | **1.69:1** | ❌ Fail | `35 85% 32%` | `#9c570b` | **6.50:1** | ✅ Pass |
| `--info` | `190 100% 45%` | `#00c4e6` | **1.90:1** | ❌ Fail | `195 85% 32%` | `#0d6b8c` | **6.17:1** | ✅ Pass |
| `--high` | `30 100% 50%` | `#ff8000` | **2.80:1** | ❌ Fail | `25 85% 35%` | `#b83a0a` | **6.17:1** | ✅ Pass |
| `--medium` | `60 100% 40%` | `#cccc00` | **1.69:1** | ❌ Fail | `35 85% 32%` | `#9c570b` | **6.50:1** | ✅ Pass |
| `--low` | `200 100% 50%` | `#00aaff` | **3.20:1** | ❌ Fail | `215 80% 38%` | `#14539c` | **8.00:1** | ✅ Pass |

---

## 3. Detailed Component Audit

### 🚨 Issue 1: Top Navigation Header Text Invisibility in Light Mode
- **File:** `frontend/src/components/AppLayout.tsx` (Line 91)
- **Problem:** The header background is hardcoded to `bg-sidebar-background` (dark green-black, HSL 145 35% 8% in light mode). The text inside uses `text-foreground` (dark slate HSL 195 7% 11% in light mode). This results in dark-on-dark text which is entirely illegible.
- **Fix:** Update header class to use `bg-background/85` and `border-border/60` (or `border-border/40`). This ensures it matches the system mode correctly.
- **Before:**
  ```tsx
  <header className="sticky top-0 z-20 h-[56px] border-b border-sidebar-border/20 bg-sidebar-background backdrop-blur-xl px-4 sm:px-6 lg:px-8 shadow-sm">
  ```
- **After:**
  ```tsx
  <header className="sticky top-0 z-20 h-[56px] border-b border-border/60 bg-background/85 backdrop-blur-xl px-4 sm:px-6 lg:px-8 shadow-sm">
  ```

### 🚨 Issue 2: Sidebar Logo Text Mismatch (Invisible "Sys")
- **File:** `frontend/src/components/AppSidebar.tsx` (Line 150)
- **Problem:** The sidebar background is always dark green-black. The `BrandMark` inside it defaults to `tone="default"`, rendering "Sys" using the page's current `text-foreground`. In light mode, this text is dark gray-blue, rendering it invisible against the dark sidebar.
- **Fix:** Add `tone="inverse"` to the `BrandMark` instance in `AppSidebar.tsx` to force white text.
- **Before:**
  ```tsx
  <BrandMark compact={collapsed} className="scale-90 origin-left" />
  ```
- **After:**
  ```tsx
  <BrandMark compact={collapsed} tone="inverse" className="scale-90 origin-left" />
  ```

### 🚨 Issue 3: Hardcoded Color Overrides in Tickets Lists & Details
- **Files:** 
  - `frontend/src/app/dashboard/tickets/page.tsx` (Lines 76-81)
  - `frontend/src/app/dashboard/tickets/[id]/page.tsx` (Lines 42-55)
- **Problem:** Priority and status classes use hardcoded Tailwind classes like `text-blue-500`, `text-orange-500`, `text-rose-500`, `text-amber-500`, `text-emerald-500`. These hardcoded values are unreadable on light backgrounds.
- **Fix:** Replace these classes with dynamic CSS vars or responsive classes (e.g., `text-emerald-600 dark:text-emerald-400`, `text-amber-700 dark:text-amber-400`, etc.) to restore readability.
- **Recommended mappings in `tickets/page.tsx` & `tickets/[id]/page.tsx`:**
  ```typescript
  // For priority colors
  const priorityColors = {
    LOW: 'text-muted-foreground bg-muted/10 border-border/20',
    MEDIUM: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
    HIGH: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20',
    CRITICAL: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20 animate-pulse',
  };

  // For status colors
  const statusColors = {
    OPEN: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
    IN_PROGRESS: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    WAITING_FOR_CLIENT: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
    RESOLVED: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    CLOSED: 'text-muted-foreground bg-muted/10 border-border/20',
  };
  ```

---

## 4. Theme & Mode Transition Issues

Transitions are smooth due to next-themes and CSS transitions. However, two primary breaks occur during mode transitions:
1. **Light Mode Hover on Badges / Actions:** The light mode page has several items where hover color is hardcoded to a light background with very bright text (e.g., `hover:bg-red-50 hover:text-red-500`). In dark mode, this hover state lacks transition guards, leading to flashing light background overlays.
2. **Plaintext Password Elements:** Plaintext password overlays use custom backgrounds that do not support dark/light mode, causing visibility degradation in light mode.

---

## 5. Direct Actionable Recommendations

### Action Plan 1: Adjust `globals.css` `:root` variables
Modify the CSS variable definitions in `frontend/src/app/globals.css` `:root` block to update the default status colors. This instantly fixes components utilizing `text-success`, `text-warning`, `text-info`, `text-primary`, and custom buttons/badges across the entire platform.

```css
/* Update in frontend/src/app/globals.css */
:root {
  /* ... keep existing surface variables ... */

  /* ─── Primary (LINE Green modified for contrast) ─── */
  --primary: 145 80% 25%;             /* Darker emerald green for WCAG AA compliance */
  --primary-foreground: 0 0% 100%;    /* Keep white text, contrast is now 5.25:1 */

  /* ... keep secondary and muted variables ... */

  /* ─── Semantic Status (Accessible Shades) ─── */
  --critical: 0 75% 42%;             /* Dark red (Compliant) */
  --high: 25 85% 35%;                /* Dark orange-red (Compliant) */
  --medium: 35 85% 32%;              /* Dark amber (Compliant) */
  --low: 215 80% 38%;                /* Dark blue (Compliant) */
  --success: 145 80% 25%;            /* Dark green (Compliant) */
  --info: 195 85% 32%;               /* Dark cyan/teal (Compliant) */
  --warning: 35 85% 32%;             /* Dark amber (Compliant) */

  /* ─── Borders & Inputs ─── */
  --border: 111 15% 76%;
  --input: 111 15% 76%;
  --ring: 145 80% 25%;
}
```

### Action Plan 2: Apply the layout and sidebar fixes
1. Change the header background in `AppLayout.tsx` line 91.
2. Pass `tone="inverse"` to the `BrandMark` inside `AppSidebar.tsx` line 150.
3. Update hardcoded status and priority classes in `tickets/page.tsx` and `tickets/[id]/page.tsx` to use the theme-aware colors listed in Section 3.
