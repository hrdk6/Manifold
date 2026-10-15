import type { CatData } from '../../lib/tree';

const rows = (s: string) =>
  s
    .trim()
    .split('\n')
    .map((l) => {
      const parts = l.trim().split(/\s+/);
      return { x: parts.slice(0, -1), y: parts[parts.length - 1] };
    });

/** Quinlan / Mitchell PlayTennis (14 days). */
export const playTennis: CatData = {
  attrs: ['Outlook', 'Temperature', 'Humidity', 'Wind'],
  target: 'PlayTennis',
  rows: rows(`
    Sunny Hot High Weak No
    Sunny Hot High Strong No
    Overcast Hot High Weak Yes
    Rain Mild High Weak Yes
    Rain Cool Normal Weak Yes
    Rain Cool Normal Strong No
    Overcast Cool Normal Strong Yes
    Sunny Mild High Weak No
    Sunny Cool Normal Weak Yes
    Rain Mild Normal Weak Yes
    Sunny Mild Normal Strong Yes
    Overcast Mild High Strong Yes
    Overcast Hot Normal Weak Yes
    Rain Mild High Strong No
  `),
};

/** Question bank M2 Q12 / IA-1 Q6. */
export const laptop: CatData = {
  attrs: ['Price', 'Brand', 'RAM'],
  target: 'Buy',
  rows: rows(`
    High Popular 16GB Yes
    High Unpopular 8GB No
    Medium Popular 8GB Yes
    Medium Popular 4GB Yes
    Low Unpopular 4GB No
    Low Popular 8GB Yes
  `),
};

/** Question bank M2 Q19. */
export const fluCold: CatData = {
  attrs: ['Fever', 'Cough', 'Fatigue'],
  target: 'Diagnosis',
  rows: rows(`
    High Severe Present Flu
    Low Mild Absent Cold
    High Severe Present Flu
    Low Mild Absent Cold
    High Mild Present Flu
    Low Severe Absent Cold
  `),
};

export const catPresets = {
  laptop: { label: 'Laptop purchase (Q12)', data: laptop },
  flu: { label: 'Flu or cold (Q19)', data: fluCold },
  tennis: { label: 'PlayTennis (14 days)', data: playTennis },
};

export type CatPresetId = keyof typeof catPresets;
