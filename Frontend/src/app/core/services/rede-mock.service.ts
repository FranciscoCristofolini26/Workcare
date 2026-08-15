import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, defer, ignoreElements, merge, shareReplay, tap, timer } from 'rxjs';
import {
  Atendimento,
  Contato,
  EventoWhatsapp,
  RedeSnapshot,
  TipoEvento,
  TipoUnidade,
  Unidade,
} from '../models/rede.model';
import { GeradorAleatorio, criarGeradorAleatorio } from '../utils/aleatorio';
import { INTERVALO_ATUALIZACAO, RedeDataService, SEMENTE_SIMULACAO } from './rede-data.service';

const NOMES = [
  'Maria Silveira',
  'João Pereira',
  'Ana Clara Moraes',
  'Carlos Antunes',
  'Beatriz Ramalho',
  'Rafael Nogueira',
  'Luciana Prado',
  'Marcos Vinícius Rocha',
  'Fernanda Lopes',
  'Paulo Henrique Dias',
  'Sônia Bastos',
  'Eduardo Camargo',
];

interface DescricaoUnidade {
  id: string;
  nome: string;
  municipio: string;
  tipo: TipoUnidade;
  bairro: string;
  lat: number;
  lng: number;
  esperaBase: number;
  ocupacaoPercentual: number;
  porte: number;
  especialidades: readonly string[];
}

