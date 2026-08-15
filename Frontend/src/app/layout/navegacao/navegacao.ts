import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { RedeStore } from '../../core/services/rede.store';
import { Icone, NomeIcone } from '../../shared/ui/icone/icone';
import { ControlesAcessibilidade } from '../controles-acessibilidade/controles-acessibilidade';

interface ItemNavegacao {
  rota: string;
  rotulo: string;
  icone: NomeIcone;
  descricao: string;
}

const ITENS: readonly ItemNavegacao[] = [
  { rota: '/painel', rotulo: 'Painel geral', icone: 'painel', descricao: 'Indicadores da rede' },
  { rota: '/contato', rotulo: 'Contato', icone: 'telefone', descricao: 'Canais das unidades' },
  { rota: '/unidades', rotulo: 'Unidades', icone: 'unidades', descricao: 'Mapa e lotação' },
  { rota: '/relatorios', rotulo: 'Relatórios', icone: 'relatorios', descricao: 'Consolidados' },
];

@Component({
  selector: 'app-navegacao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Icone, ControlesAcessibilidade],
  templateUrl: './navegacao.html',
  styleUrl: './navegacao.scss',
})
export class Navegacao {
  private readonly store = inject(RedeStore);

  readonly aberta = input<boolean>(false);
  readonly fechar = output<void>();

  protected readonly itens = ITENS;
  protected readonly indicadores = this.store.indicadores;
}
