import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FiltroNivel, RedeStore, TODAS_ESPECIALIDADES } from '../../core/services/rede.store';
import { NivelEspera } from '../../core/models/rede.model';
import {
  formatarHora,
  formatarMinutos,
  formatarNumero,
  formatarPercentual,
} from '../../core/utils/formatacao';
import { CartaoKpi } from '../../shared/ui/cartao-kpi/cartao-kpi';
import { MapaRede } from '../../shared/mapa-rede/mapa-rede';
import { FiltroEspecialidade } from '../../shared/ui/filtro-especialidade/filtro-especialidade';

interface OpcaoNivel {
  valor: FiltroNivel;
  rotulo: string;
}

const OPCOES_NIVEL: readonly OpcaoNivel[] = [
  { valor: 'todos', rotulo: 'Todas' },
  { valor: 'baixa', rotulo: 'Espera baixa' },
  { valor: 'media', rotulo: 'Espera média' },
  { valor: 'alta', rotulo: 'Espera alta' },
];

@Component({
  selector: 'app-painel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CartaoKpi, MapaRede, FiltroEspecialidade],
  templateUrl: './painel.html',
  styleUrl: './painel.scss',
})
export class Painel {
  protected readonly store = inject(RedeStore);

  protected readonly opcoesNivel = OPCOES_NIVEL;
  protected readonly indicadores = this.store.indicadores;
  protected readonly unidades = this.store.unidades;
  protected readonly distribuicao = this.store.distribuicaoPorNivel;

  protected readonly faltantes = computed(() => formatarNumero(this.indicadores().pacientesFaltantes));
  protected readonly absenteismo = computed(() => formatarPercentual(this.indicadores().taxaAbsenteismo));
  protected readonly vagasSalvas = computed(() => formatarNumero(this.indicadores().vagasSalvas));
  protected readonly faltasEvitadas = computed(() =>
    formatarNumero(this.indicadores().faltasEvitadas),
  );
  protected readonly confirmacao = computed(() =>
    formatarPercentual(this.indicadores().taxaConfirmacao),
  );
  protected readonly esperaMedia = computed(() => this.indicadores().esperaMediaMinutos);
  protected readonly esperaMediaTexto = computed(() => formatarMinutos(this.esperaMedia()));

  protected readonly especialidadeAtiva = computed(
    () => this.store.especialidade() !== TODAS_ESPECIALIDADES,
  );

  protected readonly recorte = computed(() => {
    const total = this.indicadores().unidadesTotal;
    const unidades = total === 1 ? '1 unidade' : `${total} unidades`;
    return this.especialidadeAtiva()
      ? `${unidades} com ${this.store.especialidade()}`
      : `${unidades} monitoradas`;
  });

  protected readonly contextoKpi = computed(() =>
    this.especialidadeAtiva() ? ` em ${this.store.especialidade()}` : '',
  );

  protected readonly aproveitamento = computed(() => {
    const dados = this.indicadores();
    const base = dados.pacientesFaltantes + dados.vagasSalvas;
    return base === 0 ? 0 : (dados.vagasSalvas / base) * 100;
  });

  protected readonly tomEspera = computed(() => {
    const minutos = this.esperaMedia();
    if (minutos <= 30) {
      return 'sucesso' as const;
    }
    return minutos <= 60 ? ('alerta' as const) : ('perigo' as const);
  });

  protected readonly atualizadoEm = computed(() => formatarHora(this.store.atualizadoEm()));

  protected readonly resumoDistribuicao = computed(() => {
    const dados = this.distribuicao();
    return `${dados.baixa} unidades com espera baixa, ${dados.media} com espera média e ${dados.alta} com espera alta.`;
  });

  protected definirNivel(valor: FiltroNivel): void {
    this.store.definirNivel(valor);
  }

  protected selecionarUnidade(id: string | null): void {
    this.store.selecionarUnidade(id);
  }

  protected contagem(nivel: NivelEspera): number {
    return this.distribuicao()[nivel];
  }
}