const CATALOGO: readonly DescricaoUnidade[] = [
  {
    id: 'blu-01',
    nome: 'Hospital Santa Isabel',
    municipio: 'Blumenau',
    tipo: 'Hospital',
    bairro: 'Vorstadt',
    lat: -26.9145,
    lng: -49.073,
    esperaBase: 84,
    ocupacaoPercentual: 86,
    porte: 3,
    especialidades: ['Clínica Geral', 'Cardiologia', 'Ortopedia', 'Neurologia', 'Oncologia', 'Cirurgia Geral'],
  },
  {
    id: 'blu-02',
    nome: 'Hospital Santo Antônio',
    municipio: 'Blumenau',
    tipo: 'Hospital',
    bairro: 'Itoupava Seca',
    lat: -26.9028,
    lng: -49.0742,
    esperaBase: 71,
    ocupacaoPercentual: 82,
    porte: 2.4,
    especialidades: ['Clínica Geral', 'Ginecologia e Obstetrícia', 'Pediatria', 'Cirurgia Geral', 'Ortopedia'],
  },
  {
    id: 'blu-03',
    nome: 'Hospital Santa Catarina',
    municipio: 'Blumenau',
    tipo: 'Hospital',
    bairro: 'Garcia',
    lat: -26.937,
    lng: -49.0728,
    esperaBase: 63,
    ocupacaoPercentual: 77,
    porte: 2.2,
    especialidades: ['Clínica Geral', 'Cardiologia', 'Ortopedia', 'Oncologia'],
  },
  {
    id: 'blu-04',
    nome: 'Hospital Municipal Dr. Ruth Cardoso',
    municipio: 'Blumenau',
    tipo: 'Hospital',
    bairro: 'Itoupava Central',
    lat: -26.8156,
    lng: -49.108,
    esperaBase: 96,
    ocupacaoPercentual: 92,
    porte: 2.8,
    especialidades: ['Clínica Geral', 'Pediatria', 'Ortopedia', 'Cirurgia Geral', 'Neurologia'],
  },
  {
    id: 'blu-05',
    nome: 'Pronto Atendimento Água Verde',
    municipio: 'Blumenau',
    tipo: 'Pronto Atendimento',
    bairro: 'Água Verde',
    lat: -26.9545,
    lng: -49.1015,
    esperaBase: 58,
    ocupacaoPercentual: 74,
    porte: 1.6,
    especialidades: ['Clínica Geral', 'Pediatria', 'Ortopedia'],
  },
  {
    id: 'blu-06',
    nome: 'Pronto Atendimento Badenfurt',
    municipio: 'Blumenau',
    tipo: 'Pronto Atendimento',
    bairro: 'Badenfurt',
    lat: -26.8676,
    lng: -49.122,
    esperaBase: 47,
    ocupacaoPercentual: 66,
    porte: 1.3,
    especialidades: ['Clínica Geral', 'Pediatria'],
  },
  {
    id: 'blu-07',
    nome: 'Pronto Atendimento Velha',
    municipio: 'Blumenau',
    tipo: 'Pronto Atendimento',
    bairro: 'Velha',
    lat: -26.9422,
    lng: -49.112,
    esperaBase: 66,
    ocupacaoPercentual: 79,
    porte: 1.5,
    especialidades: ['Clínica Geral', 'Pediatria', 'Ortopedia'],
  },
  {
    id: 'blu-08',
    nome: 'Pronto Atendimento Fortaleza',
    municipio: 'Blumenau',
    tipo: 'Pronto Atendimento',
    bairro: 'Fortaleza',
    lat: -26.857,
    lng: -49.08,
    esperaBase: 39,
    ocupacaoPercentual: 61,
    porte: 1.2,
    especialidades: ['Clínica Geral', 'Pediatria'],
  },
  {
    id: 'blu-09',
    nome: 'Policlínica de Blumenau',
    municipio: 'Blumenau',
    tipo: 'Policlínica',
    bairro: 'Centro',
    lat: -26.921,
    lng: -49.064,
    esperaBase: 34,
    ocupacaoPercentual: 57,
    porte: 2,
    especialidades: [
      'Cardiologia',
      'Dermatologia',
      'Oftalmologia',
      'Endocrinologia',
      'Otorrinolaringologia',
      'Psiquiatria',
    ],
  },
  {
    id: 'blu-10',
    nome: 'Unidade de Saúde Escola Agrícola',
    municipio: 'Blumenau',
    tipo: 'UBS',
    bairro: 'Escola Agrícola',
    lat: -26.935,
    lng: -49.091,
    esperaBase: 22,
    ocupacaoPercentual: 38,
    porte: 1,
    especialidades: ['Clínica Geral', 'Pediatria', 'Ginecologia e Obstetrícia', 'Odontologia'],
  },
  {
    id: 'tim-01',
    nome: 'Hospital e Maternidade Oase',
    municipio: 'Timbó',
    tipo: 'Hospital',
    bairro: 'Centro',
    lat: -26.824,
    lng: -49.274,
    esperaBase: 52,
    ocupacaoPercentual: 69,
    porte: 2,
    especialidades: ['Clínica Geral', 'Ginecologia e Obstetrícia', 'Pediatria', 'Cirurgia Geral'],
  },
  {
    id: 'tim-02',
    nome: 'Pronto Atendimento Municipal de Timbó',
    municipio: 'Timbó',
    tipo: 'Pronto Atendimento',
    bairro: 'Centro',
    lat: -26.8265,
    lng: -49.269,
    esperaBase: 41,
    ocupacaoPercentual: 63,
    porte: 1.4,
    especialidades: ['Clínica Geral', 'Pediatria', 'Ortopedia'],
  },
  {
    id: 'tim-03',
    nome: 'Unidade de Saúde Imigrantes',
    municipio: 'Timbó',
    tipo: 'UBS',
    bairro: 'Imigrantes',
    lat: -26.832,
    lng: -49.265,
    esperaBase: 25,
    ocupacaoPercentual: 41,
    porte: 0.9,
    especialidades: ['Clínica Geral', 'Pediatria', 'Odontologia'],
  },
  {
    id: 'tim-04',
    nome: 'Unidade de Saúde Araponguinhas',
    municipio: 'Timbó',
    tipo: 'UBS',
    bairro: 'Araponguinhas',
    lat: -26.809,
    lng: -49.262,
    esperaBase: 19,
    ocupacaoPercentual: 33,
    porte: 0.8,
    especialidades: ['Clínica Geral', 'Ginecologia e Obstetrícia', 'Odontologia'],
  },
];

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

function apelido(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');
}

