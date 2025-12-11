# Community Kitchen App - Design Guide

## 🎨 Design Philosophy

This Community Kitchen app embraces a **classic retro aesthetic** with warm, welcoming tones that evoke community, nourishment, and simplicity. Inspired by Gumroad's clean, no-nonsense approach, we prioritize **clarity, functionality, and timeless design** over trendy effects.

---

## Color Palette

### Primary Colors

```
Golden (Primary Action)
- #D4AF37 (Main Golden)
- #C5A028 (Hover/Active State)
- #E5C158 (Light/Disabled State)
- #8B7500 (Dark Accent)
```

```
Green (Success/Fresh)
- #2D5016 (Dark Forest Green - Primary)
- #3D6B1F (Medium Green - Hover)
- #4A7C2A (Lighter Green - Active)
- #8FBC8F (Pale Green - Backgrounds)
```

```
Ivory (Backgrounds)
- #FFFFF0 (Ivory - Main Background)
- #FAF8F3 (Warm Ivory - Card Background)
- #F5F3ED (Darker Ivory - Section Dividers)
- #EBE8DC (Border/Subtle Dividers)
```

```
Black (Text/Borders)
- #1A1A1A (Primary Text)
- #2D2D2D (Secondary Text)
- #4A4A4A (Tertiary Text/Subtle)
- #000000 (Pure Black - Reserved for emphasis)
```

### Color Usage Guidelines

- **Golden**: Primary CTAs, icons, active states, highlights
- **Green**: Success messages, "in stock" indicators, add buttons, fresh produce tags
- **Ivory**: All backgrounds, cards, modal overlays
- **Black**: All text, borders, icons (when not golden/green)

### Accent Colors (Use Sparingly)

While our primary palette is Golden, Green, Ivory, and Black, **accent colors may be used sparingly** for specific purposes:

```
Red (Errors/Urgent)
- #8B3A3A (Error Text)
- #C84B4B (Error Borders/Backgrounds)
- Use for: Error messages, delete actions, urgent alerts, out-of-stock items

Blue (Information)
- #2B5F8F (Info Blue)
- #3A7FBF (Lighter Info)
- Use for: Informational messages, optional actions, links in specific contexts

Orange (Warning)
- #CC7A2D (Warning Orange)
- #E69A4F (Lighter Warning)
- Use for: Warning messages, low stock alerts, pending states

Purple (Special/Premium)
- #6B4E8B (Accent Purple)
- Use for: Special items, premium features, VIP indicators
```

**Important**: These accent colors should be used **very sparingly** and only when the semantic meaning requires it. The majority of the UI should still use the primary palette (Golden, Green, Ivory, Black).

---

## Typography

### Font Philosophy
Use system fonts for optimal performance and that classic, no-frills feel:

```css
Primary Font Stack:
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", 
             "Roboto", "Helvetica Neue", Arial, sans-serif;

Monospace (for quantities, codes):
font-family: "SF Mono", "Monaco", "Inconsolata", 
             "Roboto Mono", monospace;
```

### Type Scale

```
Display (Hero Headlines)
- Size: 48px / 3rem
- Weight: 700 (Bold)
- Line Height: 1.1
- Letter Spacing: -0.02em
- Use: Page titles, landing headlines

H1 (Section Headers)
- Size: 32px / 2rem
- Weight: 700 (Bold)
- Line Height: 1.2
- Use: Main section titles

H2 (Subsection Headers)
- Size: 24px / 1.5rem
- Weight: 600 (Semi-bold)
- Line Height: 1.3
- Use: Card titles, modal headers

H3 (Component Headers)
- Size: 18px / 1.125rem
- Weight: 600 (Semi-bold)
- Line Height: 1.4
- Use: List headers, component titles

Body (Regular Text)
- Size: 16px / 1rem
- Weight: 400 (Regular)
- Line Height: 1.6
- Use: Primary content, descriptions

Small (Meta Text)
- Size: 14px / 0.875rem
- Weight: 400 (Regular)
- Line Height: 1.5
- Use: Labels, helper text, timestamps

Tiny (Fine Print)
- Size: 12px / 0.75rem
- Weight: 400 (Regular)
- Line Height: 1.4
- Use: Footnotes, captions
```

### Text Colors by Context
- Primary Text: `#1A1A1A`
- Secondary Text: `#2D2D2D`
- Placeholder Text: `#4A4A4A`
- Disabled Text: `#8B8B8B`
- Link Text: `#D4AF37` (Golden)
- Success Text: `#2D5016` (Dark Green)
- Error Text: `#8B3A3A` (Muted Red - exception to palette for errors)

