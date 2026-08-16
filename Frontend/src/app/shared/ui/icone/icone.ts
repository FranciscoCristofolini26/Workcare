import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type NomeIcone =
  | 'painel'
  | 'fila'
  | 'unidades'
  | 'relatorios'
  | 'buscar'
  | 'filtro'
  | 'sol'
  | 'lua'
  | 'fonte'
  | 'menu'
  | 'fechar'
  | 'relogio'
  | 'telefone'
  | 'email'
  | 'usuarios'
  | 'ausencia'
  | 'confirmado'
  | 'agenda'
  | 'rota'
  | 'localizacao'
  | 'atualizar'
  | 'alerta'
  | 'recolher';

const TRACADOS: Record<NomeIcone, string> = {
  painel: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  fila: 'M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.6 8.6 0 0 1-4-1L3 20l1.2-5.3a8.3 8.3 0 0 1-1.1-4.2A8.4 8.4 0 0 1 11.6 2 8.5 8.5 0 0 1 21 11.5z',
  unidades: 'M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11zM12 7v6M9 10h6',
  relatorios: 'M4 20h16M7 20V9M12 20V4M17 20v-7',
  buscar: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  filtro: 'M4 6h16M7 12h10M10 18h4',
  sol: 'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8',
  lua: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
  fonte: 'M5 20l5.5-15h3L19 20M8 14h8',
  menu: 'M4 7h16M4 12h16M4 17h16',
  fechar: 'M6 6l12 12M18 6L6 18',
  relogio: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3.5 2',
  telefone:
    'M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-4.5-2-2.5 2.5a13.5 13.5 0 0 1-6.5-6.5L10 8.5z',
  email: 'M3 6h18v12H3zM3 7l9 6.5L21 7',
  usuarios:
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-3.9 3.1-7 7-7s7 3.1 7 7M17 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2.4.8 4 3 4 5.5',
  ausencia:
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-3.9 3.1-7 7-7 1.4 0 2.7.4 3.8 1.1M16 15l6 6M22 15l-6 6',
  confirmado: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12l2.75 2.75L16 9.5',
  agenda: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4',
  rota: 'M6 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM9 17h5a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h4',
  localizacao: 'M12 2v3M12 19v3M2 12h3M19 12h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  atualizar: 'M4 12a8 8 0 0 1 13.7-5.7L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.7L4 16M4 20v-4h4',
  alerta: 'M12 4l9 16H3zM12 10v4M12 17.5v.5',
  recolher: 'M6 14.5l6-6 6 6',
};

@Component({
  selector: 'app-icone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="tamanho()"
      [attr.height]="tamanho()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.9"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path [attr.d]="tracado()"></path>
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      line-height: 0;
    }
  `,
})
export class Icone {
  readonly nome = input.required<NomeIcone>();
  readonly tamanho = input<number>(22);

  protected readonly tracado = computed(() => TRACADOS[this.nome()]);
}