const IMAGENS: Record<TipoUnidade, string> = {
  Hospital: 'unidades/hospital.svg',
  'Pronto Atendimento': 'unidades/pronto-atendimento.svg',
  'Policlínica': 'unidades/policlinica.svg',
  UBS: 'unidades/ubs.svg',
};

function montarContato(descricao: DescricaoUnidade, indice: number): Contato {
  const sufixo = (indice + 1).toString().padStart(2, '0');
  const integral = descricao.tipo === 'Hospital' || descricao.tipo === 'Pronto Atendimento';

  return {
    telefone: `(47) 3000-00${sufixo}`,
    whatsapp: `(47) 99000-00${sufixo}`,
    email: `${apelido(descricao.nome)}@exemplo.sc.gov.br`,
    horario: integral
      ? 'Atendimento 24 horas, todos os dias'
      : 'Segunda a sexta, das 7h às 17h',
  };
}

@Injectable()
export class RedeMockService extends RedeDataService {
  private readonly intervalo = inject(INTERVALO_ATUALIZACAO);
  private readonly aleatorio: GeradorAleatorio = criarGeradorAleatorio(inject(SEMENTE_SIMULACAO));
  private sequencia = 0;

  private readonly estado = new BehaviorSubject<RedeSnapshot>(this.estadoInicial());

  private readonly pulso$ = timer(this.intervalo, this.intervalo).pipe(
    tap(() => this.estado.next(this.avancar(this.estado.value))),
    ignoreElements(),
  );

  override readonly rede$: Observable<RedeSnapshot> = defer(() =>
    merge(this.estado, this.pulso$),
  ).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  override reatribuirVaga(eventoId: string): void {
    const atual = this.estado.value;
    const alvo = atual.eventos.find((evento) => evento.id === eventoId);
    if (!alvo || alvo.tipo !== 'cancelado') {
      return;
    }

    const eventos = atual.eventos.map((evento) =>
      evento.id === eventoId
        ? {
            ...evento,
            tipo: 'reatribuido' as TipoEvento,
            origem: 'automatico' as const,
            registradoEm: new Date(),
          }
        : evento,
    );

    const unidades = atual.unidades.map((unidade) =>
      unidade.id === alvo.unidadeId
        ? {
            ...unidade,
            atendimentos: unidade.atendimentos.map((atendimento) =>
              atendimento.especialidade === alvo.especialidade
                ? { ...atendimento, vagasSalvas: atendimento.vagasSalvas + 1 }
                : atendimento,
            ),
          }
        : unidade,
    );

    this.estado.next({ unidades, eventos, atualizadoEm: new Date() });
  }

  private estadoInicial(): RedeSnapshot {
    const unidades = CATALOGO.map((descricao, indice) => this.montarUnidade(descricao, indice));
    const agora = Date.now();
    const eventos = Array.from({ length: 12 }, (_, indice) =>
      this.criarEvento(unidades, new Date(agora - (indice + 1) * 96000)),
    );

    return { unidades, eventos, atualizadoEm: new Date(agora) };
  }

  private montarUnidade(descricao: DescricaoUnidade, indice: number): Unidade {
    return {
      id: descricao.id,
      nome: descricao.nome,
      municipio: descricao.municipio,
      tipo: descricao.tipo,
      bairro: descricao.bairro,
      posicao: { lat: descricao.lat, lng: descricao.lng },
      imagem: IMAGENS[descricao.tipo],
      online: true,
      ocupacaoPercentual: descricao.ocupacaoPercentual,
      contato: montarContato(descricao, indice),
      atendimentos: descricao.especialidades.map((especialidade) =>
        this.montarAtendimento(descricao, especialidade),
      ),
    };
  }

  private montarAtendimento(descricao: DescricaoUnidade, especialidade: string): Atendimento {
    const variacao = 0.75 + this.aleatorio.proximo() * 0.5;
    const agendamentosHoje = Math.round(descricao.porte * this.aleatorio.inteiro(14, 32));
    const faltasHoje = Math.round(agendamentosHoje * (0.1 + this.aleatorio.proximo() * 0.12));
    const vagasSalvas = Math.round(faltasHoje * (0.3 + this.aleatorio.proximo() * 0.4));
    const faltasEvitadas = Math.round(agendamentosHoje * (0.08 + this.aleatorio.proximo() * 0.14));

    return {
      especialidade,
      esperaMinutos: limitar(Math.round(descricao.esperaBase * variacao), 6, 180),
      pacientesAguardando: Math.round(descricao.porte * this.aleatorio.inteiro(3, 15)),
      agendamentosHoje,
      faltasHoje,
      faltasEvitadas,
      vagasSalvas,
    };
  }