---

## Spacing System

Use a **4px base unit** for consistent spacing:

```
4px   (0.25rem) - xs   - Tight spacing, icon gaps
8px   (0.5rem)  - sm   - Input padding, small gaps
12px  (0.75rem) - md   - Button padding vertical
16px  (1rem)    - base - Standard gap, card padding
24px  (1.5rem)  - lg   - Section spacing
32px  (2rem)    - xl   - Major section breaks
48px  (3rem)    - 2xl  - Hero spacing
64px  (4rem)    - 3xl  - Page sections
```

---

## Layout & Grid

### Container
```css
max-width: 1200px
padding: 0 24px
margin: 0 auto
```

### Breakpoints
```
Mobile:  < 640px
Tablet:  640px - 1024px
Desktop: > 1024px
```

### Grid System
Use CSS Grid for major layouts, Flexbox for components:

```css
/* Main App Grid */
display: grid;
grid-template-columns: 240px 1fr; /* Sidebar + Main */
gap: 32px;

/* Card Grids */
display: grid;
grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
gap: 16px;
```

---

## Components

### Buttons

#### Primary Button (Golden)
```
Background: #D4AF37
Text: #1A1A1A
Padding: 12px 24px
Border: 2px solid #D4AF37
Border Radius: 4px
Font Weight: 600
Font Size: 16px

Hover: Background #C5A028
Active: Background #8B7500
Disabled: Background #E5C158, Opacity 0.5
```

#### Secondary Button (Outlined)
```
Background: Transparent
Text: #1A1A1A
Padding: 12px 24px
Border: 2px solid #1A1A1A
Border Radius: 4px
Font Weight: 600

Hover: Background #FAF8F3
Active: Background #F5F3ED
```

#### Success Button (Green)
```
Background: #2D5016
Text: #FFFFF0
Padding: 12px 24px
Border: 2px solid #2D5016
Border Radius: 4px
Font Weight: 600

Hover: Background #3D6B1F
Active: Background #4A7C2A
```

### Cards
```
Background: #FAF8F3
Border: 2px solid #1A1A1A
Border Radius: 4px
Padding: 16px
Box Shadow: 4px 4px 0px #1A1A1A (Retro drop shadow)

Hover: Transform: translate(-2px, -2px)
       Box Shadow: 6px 6px 0px #1A1A1A
```

### Input Fields
```
Background: #FFFFF0
Border: 2px solid #1A1A1A
Border Radius: 4px
Padding: 12px
Font Size: 16px
Color: #1A1A1A

Focus: Border-Color #D4AF37
       Outline: 2px solid #D4AF37 (offset 2px)

Error: Border-Color #8B3A3A
```

### Dropdowns/Select Fields
```
Background: #FFFFF0
Border: 2px solid #1A1A1A
Border Radius: 4px
Padding: 12px
Font Size: 16px
Color: #1A1A1A
Cursor: pointer

Focus: Border-Color #D4AF37
       Outline: 2px solid #D4AF37 (offset 2px)

Hover: Background #FAF8F3

Arrow: Browser default or custom chevron icon
```

### Tables (Grid-Based)
```
Container:
  Background: #FAF8F3
  Border: 2px solid #1A1A1A
  Border Radius: 4px
  Box Shadow: 4px 4px 0px #1A1A1A
  Overflow-X: auto

Header Row:
  Background: #F5F3ED (Darker Ivory)
  Border-Bottom: 2px solid #1A1A1A
  Font-Weight: 600
  Text-Transform: uppercase
  Letter-Spacing: 0.05em
  Font-Size: 14px
  Padding: 16px

Data Row:
  Border-Bottom: 1px solid #EBE8DC
  Padding: 16px
  Min-Height: 60px
  Align-Items: center
  Transition: background 0.2s

  Hover: Background #FFFFF0

Layout: Use CSS Grid
  grid-template-columns: [custom widths for each column]
  gap: 16px

Responsive Mobile:
  - Hide header row
  - Convert rows to card layout
  - Stack cells vertically
  - Add borders around each row
```

### Tags/Badges
```
Background: #E5C158 (Golden Light)
Color: #1A1A1A
Padding: 4px 12px
Border Radius: 12px
Font Size: 14px
Font Weight: 600

Green Variant (In Stock):
Background: #8FBC8F
Color: #1A1A1A
```

