import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icone, NomeIcone } from '../icone/icone';
import { Etiqueta, TomEtiqueta } from '../etiqueta/etiqueta';

@Component({
  selector: 'app-cartao-kpi',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icone, Etiqueta],
  templateUrl: './cartao-kpi.html',
  styleUrl: './cartao-kpi.scss',
})
export class CartaoKpi {
  readonly rotulo = input.required<string>();
  readonly valor = input.required<string>();
  readonly unidade = input<string>('');
  readonly descricao = input.required<string>();
  readonly icone = input.required<NomeIcone>();
  readonly destaque = input.required<string>();
  readonly tom = input<TomEtiqueta>('neutro');
  readonly progresso = input<number>(0);
  readonly progressoRotulo = input<string>('');

  protected readonly larguraProgresso = computed(
    () => `${Math.min(100, Math.max(0, this.progresso()))}%`,
  );

  protected readonly classeMedidor = computed(() => {
    const tom = this.tom();
    return tom === 'neutro' || tom === 'primario'
      ? 'medidor__preenchimento--primario'
      : `medidor__preenchimento--${tom}`;
  });
}
