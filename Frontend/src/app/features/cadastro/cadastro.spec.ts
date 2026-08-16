import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Cadastro } from './cadastro';

describe('Cadastro', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Cadastro],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
  });

  it('exibe os dados pessoais e o endereço padrão', async () => {
    const fixture = TestBed.createComponent(Cadastro);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;

    expect(elemento.querySelector('h1')?.textContent).toContain('Cadastre sua localização padrão');
    expect(elemento.querySelectorAll('input')).toHaveLength(11);
    expect(elemento.textContent).toContain('localização atual');
  });

  it('impede o envio quando os campos obrigatórios estão vazios', async () => {
    const fixture = TestBed.createComponent(Cadastro);
    await fixture.whenStable();
    const formulario = fixture.nativeElement.querySelector('form') as HTMLFormElement;

    formulario.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Revise os campos obrigatórios destacados.',
    );
  });
});
