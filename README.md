# 168 Hours — Weekly Time Planner

Every week has exactly **168 hours**. Plan them like a budget, see how your week compares with some of the world's most influential people, and turn your plan into an hour-by-hour schedule in one tap.

### ▶ **[Open the live app](https://abdullahhak.github.io/168-Hour-Weekly-Planner/)**

There's nothing to sign up for or install. Your plan is saved in your own browser and never leaves your device.

---

## How it works

### 1 · Balance

Your week is written as short sentences. Each number in them can be changed:

> I sleep **7.5 h** a night, and wind down for **30 min** before bed.

- **Drag a number sideways** to change it, or **tap it** to open a small editor with − / + buttons, a slider and quick picks.
- Switch between **My week now** and **My ideal week**. In the ideal week, a small dot marks every number that differs from now.
- To get started, tap **Start from** *Office 9–5*, *Student*, *Parent* or *Freelancer*. You can **Undo** any preset.
- As you edit, you see:
  - a live **ring** of your 168 hours, with your free hours in the middle;
  - a **weekly receipt** listing hours per area, free time, and your free hours per month and year;
  - a short insight, for example *"Your ideal week frees up 24 hours a week — 52 full days a year."*

The 8 life areas are Sleep, Work, Food, Chores, Childcare, Fitness, Entertainment and Relationships. You can add your own with **Categories**.

### 2 · Compare

- Put your week (now or ideal) **next to** someone like Elon Musk, David Goggins, Bill Gates, Oprah Winfrey and others. You'll see two rings side by side, an area-by-area chart, and plain-English differences such as *"You sleep 17.5 h more a week than Elon."*
- The **leaderboard** ranks you against all of them by Balance, Sleep, Hustle (work), Fitness, People or Free time.

> The famous people's weeks are rough estimates based on interviews and public reports. They're there for fun and inspiration, not as facts, and they don't imply any endorsement.

### 3 · Schedule

- Tap **Auto-fill** to turn your plan into a schedule. Sleep goes at night, work from 9 on work days, meals at mealtimes, and everything else in the evenings and at weekends.
- To fine-tune, pick a category and **click or drag** on the 7 × 24 grid.
  - Drag over the same colour to erase it.
  - Click a day name or an hour to fill the whole column or row.
  - Keys <kbd>1</kbd>–<kbd>9</kbd> pick a category and <kbd>E</kbd> picks the eraser.
- A side panel shows how many hours are placed and how close each area is to its target.

## Saving, exporting and resetting

| Action | What it does |
|---|---|
| Auto-save | Every change is saved in your browser automatically. |
| **Export → CSV** | Downloads a spreadsheet-friendly file with the summary, all your answers and the schedule. |
| **Export → JSON** | Downloads a full backup of your plan. |
| **Export → Import JSON…** | Restores a plan from a backup, for example on another device. |
| **Reset** | Clears your week now, your ideal week and/or the schedule. You can also load the example answers. |

> Your plan lives only in the browser where you made it. Export a JSON backup to keep it or to move it to another device.

## Editing the comparison people

Everything about the people is in **[`people.js`](people.js)**: name, role, avatar colour, a one-line note and their weekly hours per area. Edit the numbers or add a new entry and the Compare view and leaderboard update automatically.

Avatars show initials by default. To show a photo, set `photo` to an image URL **you have the right to publish**, for example a Wikimedia Commons file, and put the attribution in `credit`.

## How the numbers are calculated

| Area | Weekly hours |
|---|---|
| Sleep | hours per night × 7 + wind-down minutes × 7 ÷ 60 |
| Work | days × hours per day + (lunch break + 2 × commute + getting ready + changing after) minutes × days ÷ 60 |
| Food | (breakfast + dinner) minutes per day × 7 ÷ 60 + lunch minutes × (7 − work days) ÷ 60 |
| Chores | Σ (times × minutes) ÷ 60 for groceries, cleaning and laundry, plus other chores |
| Childcare | 5 × weekday hours + 2 × weekend-day hours + admin + other |
| Fitness, Entertainment, Relationships | sum of the weekly hours you enter |
| **Free time** | 168 − all of the above (×4 per month, ×52 per year) |

The **Balance score** (0–100) on the leaderboard is deliberately simple. It adds:

| Points | For |
|---|---|
| 25 | 7–9 h of sleep a night |
| 20 | 2.5 h or more of exercise a week |
| 20 | 7 h or more with people a week |
| 20 | 14 h or more of free time a week |
| 15 | 50 h of work or less a week |

## Run it locally

The app is plain HTML, CSS and JavaScript with no build step and no dependencies.

```bash
git clone https://github.com/AbdullahHAK/168-Hour-Weekly-Planner.git
cd 168-Hour-Weekly-Planner
python -m http.server 8000   # then visit http://localhost:8000
```

```
index.html   page structure
styles.css   design tokens, light/dark themes, responsive layout
app.js       calculation engine, story editor, ring, receipt, compare, schedule, export
people.js    the people you can compare with (easy to edit)
```

## License

[MIT](LICENSE) © 2026 Abdullah
