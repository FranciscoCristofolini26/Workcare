import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CartaoKpi } from './cartao-kpi';

@Component({
  imports: [CartaoKpi],
  template: `
    <app-cartao-kpi
      rotulo="Taxa de faltas"
      valor="1.284"
      descricao="Pacientes faltantes hoje"
      icone="ausencia"
      destaque="18,4%"
      tom="perigo"
      [progresso]="progresso()"
      progressoRotulo="Percentual de absenteísmo"
    />
  `,
})
class Hospedeiro {
  readonly progresso = signal(18.4);
}

describe('CartaoKpi', () => {
  async function montar() {
    await TestBed.configureTestingModule({
      imports: [Hospedeiro],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    const fixture = TestBed.createComponent(Hospedeiro);
    await fixture.whenStable();
    return fixture;
  }

  it('exibe rótulo, valor e descrição', async () => {
    const fixture = await montar();
    const elemento = fixture.nativeElement as HTMLElement;

    expect(elemento.querySelector('.kpi__rotulo')?.textContent).toContain('Taxa de faltas');
    expect(elemento.querySelector('.kpi__numero')?.textContent).toContain('1.284');
    expect(elemento.querySelector('.kpi__descricao')?.textContent).toContain(
      'Pacientes faltantes hoje',
    );
  });

  it('publica o progresso como medidor acessível', async () => {
    const fixture = await montar();
    const medidor = (fixture.nativeElement as HTMLElement).querySelector('[role="meter"]');

    expect(medidor?.getAttribute('aria-valuenow')).toBe('18.4');
    expect(medidor?.getAttribute('aria-valuemin')).toBe('0');
    expect(medidor?.getAttribute('aria-valuemax')).toBe('100');
    expect(medidor?.getAttribute('aria-label')).toBe('Percentual de absenteísmo');
  });

  it('limita a largura da barra entre zero e cem por cento', async () => {
    const fixture = await montar();
    fixture.componentInstance.progresso.set(320);
    await fixture.whenStable();

    const barra = (fixture.nativeElement as HTMLElement).querySelector(
      '.medidor__preenchimento',
    ) as HTMLElement;

    expect(barra.style.width).toBe('100%');
  });
});
