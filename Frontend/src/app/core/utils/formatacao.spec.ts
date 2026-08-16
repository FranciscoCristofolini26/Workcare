import { formatarLista } from './formatacao';

describe('formatarLista', () => {
  it('usa "e" antes do último item', () => {
    expect(formatarLista(['Blumenau', 'Timbó'])).toBe('Blumenau e Timbó');
    expect(formatarLista(['Blumenau', 'Timbó', 'Indaial'])).toBe('Blumenau, Timbó e Indaial');
  });

  it('resume quando passa do limite', () => {
    expect(formatarLista(['Blumenau', 'Timbó', 'Indaial', 'Gaspar', 'Pomerode'])).toBe(
      'Blumenau, Timbó, Indaial +2',
    );
  });

  it('devolve o item único ou vazio sem conectivo', () => {
    expect(formatarLista(['Blumenau'])).toBe('Blumenau');
    expect(formatarLista([])).toBe('');
  });
});
