import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  EventoWhatsapp,
  NivelEspera,
  REDE_VAZIA,
  TODAS_ESPECIALIDADES,
  UnidadeResumo,
  calcularIndicadores,
  nivelPorEspera,
  resumirRede,
} from '../models/rede.model';
import { RedeDataService } from './rede-data.service';

export type FiltroNivel = NivelEspera | 'todos';

export const TODOS_MUNICIPIOS = 'todos';

export { TODAS_ESPECIALIDADES };

@Injectable({ providedIn: 'root' })
export class RedeStore {
  private readonly dados = inject(RedeDataService);

  private readonly snapshot = toSignal(this.dados.rede$, { initialValue: REDE_VAZIA });

  readonly municipio = signal<string>(TODOS_MUNICIPIOS);
  readonly especialidade = signal<string>(TODAS_ESPECIALIDADES);
  readonly nivel = signal<FiltroNivel>('todos');
  readonly busca = signal<string>('');
  readonly unidadeSelecionadaId = signal<string | null>(null);

  readonly atualizadoEm = computed(() => this.snapshot().atualizadoEm);

  readonly municipios = computed(() =>
    [...new Set(this.snapshot().unidades.map((unidade) => unidade.municipio))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    ),
  );

  readonly especialidades = computed(() =>
    [
      ...new Set(
        this.snapshot()
          .unidades.flatMap((unidade) => unidade.atendimentos)
          .map((atendimento) => atendimento.especialidade),
      ),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  );

  readonly unidadesDoMunicipio = computed<readonly UnidadeResumo[]>(() => {
    const municipio = this.municipio();
    const doMunicipio =
      municipio === TODOS_MUNICIPIOS
        ? this.snapshot().unidades
        : this.snapshot().unidades.filter((unidade) => unidade.municipio === municipio);

    return resumirRede(doMunicipio, this.especialidade());
  });

  readonly unidades = computed<readonly UnidadeResumo[]>(() => {
    const nivel = this.nivel();
    const termo = this.busca().trim().toLocaleLowerCase('pt-BR');

    return this.unidadesDoMunicipio().filter((unidade) => {
      const casaNivel = nivel === 'todos' || nivelPorEspera(unidade.esperaMinutos) === nivel;
      const casaBusca =
        termo.length === 0 ||
        unidade.nome.toLocaleLowerCase('pt-BR').includes(termo) ||
        unidade.municipio.toLocaleLowerCase('pt-BR').includes(termo) ||
        unidade.bairro.toLocaleLowerCase('pt-BR').includes(termo);
      return casaNivel && casaBusca;
    });
  });

  readonly indicadores = computed(() => calcularIndicadores(this.unidadesDoMunicipio()));

  readonly eventos = computed<readonly EventoWhatsapp[]>(() => {
    const municipio = this.municipio();
    const especialidade = this.especialidade();

    return this.snapshot().eventos.filter(
      (evento) =>
        (municipio === TODOS_MUNICIPIOS || evento.municipio === municipio) &&
        (especialidade === TODAS_ESPECIALIDADES || evento.especialidade === especialidade),
    );
  });

  readonly cancelamentosAbertos = computed(
    () => this.eventos().filter((evento) => evento.tipo === 'cancelado').length,
  );

  readonly unidadeSelecionada = computed<UnidadeResumo | null>(() => {
    const id = this.unidadeSelecionadaId();
    return id === null ? null : (this.unidades().find((unidade) => unidade.id === id) ?? null);
  });

  readonly distribuicaoPorNivel = computed(() => {
    const contagem: Record<NivelEspera, number> = { baixa: 0, media: 0, alta: 0 };
    for (const unidade of this.unidadesDoMunicipio()) {
      contagem[nivelPorEspera(unidade.esperaMinutos)] += 1;
    }
    return contagem;
  });

  definirMunicipio(municipio: string): void {
    this.municipio.set(municipio);
    this.unidadeSelecionadaId.set(null);
  }

  definirEspecialidade(especialidade: string): void {
    this.especialidade.set(especialidade);
    this.unidadeSelecionadaId.set(null);
  }

  definirNivel(nivel: FiltroNivel): void {
    this.nivel.set(nivel);
  }

  definirBusca(termo: string): void {
    this.busca.set(termo);
  }

  selecionarUnidade(id: string | null): void {
    this.unidadeSelecionadaId.set(id);
  }

  reatribuirVaga(eventoId: string): void {
    this.dados.reatribuirVaga(eventoId);
  }
}