### Navigation
```
Background: #FAF8F3
Border-Right: 2px solid #1A1A1A
Width: 240px
Padding: 24px 16px

Nav Item:
  Padding: 12px 16px
  Border Radius: 4px
  Font Weight: 500
  
  Active: Background #D4AF37, Color #1A1A1A
  Hover: Background #F5F3ED
```

### Data Tables

There are two main table patterns: **View Mode** (read-only display) and **Edit Mode** (with input fields).

#### Table Container (Both Modes)
```css
background: #FAF8F3;
border: 2px solid #1A1A1A;
border-radius: 4px;
box-shadow: 4px 4px 0px #1A1A1A;
overflow-x: auto;
```

#### Table Header (Both Modes)
```css
display: grid;
grid-template-columns: [define based on content];
gap: 16px;
padding: 16px;
background: #F5F3ED;
border-bottom: 2px solid #1A1A1A;
font-size: 14px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.05em;
```

#### View Mode Table Row (Display Only)
```css
display: grid;
grid-template-columns: [same as header];
gap: 16px;
padding: 16px;
border-bottom: 1px solid #EBE8DC;
min-height: 60px;
align-items: center;

Hover: background: #FFFFF0;
Last Row: border-bottom: none;
```

**Use for:** Displaying data with badges, status indicators, view-only content

#### Edit Mode Table Row (With Inputs)
```css
display: grid;
grid-template-columns: 140px 1fr 1fr 1fr 180px; /* Example */
gap: 16px;
padding: 16px;
border-bottom: 1px solid #EBE8DC;
min-height: 60px;
align-items: center;

Cells contain: Input fields, action buttons
Last Row: border-bottom: none;
```

**Input Fields in Table:**
```css
width: 100%;
padding: 8px 12px;
font-size: 14px;
/* Inherits standard input styling */
```

**Action Buttons in Table:**
```css
/* Small button variant */
padding: 6px 12px;
font-size: 12px;
gap: 4px;
```

**Use for:** Inline editing (menus, schedules, quick data entry)

#### Example Grid Columns:
```
/* View Mode - Mixed content */
grid-template-columns: 2fr 1fr 1fr 1fr 100px;

/* Edit Mode - Day + Items + Actions */
grid-template-columns: 140px 1fr 1fr 1fr 180px;

/* All equal columns */
grid-template-columns: repeat(4, 1fr);

/* Custom widths */
grid-template-columns: 100px 2fr 1fr 120px;
```

#### Mobile Responsive Pattern:
```css
@media (max-width: 767px) {
  /* Hide table header */
  .tableHeader {
    display: none;
  }
  
  /* Convert rows to cards */
  .tableRow {
    grid-template-columns: 1fr;
    gap: 12px;
    border: 2px solid #EBE8DC;
    border-radius: 4px;
    margin-bottom: 12px;
  }
  
  /* Add labels using data attributes */
  .cell::before {
    content: attr(data-label);
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    color: #4A4A4A;
    display: block;
    margin-bottom: 4px;
  }
}
```

#### Bottom Table Actions
```css
/* For Save, Clear All, etc. */
display: flex;
gap: 16px;
justify-content: center;
margin-top: 16px;

Mobile: flex-direction: column;
```

---

## Iconography

### Icon Library Requirements

**CRITICAL RULE: NEVER USE EMOJIS** ❌

We **exclusively use React icon libraries** for all icons and visual representations:

