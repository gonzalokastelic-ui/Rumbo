import { afterEach, describe, expect, it, vi } from 'vitest';
import { generarICS } from '../src/lib/ics.js';
import { cita, hace } from '../src/lib/actividad.js';

describe('generarICS', () => {
  const trip = { nombre: 'Miami, febrero' };
  const ics = generarICS(trip, [
    { id: 'e1', fecha: '2027-02-16', hora: '09:30', titulo: 'Everglades, en airboat', lugar: 'Everglades' },
    { id: 'e2', fecha: '2027-02-17', hora: null, titulo: 'Día de playa' },
    { id: 'e3', fecha: '2027-02-18', hora: '23:30', titulo: 'Show tarde' },
  ]);
  const lineas = ics.split('\r\n');

  it('genera un calendario válido con un evento por actividad', () => {
    expect(lineas[0]).toBe('BEGIN:VCALENDAR');
    expect(lineas.at(-1)).toBe('END:VCALENDAR');
    expect(lineas.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(3);
    expect(ics).toContain('X-WR-CALNAME:Miami\\, febrero');
  });

  it('las actividades con hora duran una hora', () => {
    expect(ics).toContain('DTSTART:20270216T093000');
    expect(ics).toContain('DTEND:20270216T103000');
  });

  it('las actividades sin hora son de todo el día', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20270217');
    expect(ics).toContain('DTEND;VALUE=DATE:20270218');
  });

  it('no pasa de medianoche', () => {
    expect(ics).toContain('DTEND:20270218T235900');
  });

  it('escapa comas y pliega las líneas largas', () => {
    expect(ics).toContain('SUMMARY:Everglades\\, en airboat');
    const largo = generarICS({ nombre: 'x'.repeat(200) }, []);
    largo.split('\r\n').forEach((l) => expect(l.length).toBeLessThanOrEqual(75));
  });
});

describe('actividad', () => {
  afterEach(() => vi.useRealTimers());

  it('muestra tiempos relativos en español', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
    const ahora = Date.now();
    expect(hace(ahora - 10_000)).toBe('recién');
    expect(hace(ahora - 5 * 60_000)).toBe('hace 5 min');
    expect(hace(ahora - 3 * 3600_000)).toBe('hace 3 h');
    expect(hace(ahora - 24 * 3600_000)).toBe('ayer');
    expect(hace(ahora - 4 * 86400_000)).toBe('hace 4 días');
  });

  it('acepta un Timestamp de Firestore', () => {
    expect(hace({ toMillis: () => Date.now() })).toBe('recién');
  });

  it('cita títulos y recorta los largos', () => {
    expect(cita('Pasaporte')).toBe('«Pasaporte»');
    expect(cita('a'.repeat(80))).toHaveLength(62);
  });
});
