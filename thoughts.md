# Price Analytics Feature - Understanding & Thoughts

## 📊 What I Understand

### Core Concept
A new **"Analytics"** or **"Price Insights"** page that provides visual analysis of item prices across stores and time.

### Main Functionality
1. **Filter/Selection Panel** (left side or top)
   - Select an item (dropdown or search)
   - Select date range (last week, last month, last 3 months, all time, custom range)
   - Select stores to compare (checkboxes - can be single or multiple)
   - Optional: Sort by (cheapest first, most recent, etc.)

2. **Visual Chart Display** (main area)
   - Line chart showing price variation over time
   - Different colored lines for different stores
   - Data points for each purchase
   - Hover tooltips showing: date, store, price, receipt link

3. **Summary Cards** (above or below chart)
   - **Cheapest Store**: "Walmart - $2.99 (Nov 20, 2025)"
   - **Most Expensive**: "Target - $3.49 (Oct 15, 2025)"
   - **Average Price**: "$3.15 across 5 purchases"
   - **Price Trend**: "↓ Down 10% from last month"

---

## 🎨 UI Layout Concept

```
┌─────────────────────────────────────────────────────────┐
│  Price Analytics                                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Filters:                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Select Item ▼│  │ Date Range  ▼│  │ Stores      ▼│  │
│  │ Milk         │  │ Last 3 Months│  │ ☑ Walmart    │  │
│  └──────────────┘  └──────────────┘  │ ☑ Target     │  │
│                                       │ ☐ Costco     │  │
│                                       └──────────────┘  │
│                                                          │
│  Summary:                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Cheapest    │ │ Most Exp.   │ │ Average     │       │
│  │ Walmart     │ │ Target      │ │ $3.15       │       │
│  │ $2.99       │ │ $3.49       │ │ 5 purchases │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                          │
│  Price History Chart:                                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │ $4.00 │                                            │ │
│  │       │     ● Target                              │ │
│  │ $3.50 │    ╱  ╲                                    │ │
│  │       │   ╱    ●                                   │ │
│  │ $3.00 │  ●      ╲     ● Walmart                   │ │
│  │       │          ●───●                             │ │
│  │ $2.50 │                                            │ │
│  │       └────────────────────────────────────────────│ │
│  │        Oct    Nov    Dec    Jan    Feb            │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🤔 Design Questions & Decisions

### 1. **What chart library to use?**
**Options:**
- **Recharts** (React-specific, simpler, good for small apps)
- **Chart.js** (Popular, flexible, large community)
- **D3.js** (Most powerful, steeper learning curve)

**My Recommendation:** **Recharts**
- Easy to integrate with React
- Responsive out of the box
- Good enough for this use case
- Lightweight

### 2. **How to handle items with no price history?**
**Solution:** Show empty state:
```
"No price data available for this item yet.
Upload more receipts to see price trends!"
```

### 3. **What if user selects multiple items?**
**Options:**
- A) Don't allow it (single item at a time)
- B) Show multiple lines on same chart (could get messy)
- C) Show comparison table instead

**My Recommendation:** **Option A** - Single item at a time for clarity
- Can add "Compare Items" feature later if needed

### 4. **Date range filtering**
**Presets:**
- Last 7 days
- Last 30 days
- Last 3 months
- Last 6 months
- All time
- Custom range (date picker)

### 5. **Store filtering**
**Behavior:**
- If 1 store selected: Show that store's prices only
- If multiple selected: Show all selected stores with different colors
- If none selected: Show all stores

### 6. **Mobile responsiveness**
**Challenge:** Charts can be hard to read on small screens
**Solution:**
- Filters stack vertically on mobile
- Chart takes full width
- Summary cards scroll horizontally
- Consider simplified view for mobile

---

## 🎯 Key Insights to Show

1. **Best Place to Buy**
   - "Walmart consistently has the best price for Milk"
   - Show average savings compared to other stores

2. **Price Trends**
   - "Prices increased by 15% over last 3 months"
   - Seasonal patterns?

3. **When to Buy**
   - "Best prices typically on weekends" (if we track day of week)
   - "Target runs sales on first of month"

4. **Outliers**
   - Flag unusual prices (possible data entry errors)
   - "This price seems unusually high - verify receipt?"

---

## 🔧 Technical Implementation

### Route Structure
```
/analytics
  └── page.tsx (main analytics page)
