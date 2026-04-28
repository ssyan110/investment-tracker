# Apex Investment Tracker - Design Specification

This document provides a comprehensive design system and specification for the Apex Investment Tracker. This specification is designed to be fed into an AI coding agent or handed to a developer to implement the design system accurately.

## 1. Core Philosophy

- **Aesthetic:** Modern, premium financial dashboard.
- **Theme:** True Dark Mode with Glassmorphism (frosted glass) panels.
- **Accents:** High-contrast neon colors for data and actions (Neon Green for positive/actions, Red for negative, Light Blue for brand/accents).
- **Typography:** Clean, sans-serif (Inter) for maximum readability of numbers and data.

---

## 2. Design Tokens (CSS Variables)

Implement these variables globally in your `:root` or main stylesheet to ensure consistency.

```css
:root {
  /* Backgrounds */
  --bg-color: #0f172a; /* Slate 900 - Main app background */
  
  /* Glassmorphism Panels */
  --panel-bg: rgba(30, 41, 59, 0.7); /* Slate 800 with 70% opacity */
  --panel-border: rgba(255, 255, 255, 0.08); /* Very subtle white border for glass edge */
  
  /* Typography */
  --text-main: #f8fafc; /* Slate 50 - Primary text */
  --text-muted: #94a3b8; /* Slate 400 - Secondary text, labels, table headers */
  
  /* Accent Colors */
  --accent-neon: #34d399; /* Emerald 400 - Positive numbers, Primary Actions (Buy, Submit) */
  --accent-red: #f87171; /* Red 400 - Negative numbers, Sell actions */
  --accent-blue: #38bdf8; /* Sky 400 - Brand logo, active navigation, charts */
  --accent-purple: #8b5cf6; /* Violet 500 - Chart data variance */
  
  /* Layout */
  --sidebar-w: 260px;
  --border-radius-sm: 8px;
  --border-radius-md: 16px;
  --border-radius-pill: 30px;
}
```

---

## 3. Typography Rules

- **Font Family:** `Inter`, sans-serif (or `SF Pro Display` on Apple devices).
- **Font Weights:**
  - `400` (Regular) for standard text.
  - `500` (Medium) for navigation items and table headers.
  - `600` (Semi-Bold) for component titles and buttons.
  - `700` (Bold) for the main portfolio value and logo.
- **Sizes:**
  - Main Portfolio Value: `40px` to `48px`
  - Component Titles: `16px`
  - Body/Table Text: `14px`
  - Metadata/Labels: `12px` (Uppercase, with slight letter-spacing `0.5px`)

---

## 4. Component Styles

### Glassmorphism Utility
All cards, sidebars, and modals should use this effect:
```css
.glass {
  background: var(--panel-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px); /* Safari support */
  border: 1px solid var(--panel-border);
  border-radius: var(--border-radius-md);
}
```

### Background Detail
To add depth to the dark mode, apply a subtle radial gradient to the main `body` background behind the glass panels:
```css
body {
  background-color: var(--bg-color);
  background-image: 
    radial-gradient(circle at 15% 50%, rgba(56, 189, 248, 0.08), transparent 25%),
    radial-gradient(circle at 85% 30%, rgba(52, 211, 153, 0.08), transparent 25%);
}
```

### Form Controls (Inputs, Selects, Textareas)
- **Background:** `rgba(0,0,0,0.2)` (Darker inset feel inside the glass panel)
- **Border:** `1px solid var(--panel-border)`
- **Border Radius:** `8px`
- **Focus State:** `border-color: var(--accent-neon)` with no default outline.

### Primary Action Button (FAB & Submit)
- **Background:** `var(--accent-neon)`
- **Text Color:** `#000` (Black for maximum contrast against neon green)
- **Font Weight:** `600`
- **Border Radius:** `8px` for standard buttons, `30px` for the Floating Action Button.
- **Hover State:** Slight `transform: translateY(-2px)` and box-shadow.

---

## 5. Reference Mockups

Use these images as visual targets for layout, spacing, and sizing.

### Desktop Dashboard View
![Dashboard Design](/Users/ssyan110/.gemini/antigravity/brain/3c4a30fc-5177-4ea1-8c1f-4e0a71eb579f/investment_dashboard_desktop_1777377049956.png)

### Quick Trade Modal View
![Quick Trade Modal](/Users/ssyan110/.gemini/antigravity/brain/3c4a30fc-5177-4ea1-8c1f-4e0a71eb579f/investment_trade_modal_1777377074471.png)

---

## Instructions for the Implementing Agent:
1. **Analyze:** Review the CSS variables and typography rules above.
2. **Translate:** Convert these tokens into your framework of choice (e.g., Tailwind config, Styled Components, or standard CSS files).
3. **Refactor:** Target the existing codebase structure (Sidebar, Main Dashboard, Holding Table) and apply the `glass` utility class and updated variable colors.
4. **Iterate:** Use the provided reference images to adjust paddings, margins, and border radii until the UI matches the visual target.