**Primary Library:** [Lucide React](https://lucide.dev/)
```bash
npm install lucide-react
```

**Fallback Libraries** (if Lucide doesn't have what we need):
- [React Icons](https://react-icons.github.io/react-icons/) - Includes Font Awesome, Material Design, etc.
- [Heroicons](https://heroicons.com/) - Tailwind's icon set
- [Phosphor Icons](https://phosphoricons.com/) - Beautiful, flexible icons

**Usage Example:**
```tsx
import { ShoppingCart, Plus, Trash2 } from 'lucide-react';

<ShoppingCart size={24} color="#D4AF37" strokeWidth={2} />
```

### Why No Emojis?
- ❌ Inconsistent across platforms/browsers
- ❌ Don't match our retro aesthetic
- ❌ Limited customization (size, color, stroke)
- ❌ Accessibility issues
- ✓ Icons are scalable, consistent, and themeable

### Style Guidelines
- Use **2px stroke weight** for consistency with borders
- Prefer **outline/stroke icons** over filled icons
- Icon sizes: 16px (small), 20px (medium), 24px (large), 32px (extra large)
- Color: `#1A1A1A` (default), `#D4AF37` (active/interactive), `#2D5016` (success)
- Always import from React icon libraries, never use emoji characters

### Key Icons Needed (Lucide names)
```
- ShoppingCart
- Plus, Minus
- Pencil, Edit
- Trash2
- Check, CheckCircle
- Search
- Filter, SlidersHorizontal
- Calendar
- User, Users
- Settings
- List, Grid
- ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronDown
- X (Close)
- Package, Box
- Clock
- AlertCircle, Info
- Menu (Hamburger)
- Heart
- Star
```

---

## Interactions & Animations

### Philosophy
Keep animations **subtle and functional**, never gratuitous.

### Transitions
```css
/* Standard transition */
transition: all 0.2s ease-in-out;

/* Button hover */
transition: transform 0.2s ease, box-shadow 0.2s ease;

/* Fade in */
opacity: 0 → 1
transition: opacity 0.3s ease;

/* Slide in (modals) */
transform: translateY(20px) → translateY(0)
transition: transform 0.3s ease-out;
```

### Hover States
- Cards: Lift with enhanced shadow
- Buttons: Darken background
- Links: Underline
- Icons: Slight scale (1.05x)

### Loading States
- Skeleton screens using `#F5F3ED` and `#EBE8DC`
- Subtle pulse animation (opacity 0.5 → 1)

---


## Voice & Tone

### UI Copy Guidelines
- **Clear and Direct**: "Add to Order" not "Would you like to add?"
- **Friendly but Professional**: "No items yet!" not "Oops! Nothing here"
- **Action-Oriented**: Use verbs - "Create", "Edit", "Delete", "Order"
- **Community-Focused**: Use "we", "our kitchen", "volunteers"
- **NEVER USE EMOJIS**: Use icons from React icon libraries instead (Lucide, React Icons, etc.)

### Success Messages
- "Item added to order!"
- "Grocery list updated"
- "Order submitted successfully"

### Error Messages
- "Couldn't save item. Please try again."
- "This item already exists"
- "Please fill in all required fields"

### Empty States
- "No items in your order yet"
- "Start by adding some groceries"
- "Your shopping cart is empty"

---

## Accessibility

### Contrast Requirements
All text must meet **WCAG AA** standards:
- Normal text: 4.5:1 minimum
- Large text (18px+): 3:1 minimum

### Interactive Elements
- Minimum touch target: **44x44px**
- Keyboard navigation: Full support with visible focus states
- Focus indicators: 2px solid `#D4AF37` outline

### Semantic HTML
```html
<nav> for navigation
<main> for primary content
<section> for distinct sections
<article> for grocery items, recipes
<button> for actions (not <div>)
<a> for navigation (not <button>)
```

### ARIA Labels
Use for icon-only buttons, complex interactions:
```html
<button aria-label="Add to cart">
  <PlusIcon />
</button>
```

---

## Data Structure Considerations

### JSON Structure (Current)
Design components to easily consume:
```json
{
  "id": "uuid",
  "name": "string",
  "category": "string",
  "quantity": "number",
  "unit": "string",
  "status": "in-stock | low | out",
  "priority": "high | medium | low",
  "addedBy": "string",
  "dateAdded": "ISO string",
  "notes": "string"
}
```

### MongoDB Migration Ready
- Use consistent field naming (camelCase)
- Treat IDs as strings (works for both UUID and MongoDB ObjectId)
- Design for pagination (limit/offset patterns)
- Plan for filtering/sorting UI early

---

## Component Library Structure

### Atomic Design Approach

**Atoms** (Basic elements)
- Button, Input, Label, Icon, Badge, Avatar

**Molecules** (Simple combinations)
- Form Field (Label + Input + Error)
- Quantity Selector (Decrease + Input + Increase)
- Search Bar (Input + Icon)

**Organisms** (Complex components)
- Navigation Sidebar
- Grocery Item Card
- Shopping Cart
- Order Summary

**Templates** (Page layouts)
- Dashboard Template
- Catalog Template
- Detail Template

---

## Implementation Guidelines

### CSS Approach
**Use CSS Modules** for component styling:
```css
/* Component.module.css */
.card {
  background: var(--ivory-card);
  border: 2px solid var(--black);
  border-radius: 4px;
}
```

### CSS Variables
Define in `globals.css`:
```css
:root {
  /* Colors */
  --golden-main: #D4AF37;
  --golden-hover: #C5A028;
  --green-main: #2D5016;
  --ivory-bg: #FFFFF0;
  --ivory-card: #FAF8F3;
  --black-text: #1A1A1A;
  
  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-base: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  
  /* Shadows */
  --shadow-retro: 4px 4px 0px var(--black-text);
  --shadow-retro-hover: 6px 6px 0px var(--black-text);
}
```

### Component Naming Convention
```
PascalCase for components: GroceryCard, ShoppingCart
camelCase for functions: handleAddItem, formatDate
UPPER_CASE for constants: MAX_QUANTITY, API_ENDPOINT
```

---

## Responsive Design Principles

### Mobile First
Start with mobile layout, enhance for larger screens:

```css
/* Mobile (default) */
.grid {
  grid-template-columns: 1fr;
}

/* Tablet */
@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Mobile Considerations
- Stack sidebar navigation as hamburger menu
- Increase touch targets to 48px minimum
- Simplify tables to card-based layouts
- Reduce padding/spacing by 25%

---

## Performance Guidelines

1. **Lazy load** catalog images
2. **Virtualize** long lists (100+ items)
3. **Debounce** search inputs (300ms)
4. **Optimize images**: WebP format, appropriate sizing
5. **Code split** routes (Next.js handles this)
6. **Cache** static assets aggressively

---

## Future Considerations

### MongoDB Migration
When migrating from JSON:
- Maintain same component interfaces
- Update API layer, not component layer
- Add pagination UI (designed upfront)
- Implement server-side search/filter

### Feature Expansion
Design with these in mind:
- User roles (admin, cook, volunteer)
- Multi-kitchen support
- Recipe management
- Meal planning
- Inventory tracking
- Budget management
- Vendor management

---

## Implementation Examples

### Real Code References
For working examples of these patterns, see:

**Tables:** 
- `/app/menu-management/` - Grid-based weekly menu table with responsive mobile cards
- Patterns: CSS Grid layout, responsive breakpoints, row hover states

**Dropdowns:** 
- `/app/add-new-items/components/` - Unit, Category, Store selectors
- Patterns: Standard select with custom styling, validation states

**Modals:** 
- `/app/add-new-items/components/` - Product, Category, Store modals
- Patterns: Overlay, centered content, action buttons, close handlers

**Cards:**
- `/app/add-new-items/` - Product cards with actions
- Patterns: Retro shadow, hover lift, consistent padding

---

## Quick Reference

### Do's ✓
- Use 2px borders everywhere
- Add retro drop shadows to cards (4px 4px 0px #1A1A1A)
- Keep backgrounds ivory/warm
- Use golden for primary actions
- Use green for success/additions
- Make buttons chunky and obvious
- Add hover states to everything interactive
- Use system fonts
- Keep animations subtle
- Use CSS Grid for tables (responsive + mobile-friendly)
- Make tables responsive (grid on desktop, cards on mobile)

### Don'ts ✗
- No gradients
- No complex shadows (except retro drop shadow)
- No rounded corners over 4px (except badges/pills at 12px)
- No thin borders (always 2px+)
- No dark mode (light theme only)
- No trendy effects (glassmorphism, neumorphism)
- No icon fonts (use SVG from React libraries)
- No animations over 0.3s
- **ABSOLUTELY NO EMOJIS** - Use React icon libraries only
- No HTML tables - use CSS Grid for better responsive control

---

## Design Inspiration

**Reference Sites:**
- Gumroad (layout simplicity, typography)
- Stripe (clarity, component design)
- Linear (navigation patterns)
- Notion (content structure)

**Retro Elements:**
- Bold borders
- Solid drop shadows
- Warm color palette
- No gradients or modern effects
- Chunky buttons
- Clear visual hierarchy

---

## Getting Started Checklist

1. ✓ Install icon libraries (`npm install lucide-react react-icons`)
2. ✓ Set up color variables in `globals.css`
3. ✓ Create base component library (Button, Input, Card)
4. ✓ Build navigation structure
5. ✓ Create layout templates
6. ✓ Design grocery item card
7. ✓ Build shopping cart component
8. ✓ Implement search/filter UI
9. ✓ Add empty states (with icons, never emojis)
10. ✓ Test accessibility
11. ✓ Optimize for mobile

---

*This design guide is a living document. Update as the project evolves.*

