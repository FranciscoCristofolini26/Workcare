import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { App } from './app';
import { RedeDataService } from './core/services/rede-data.service';
import { RedeMockService } from './core/services/rede-mock.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: RedeDataService, useClass: RedeMockService },
      ],
    }).compileComponents();
  });

  it('cria a aplicação', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renderiza o atalho para o conteúdo principal', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;

    expect(elemento.querySelector('.atalho-conteudo')?.textContent).toContain(
      'Ir para o conteúdo principal',
    );
    expect(elemento.querySelector('main')?.id).toBe('conteudo-principal');
  });

  it('expõe a navegação principal com os quatro módulos', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;
    const itens = Array.from(elemento.querySelectorAll('.navegacao__rotulo')).map((item) =>
      item.textContent?.trim(),
    );

    expect(itens).toEqual(['Painel geral', 'Contato', 'Unidades', 'Relatórios']);
  });

  it('mantém os controles de aparência na navegação e exibe o acesso ao login no cabeçalho', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;

    expect(
      elemento.querySelector('.navegacao__acessibilidade app-controles-acessibilidade'),
    ).toBeTruthy();
    expect(elemento.querySelector('.cabecalho__acoes app-controles-acessibilidade')).toBeNull();
    expect(
      elemento.querySelector<HTMLAnchorElement>('.cabecalho__login')?.getAttribute('href'),
    ).toBe('/login');
  });
});