```

### Data Processing
1. Get all receipts from `useReceipts()` hook
2. Process with `processItemsFromReceipts()`
3. Filter based on user selections
4. Transform data into chart format:
```typescript
{
  date: "2025-11-20",
  Walmart: 2.99,
  Target: null,
  Costco: null
}
```

### State Management
```typescript
const [selectedItem, setSelectedItem] = useState<string | null>(null);
const [dateRange, setDateRange] = useState<'7d' | '30d' | '3m' | '6m' | 'all'>('3m');
const [selectedStores, setSelectedStores] = useState<string[]>([]);
const chartData = useMemo(() => {
  // Process and filter data
}, [selectedItem, dateRange, selectedStores, receipts]);
```

---

## 📦 New Dependencies Needed

```json
{
  "recharts": "^2.10.0"  // For charts
}
```

---

## 🚀 Implementation Plan

### Phase 1: Basic Setup
1. Create `/analytics` route
2. Add "Analytics" option to sidebar
3. Create basic page layout with filters

### Phase 2: Data Processing
1. Write helper function to transform receipt data → chart data
2. Implement filtering logic
3. Calculate summary statistics

### Phase 3: Visualization
1. Install Recharts
2. Implement line chart with multiple series
3. Add tooltips and legends
4. Style to match app theme

### Phase 4: Polish
1. Add empty states
2. Add loading states
3. Make responsive
4. Add export chart feature?

---

## 💡 Future Enhancements (Not Now)

- **Compare multiple items** side by side
- **Bar chart view** as alternative to line chart
- **Savings calculator**: "You saved $X by shopping at Walmart"
- **Price alerts**: "Notify me when Milk drops below $3"
- **Export chart** as image/PDF
- **Share insights** with others
- **Predictive analysis**: "Based on trends, prices likely to..."

---

## ❓ Questions for User

1. **Chart type preference?**
   - Line chart (shows trends over time) ← My recommendation
   - Bar chart (easier to compare specific points)
   - Both with toggle option?

2. **Initial filters default?**
   - Should a specific item be pre-selected?
   - Default date range: Last 3 months? All time?
   - All stores selected by default?

3. **Unit price vs total price?**
   - For items like "Milk 1 gallon", show per-unit price ($2.99/gallon)?
   - Or show what you paid ($2.99 total)?
   - Both?

4. **Page name?**
   - "Analytics" (technical)
   - "Price Insights" (user-friendly)
   - "Price Tracker" (descriptive)
   - "Smart Shopping" (marketing-y)

5. **Empty state behavior?**
   - If no receipts yet, show demo chart with sample data?
   - Or just show "Upload receipts to get started"?

---

## 🎨 Color Scheme for Stores

Different colors for different stores in chart:
- Walmart: Blue (#0071CE)
- Target: Red (#CC0000)
- Costco: Purple (#0066B2)
- Whole Foods: Green (#00A652)
- Kroger: Orange (#E32D1C)
- Others: Generated from theme colors

---

## ✅ Success Criteria

User should be able to:
1. Select any item they've purchased
2. See price history across all stores
3. Immediately identify cheapest store
4. Spot price trends (going up/down)
5. Make informed shopping decisions

---

## 🎯 Value Proposition

**"Stop overpaying. See exactly which store has the best price for each item you buy."**

This feature transforms raw receipt data into actionable insights that save users money.

---

**Status:** Ready for user feedback before implementation 🚀

