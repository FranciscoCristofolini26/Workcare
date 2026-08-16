import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { EmpresaService } from '../../core/services/empresa.service';
import { LocalizacaoService } from '../../core/services/localizacao.service';
import { PerfilService } from '../../core/services/perfil.service';
import { Icone, NomeIcone } from '../../shared/ui/icone/icone';
import { ControlesAcessibilidade } from '../controles-acessibilidade/controles-acessibilidade';

interface ItemNavegacao {
  rota: string;
  rotulo: string;
  icone: NomeIcone;
  descricao: string;
  exato?: boolean;
}

const ITENS: readonly ItemNavegacao[] = [
  { rota: '/painel', rotulo: 'Painel geral', icone: 'painel', descricao: 'Indicadores da rede' },
  { rota: '/contato', rotulo: 'Contato', icone: 'telefone', descricao: 'Canais das unidades' },
  { rota: '/unidades', rotulo: 'Unidades', icone: 'unidades', descricao: 'Mapa e lotação' },
];

const ITENS_GESTAO: readonly ItemNavegacao[] = [
  {
    rota: '/gestao',
    rotulo: 'Painel de gestão',
    icone: 'painel',
    descricao: 'Visão executiva',
    exato: true,
  },
  {
    rota: '/gestao/fluxo',
    rotulo: 'Fluxo de pacientes',
    icone: 'rota',
    descricao: 'Entradas e saídas',
  },
  {
    rota: '/gestao/demanda',
    rotulo: 'Maior demanda',
    icone: 'relogio',
    descricao: 'Picos e escala',
  },
  {
    rota: '/gestao/desempenho',
    rotulo: 'Desempenho',
    icone: 'relatorios',
    descricao: 'Metas por unidade',
  },
  { rota: '/gestao/relatorios', rotulo: 'Relatórios', icone: 'agenda', descricao: 'Consolidados' },
  {
    rota: '/gestao/unidades',
    rotulo: 'Unidades administradas',
    icone: 'localizacao',
    descricao: 'Vínculos da empresa',
  },
];

@Component({
  selector: 'app-navegacao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Icone, ControlesAcessibilidade],
  templateUrl: './navegacao.html',
  styleUrl: './navegacao.scss',
})
export class Navegacao {
  private readonly empresaService = inject(EmpresaService);
  private readonly perfilService = inject(PerfilService);
  private readonly localizacao = inject(LocalizacaoService);
  private readonly roteador = inject(Router);

  readonly aberta = input<boolean>(false);
  readonly fechar = output<void>();

  protected readonly itensGestao = ITENS_GESTAO;
  protected readonly empresa = this.empresaService.empresa;

  /** Com o cadastro salvo, o acesso ao próprio perfil migra do cabeçalho para o menu. */
  protected readonly itens = computed<readonly ItemNavegacao[]>(() =>
    this.perfilService.perfil() === null
      ? ITENS
      : [
          ...ITENS,
          {
            rota: '/cadastro',
            rotulo: 'Meu cadastro',
            icone: 'usuarios',
            descricao: 'Endereço padrão',
          },
        ],
  );

  /** Há sessão a encerrar quando existe conta corporativa ou cadastro de paciente. */
  protected readonly identificado = computed(
    () => this.empresaService.autenticada() || this.perfilService.perfil() !== null,
  );

  protected sair(): void {
    this.empresaService.sair();
    this.perfilService.limpar();
    this.localizacao.limparLocalizacaoPadrao();
    this.fechar.emit();
    void this.roteador.navigate(['/bem-vindo']);
  }
}
