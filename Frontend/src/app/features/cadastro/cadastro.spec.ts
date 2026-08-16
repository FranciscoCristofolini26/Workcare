import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RedeDataService } from '../../core/services/rede-data.service';
import { RedeMockService } from '../../core/services/rede-mock.service';
import { Cadastro } from './cadastro';

describe('Cadastro', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Cadastro],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: RedeDataService, useClass: RedeMockService },
      ],
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

  it('abre o cadastro corporativo e lista as unidades para vincular', async () => {
    const fixture = TestBed.createComponent(Cadastro);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;

    const abas = Array.from(elemento.querySelectorAll<HTMLButtonElement>('.cadastro__aba'));
    expect(abas.map((aba) => aba.textContent?.trim())).toEqual([
      'Sou paciente',
      'Sou empresa ou hospital',
    ]);

    abas[1].click();
    await fixture.whenStable();

    expect(elemento.querySelector('h1')?.textContent).toContain('Cadastre sua empresa ou hospital');
    expect(elemento.querySelector('input[formControlName="cnpj"]')).toBeTruthy();
    expect(elemento.querySelectorAll('.unidades-escolha__item').length).toBeGreaterThan(0);
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
