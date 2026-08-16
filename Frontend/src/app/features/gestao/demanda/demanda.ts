import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  ATENDIMENTOS_POR_PROFISSIONAL_HORA,
  NOMES_DIA_SEMANA,
  formatarFaixaHoraria,
} from '../../../core/models/gestao.model';
import { GestaoStore } from '../../../core/services/gestao.store';
import { MapaCalor } from '../../../shared/graficos/mapa-calor/mapa-calor';
import { Etiqueta } from '../../../shared/ui/etiqueta/etiqueta';
import { FiltrosGestao } from '../filtros-gestao/filtros-gestao';

@Component({
  selector: 'app-gestao-demanda',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FiltrosGestao, MapaCalor, Etiqueta],
  templateUrl: './demanda.html',
  styleUrl: './demanda.scss',
})
export class Demanda {
  protected readonly store = inject(GestaoStore);

  protected readonly produtividade = ATENDIMENTOS_POR_PROFISSIONAL_HORA;
  protected readonly picos = this.store.picos;

  protected readonly rotuloJanela = computed(
    () => `Média por faixa de horário nos últimos ${this.store.diasDaDemandaTotal()} dias`,
  );

  protected readonly totalPorDia = computed(() => {
    const celulas = this.store.demanda();
    return NOMES_DIA_SEMANA.map((nome, indice) => ({
      nome,
      indice,
      total: celulas
        .filter((celula) => celula.diaSemana === indice)
        .reduce((soma, celula) => soma + celula.atendimentos, 0),
    })).sort((a, b) => b.total - a.total);
  });

  protected readonly diaMaisCheio = computed(() => this.totalPorDia()[0] ?? null);

  protected readonly equipeNoPico = computed(() =>
    this.picos().reduce((maior, pico) => Math.max(maior, pico.equipeSugerida), 0),
  );

  protected diaSemana(indice: number): string {
    return NOMES_DIA_SEMANA[indice];
  }

  protected faixa(hora: number): string {
    return formatarFaixaHoraria(hora);
  }
}
