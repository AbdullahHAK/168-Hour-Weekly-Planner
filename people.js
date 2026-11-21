/* ==========================================================
   People to compare with — easy to edit.

   Each person's week is a ROUGH ESTIMATE in hours per week,
   based on what they have said in interviews and on widely
   reported routines. It's meant for fun and inspiration, not
   as fact. Every week adds up to 168 hours or less; whatever
   is left over counts as free time.

   Fields
     id        unique, lowercase, no spaces
     name      display name
     role      short description
     color     avatar colour (soft tones work best)
     photo     optional image URL. Leave '' to show initials.
               Only use images you have the right to publish
               (e.g. a Wikimedia Commons file, with attribution
               added to `credit`).
     credit    optional photo credit text
     note      one line about their routine (paraphrased, "reportedly")
     hours     weekly hours per life area
   ========================================================== */
window.PEOPLE = [
  {
    id: 'musk',
    name: 'Elon Musk',
    role: 'Entrepreneur · Tesla, SpaceX',
    color: '#93c3e6',
    photo: 'img/people/musk.jpg',
    credit: 'Gage Skidmore · CC BY-SA 4.0 · Wikimedia Commons',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Elon_Musk_-_54820081119_(3x4_cropped,_Rule_of_thirds).jpg',
    note: 'Has described working 80–100-hour weeks and sleeping about 6 hours a night.',
    hours: { sleep: 42, work: 90, food: 8, chores: 1, childcare: 5, fitness: 2, entertainment: 10, relationships: 4 },
  },
  {
    id: 'goggins',
    name: 'David Goggins',
    role: 'Ultra-endurance athlete · Author',
    color: '#b6d89e',
    photo: 'img/people/goggins.jpg',
    credit: 'Paul Rudman · CC BY-SA 3.0 · Wikimedia Commons',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:DavidGogginsMay08.jpg',
    note: 'Known for waking around 4 a.m., sleeping roughly 4 hours and training for hours a day.',
    hours: { sleep: 28, work: 45, food: 7, chores: 3, childcare: 0, fitness: 35, entertainment: 2, relationships: 7 },
  },
  {
    id: 'gates',
    name: 'Bill Gates',
    role: 'Co-founder, Microsoft · Philanthropist',
    color: '#a9b4f2',
    photo: 'img/people/gates.jpg',
    credit: 'Bogdan Hoyaux / European Union · CC BY 4.0 · Wikimedia Commons',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Bill_Gates_at_the_European_Commission_-_P067383-987995_(cropped)_5.jpg',
    note: 'Reportedly aims for 7 hours of sleep and reads for about an hour every day.',
    hours: { sleep: 49, work: 55, food: 10, chores: 2, childcare: 0, fitness: 6, entertainment: 10, relationships: 8 },
  },
  {
    id: 'bezos',
    name: 'Jeff Bezos',
    role: 'Founder, Amazon & Blue Origin',
    color: '#f4c48f',
    photo: 'img/people/bezos.jpg',
    credit: 'SECWAR · Public domain · Wikimedia Commons',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:260202-D-PM193-2205_SECWAR_Arsenal_of_Freedom_Tour_-_Florida_(3x4_cropped_on_Bezos_and_rotated).jpg',
    note: 'Says he prioritises 8 hours of sleep and keeps slow, unhurried mornings.',
    hours: { sleep: 56, work: 50, food: 10, chores: 2, childcare: 4, fitness: 4, entertainment: 6, relationships: 10 },
  },
  {
    id: 'buffett',
    name: 'Warren Buffett',
    role: 'Investor · Berkshire Hathaway',
    color: '#a6d6c4',
    photo: 'img/people/buffett.jpg',
    credit: 'USA International Trade Administration · Public domain · Wikimedia Commons',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Warren_Buffett_at_the_2015_SelectUSA_Investment_Summit_(cropped).jpg',
    note: 'Reportedly spends most of his working day reading, and plays bridge for hours each week.',
    hours: { sleep: 56, work: 45, food: 8, chores: 1, childcare: 0, fitness: 0, entertainment: 12, relationships: 6 },
  },
  {
    id: 'cook',
    name: 'Tim Cook',
    role: 'CEO, Apple',
    color: '#c8b4ea',
    photo: 'img/people/cook.jpg',
    credit: 'Dati Bendo / European Union · CC BY 4.0 · Wikimedia Commons',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Tim_Cook_in_New_York_City_-_2026_(cropped).jpg',
    note: 'Reportedly starts his day before 4 a.m. and hits the gym early.',
    hours: { sleep: 46, work: 70, food: 7, chores: 1, childcare: 0, fitness: 7, entertainment: 3, relationships: 4 },
  },
  {
    id: 'oprah',
    name: 'Oprah Winfrey',
    role: 'Media leader · Philanthropist',
    color: '#f1b3c8',
    photo: 'img/people/oprah.jpg',
    credit: 'US Embassy South Africa · Public domain · Wikimedia Commons',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Oprah_Winfrey_2016.jpg',
    note: 'Has said she starts her mornings with meditation and exercise.',
    hours: { sleep: 52, work: 50, food: 10, chores: 2, childcare: 0, fitness: 5, entertainment: 4, relationships: 10 },
  },
  {
    id: 'obama',
    name: 'Barack Obama',
    role: '44th U.S. President (in office)',
    color: '#b9c5d8',
    photo: 'img/people/obama.jpg',
    credit: 'Official White House Photo by Pete Souza · Public domain · Wikimedia Commons',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:President_Barack_Obama.jpg',
    note: 'As president, a reported night owl who slept about 5 hours but kept family dinners.',
    hours: { sleep: 35, work: 75, food: 9, chores: 0, childcare: 5, fitness: 5, entertainment: 7, relationships: 7 },
  },
  {
    id: 'ronaldo',
    name: 'Cristiano Ronaldo',
    role: 'Footballer',
    color: '#f0a99c',
    photo: 'img/people/ronaldo.jpg',
    credit: 'Bryan Berlin · CC BY-SA 4.0 · Wikimedia Commons',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Cristiano_Ronaldo_Croatia_v_Portugal_2_July_2026-075_(cropped).jpg',
    note: 'Reportedly sleeps in several 90-minute blocks and trains far beyond team sessions.',
    hours: { sleep: 52, work: 30, food: 12, chores: 1, childcare: 10, fitness: 15, entertainment: 4, relationships: 10 },
  },
  {
    id: 'arnold',
    name: 'Arnold Schwarzenegger',
    role: 'Actor · Former Governor',
    color: '#e6d38c',
    photo: 'img/people/arnold.jpg',
    credit: '',
    note: 'Famously sleeps about 6 hours (“sleep faster”) and trains every day.',
    hours: { sleep: 42, work: 50, food: 8, chores: 1, childcare: 0, fitness: 9, entertainment: 5, relationships: 6 },
  },
];
