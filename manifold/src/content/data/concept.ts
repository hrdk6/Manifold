import type { ConceptData } from '../../lib/concept';

const r = (x: string, y: boolean) => ({ x: x.split(/\s+/), y });

export const enjoySport: ConceptData = {
  attrs: ['Sky', 'AirTemp', 'Humidity', 'Wind', 'Water', 'Forecast'],
  target: 'EnjoySport',
  rows: [
    r('Sunny Warm Normal Strong Warm Same', true),
    r('Sunny Warm High Strong Warm Same', true),
    r('Rainy Cold High Strong Warm Change', false),
    r('Sunny Warm High Strong Cool Change', true),
  ],
  domains: [
    ['Sunny', 'Cloudy', 'Rainy'],
    ['Warm', 'Cold'],
    ['Normal', 'High'],
    ['Strong', 'Weak'],
    ['Warm', 'Cool'],
    ['Same', 'Change'],
  ],
};

export const hiring: ConceptData = {
  attrs: ['Degree', 'Experience', 'Skills', 'Portfolio'],
  target: 'Hired',
  rows: [
    { x: ['Masters', '5 years', 'Python', 'Good'], y: true },
    { x: ['Bachelors', '4 years', 'Python', 'Good'], y: false },
    { x: ['Masters', '6 years', 'Python', 'Good'], y: true },
    { x: ['Masters', '5 years', 'Python', 'Excellent'], y: true },
  ],
};

export const picnic: ConceptData = {
  attrs: ['Outlook', 'Temperature', 'Humidity', 'Wind'],
  target: 'Picnic',
  rows: [
    r('Sunny Hot Normal Weak', true),
    r('Sunny Hot High Weak', true),
    r('Overcast Hot High Strong', true),
    r('Rain Mild Normal Weak', false),
    r('Sunny Mild Normal Strong', true),
  ],
  domains: [
    ['Sunny', 'Overcast', 'Rain'],
    ['Hot', 'Mild', 'Cool'],
    ['High', 'Normal'],
    ['Weak', 'Strong'],
  ],
};

export const tennisCEA: ConceptData = {
  attrs: ['Outlook', 'Temperature', 'Humidity', 'Wind'],
  target: 'PlayTennis',
  rows: [
    r('Sunny Hot High Weak', false),
    r('Sunny Hot High Strong', false),
    r('Overcast Hot High Weak', true),
    r('Rain Mild High Weak', true),
    r('Rain Cool Normal Weak', true),
  ],
  domains: [
    ['Sunny', 'Overcast', 'Rain'],
    ['Hot', 'Mild', 'Cool'],
    ['High', 'Normal'],
    ['Weak', 'Strong'],
  ],
};

export const apple: ConceptData = {
  attrs: ['Colour', 'Size', 'Texture'],
  target: 'Apple',
  rows: [
    { x: ['Red', 'Small', 'Smooth'], y: true, label: 'E1' },
    { x: ['Green', 'Large', 'Rough'], y: false, label: 'E2' },
    { x: ['Red', 'Medium', 'Smooth'], y: true, label: 'E3' },
    { x: ['Yellow', 'Large', 'Rough'], y: false, label: 'E4' },
    { x: ['Red', 'Small', 'Rough'], y: false, label: 'E5' },
  ],
  domains: [
    ['Red', 'Green', 'Yellow'],
    ['Small', 'Medium', 'Large'],
    ['Smooth', 'Rough'],
  ],
};

export const tennisEquipment: ConceptData = {
  attrs: ['Ball', 'Racket', 'Field', 'Net'],
  target: 'Tennis',
  rows: [
    r('Small Yes Court Yes', true),
    r('Large No Field No', false),
    r('None No Table Yes', false),
    r('Small Yes Court Yes', true),
  ],
};

export const conceptPresets = {
  enjoySport: { label: 'EnjoySport (SEE ’25 1b)', data: enjoySport },
  hiring: { label: 'Hiring (Q13)', data: hiring },
  picnic: { label: 'Picnic (Q14)', data: picnic },
  apple: { label: 'Apple (SEE ’25 2b)', data: apple },
  tennisCEA: { label: 'PlayTennis (Q15)', data: tennisCEA },
  tennisEquipment: { label: 'Tennis equipment', data: tennisEquipment },
};

export type ConceptPresetId = keyof typeof conceptPresets;