  private avancar(atual: RedeSnapshot): RedeSnapshot {
    const unidades = atual.unidades.map((unidade) => this.evoluirUnidade(unidade));
    const novos = this.aleatorio.chance(0.75) ? [this.criarEvento(unidades, new Date())] : [];
    const eventos = [...novos, ...atual.eventos].slice(0, 40);
    const comImpacto = this.aplicarImpacto(unidades, novos);

    return { unidades: comImpacto, eventos, atualizadoEm: new Date() };
  }

  private evoluirUnidade(unidade: Unidade): Unidade {
    return {
      ...unidade,
      ocupacaoPercentual: limitar(
        unidade.ocupacaoPercentual + this.aleatorio.inteiro(-3, 4),
        12,
        100,
      ),
      online: this.aleatorio.chance(0.98) ? unidade.online : !unidade.online,
      atendimentos: unidade.atendimentos.map((atendimento) => ({
        ...atendimento,
        esperaMinutos: limitar(atendimento.esperaMinutos + this.aleatorio.inteiro(-7, 8), 6, 180),
        pacientesAguardando: limitar(
          atendimento.pacientesAguardando + this.aleatorio.inteiro(-3, 4),
          0,
          90,
        ),
      })),
    };
  }

  private aplicarImpacto(
    unidades: readonly Unidade[],
    eventos: readonly EventoWhatsapp[],
  ): readonly Unidade[] {
    if (eventos.length === 0) {
      return unidades;
    }

    return unidades.map((unidade) => {
      const relacionados = eventos.filter((evento) => evento.unidadeId === unidade.id);
      if (relacionados.length === 0) {
        return unidade;
      }

      return {
        ...unidade,
        atendimentos: unidade.atendimentos.map((atendimento) => {
          const daEspecialidade = relacionados.filter(
            (evento) => evento.especialidade === atendimento.especialidade,
          );
          if (daEspecialidade.length === 0) {
            return atendimento;
          }

          const contar = (tipo: TipoEvento) =>
            daEspecialidade.filter((evento) => evento.tipo === tipo).length;

          return {
            ...atendimento,
            agendamentosHoje: atendimento.agendamentosHoje + daEspecialidade.length,
            faltasHoje: atendimento.faltasHoje + contar('cancelado'),
            faltasEvitadas: atendimento.faltasEvitadas + contar('confirmado'),
            vagasSalvas: atendimento.vagasSalvas + contar('reatribuido'),
          };
        }),
      };
    });
  }

  private criarEvento(unidades: readonly Unidade[], registradoEm: Date): EventoWhatsapp {
    const unidade = this.aleatorio.item(unidades);
    const atendimento = this.aleatorio.item(unidade.atendimentos);
    const sorteio = this.aleatorio.proximo();
    const tipo: TipoEvento =
      sorteio < 0.45 ? 'cancelado' : sorteio < 0.78 ? 'reatribuido' : 'confirmado';
    const hora = this.aleatorio.inteiro(7, 18).toString().padStart(2, '0');
    const minuto = this.aleatorio.item(['00', '15', '30', '45']);
    this.sequencia += 1;

    return {
      id: `evt-${this.sequencia}-${registradoEm.getTime()}`,
      paciente: this.aleatorio.item(NOMES),
      especialidade: atendimento.especialidade,
      unidadeId: unidade.id,
      unidadeNome: unidade.nome,
      municipio: unidade.municipio,
      horarioConsulta: `${hora}:${minuto}`,
      tipo,
      origem: tipo === 'reatribuido' ? 'automatico' : 'paciente',
      registradoEm,
    };
  }
}
