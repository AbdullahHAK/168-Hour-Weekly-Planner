# ⏳ 168 Hours — Weekly Time Planner

Every week has exactly **168 hours**. This app helps you see how you spend yours now, and how you'd like to spend them.

### ▶ **[Open the live app](https://abdullahhak.github.io/168-Hour-Weekly-Planner/)**

No sign-up and no install. Your plan is saved in your own browser and never leaves your device.

---

## What it does

**Calculator.** Answer simple questions about your week, like *"I sleep for around 8 hours per night"* or *"My commute is 20 minutes each way"*. Answer them twice, once for your **Current week** and once for your **Ideal week**. The app turns your answers into hours per week across eight life areas:

😴 Sleep · 💻 Work · 🍕 Food · 🧹 Chores · 👶 Childcare · 🏋️ Fitness · 📺 Entertainment · 🥰 Relationships

As you type, you see:
- the hours **used** and **free** each week, month (×4) and year (×52)
- a running *"that leaves me with…"* total after each life area
- how your Ideal week compares with your Current week, area by area
- your whole week drawn as 168 dots, one per hour
- a warning when a week adds up to more than 168 hours

**Week grid.** Paint your week hour by hour on a 7 × 24 grid. Each painted hour counts towards a category, and a side panel compares the painted hours with the targets from your Current or Ideal week.

## Quick guide

1. **Fill in the Calculator.** Type numbers into the blue boxes (*Current*) and the green boxes (*Ideal*). Every total updates as you type.
2. **Open the Week grid** and pick a category from the palette. Keys <kbd>1</kbd>–<kbd>9</kbd> pick a category and <kbd>E</kbd> picks the eraser.
3. **Click or drag** across the grid to paint hours.
   - Drag over hours that already have the same colour to erase them.
   - Click a **day name** to fill the whole day, or an **hour label** to fill that hour on every day.
4. **Check the side panel** to see how many hours are allocated, how many remain, and whether each category is on target.
5. **Customize categories** with the **Categories** button. You can rename or recolour any area, or add your own (for example study, side project or volunteering). Areas you add get an *hours per week* question in the Calculator.
6. **Switch dark or light mode** with the sun/moon button.

### Saving, exporting and resetting

| Action | Where | What it does |
|---|---|---|
| Auto-save | — | Every change is saved in your browser's localStorage automatically. |
| **Export → CSV** | top bar | Downloads a spreadsheet-friendly file with the summary, all your answers and the week grid. |
| **Export → JSON** | top bar | Downloads a full backup of your plan. |
| **Export → Import JSON…** | top bar | Restores a plan from a JSON backup, for example on another device. |
| **Reset** | top bar | Clears the Current week, the Ideal week and/or the grid. You can also load the example answers. |

> Your plan lives only in the browser where you made it. Clearing site data or using a private window starts you fresh, so export a JSON backup if you want to keep your plan or move it to another device.

## Run it locally

The app is plain HTML, CSS and JavaScript with no build step and no dependencies.

```bash
git clone https://github.com/AbdullahHAK/168-Hour-Weekly-Planner.git
cd 168-Hour-Weekly-Planner
# open index.html in your browser, or serve the folder:
python -m http.server 8000   # then visit http://localhost:8000
```

## Project structure

```
index.html   page markup and dialogs
styles.css   design tokens, light/dark themes, responsive layout
app.js       calculation engine, calculator UI, week grid, persistence and export
```

## How the numbers are calculated

| Area | Weekly hours |
|---|---|
| Sleep | hours per night × 7 + wind-down minutes × 7 ÷ 60 |
| Work | days × hours per day + (lunch break + 2 × commute + getting ready + changing after) minutes × days ÷ 60 |
| Food | (breakfast + dinner) minutes per day × 7 ÷ 60 + lunch minutes × (7 − work days) ÷ 60 |
| Chores | Σ (sessions × minutes) ÷ 60 for groceries, cleaning and laundry, plus misc. hours |
| Childcare | 5 × weekday hours + 2 × weekend-day hours + admin + other |
| Fitness, Entertainment, Relationships | sum of the weekly hours you enter |
| **Free time** | 168 − all of the above |

Lunch on work days counts as part of Work (the lunch break), so the Food section only counts lunch on non-work days.

## License

[MIT](LICENSE) © 2026 Abdullah
