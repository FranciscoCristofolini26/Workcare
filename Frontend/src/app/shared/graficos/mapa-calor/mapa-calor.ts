import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import {
  DemandaCelula,
  NOMES_DIA_SEMANA,
  NOMES_DIA_SEMANA_CURTO,
  formatarFaixaHoraria,
} from '../../../core/models/gestao.model';

interface CelulaCalor {
  diaSemana: number;
  hora: number;
  atendimentos: number;
  nivel: number;
  descricao: string;
}

interface LinhaCalor {
  diaSemana: number;
  nome: string;
  curto: string;
  total: number;
  celulas: readonly CelulaCalor[];
}

const NIVEIS = 6;

@Component({
  selector: 'app-mapa-calor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mapa-calor.html',
  styleUrl: './mapa-calor.scss',
})
export class MapaCalor {
  readonly celulas = input.required<readonly DemandaCelula[]>();
  readonly rotuloJanela = input<string>('média por faixa de horário');

  protected readonly horas = Array.from({ length: 24 }, (_, hora) => hora);
  protected readonly escala = Array.from({ length: NIVEIS }, (_, indice) => indice + 1);

  protected readonly cursor = signal<{ dia: number; hora: number } | null>(null);

  protected readonly maximo = computed(() =>
    this.celulas().reduce((maior, celula) => Math.max(maior, celula.atendimentos), 0),
  );

  protected readonly linhas = computed<readonly LinhaCalor[]>(() => {
    const maximo = this.maximo();
    const porDia = new Map<number, DemandaCelula[]>();

    for (const celula of this.celulas()) {
      const atual = porDia.get(celula.diaSemana) ?? [];
      atual.push(celula);
      porDia.set(celula.diaSemana, atual);
    }

    return NOMES_DIA_SEMANA.map((nome, diaSemana) => {
      const doDia = (porDia.get(diaSemana) ?? []).sort((a, b) => a.hora - b.hora);
      return {
        diaSemana,
        nome,
        curto: NOMES_DIA_SEMANA_CURTO[diaSemana],
        total: doDia.reduce((soma, celula) => soma + celula.atendimentos, 0),
        celulas: this.horas.map((hora) => {
          const atendimentos = doDia.find((celula) => celula.hora === hora)?.atendimentos ?? 0;
          const nivel =
            atendimentos === 0 || maximo === 0
              ? 0
              : Math.max(1, Math.min(NIVEIS, Math.ceil((atendimentos / maximo) * NIVEIS)));

          return {
            diaSemana,
            hora,
            atendimentos,
            nivel,
            descricao: `${nome}, ${formatarFaixaHoraria(hora)}: ${atendimentos} entradas`,
          };
        }),
      };
    });
  });

  protected readonly ativa = computed<CelulaCalor | null>(() => {
    const cursor = this.cursor();
    if (!cursor) {
      return null;
    }
    return this.linhas()[cursor.dia]?.celulas[cursor.hora] ?? null;
  });

  protected readonly resumoAcessivel = computed(() => {
    const maior = this.celulas().reduce(
      (escolhida, celula) => (celula.atendimentos > escolhida.atendimentos ? celula : escolhida),
      this.celulas()[0] ?? { diaSemana: 0, hora: 0, atendimentos: 0 },
    );
    return `Mapa de calor da demanda por dia da semana e hora. Faixa mais movimentada: ${NOMES_DIA_SEMANA[maior.diaSemana]} às ${formatarFaixaHoraria(maior.hora)}, com ${maior.atendimentos} entradas.`;
  });

  protected apontar(dia: number, hora: number): void {
    this.cursor.set({ dia, hora });
  }

  protected limpar(): void {
    this.cursor.set(null);
  }

  protected rotuloHoraCurto(hora: number): string {
    return hora.toString().padStart(2, '0');
  }

  protected navegar(evento: KeyboardEvent): void {
    const atual = this.cursor() ?? { dia: 0, hora: -1 };
    const passos: Record<string, { dia: number; hora: number }> = {
      ArrowRight: { dia: atual.dia, hora: Math.min(23, atual.hora + 1) },
      ArrowLeft: { dia: atual.dia, hora: Math.max(0, atual.hora - 1) },
      ArrowDown: { dia: Math.min(6, atual.dia + 1), hora: Math.max(0, atual.hora) },
      ArrowUp: { dia: Math.max(0, atual.dia - 1), hora: Math.max(0, atual.hora) },
    };

    const destino = passos[evento.key];
    if (destino) {
      evento.preventDefault();
      this.cursor.set(destino);
      return;
    }

    if (evento.key === 'Escape') {
      this.limpar();
    }
  }
}
