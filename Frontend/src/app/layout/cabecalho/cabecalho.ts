import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  COM_PLANO,
  RedeStore,
  SEM_PLANO,
  TODOS_MUNICIPIOS,
  TODOS_PLANOS,
} from '../../core/services/rede.store';
import { EmpresaService } from '../../core/services/empresa.service';
import { PerfilService } from '../../core/services/perfil.service';
import { Icone } from '../../shared/ui/icone/icone';
import { FiltroEspecialidade } from '../../shared/ui/filtro-especialidade/filtro-especialidade';
import { formatarHora } from '../../core/utils/formatacao';

@Component({
  selector: 'app-cabecalho',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icone, RouterLink, FiltroEspecialidade],
  templateUrl: './cabecalho.html',
  styleUrl: './cabecalho.scss',
})
export class Cabecalho {
  private readonly store = inject(RedeStore);
  private readonly empresaService = inject(EmpresaService);
  private readonly perfilService = inject(PerfilService);

  readonly alternarNavegacao = output<void>();
  protected readonly filtrosAbertos = signal(false);

  /** Modo compacto do cabeçalho, disponível apenas no desktop. */
  protected readonly recolhido = signal(false);

  /** Com cadastro de paciente salvo ou sessão corporativa ativa, o convite ao cadastro sai do ar. */
  protected readonly identificado = computed(
    () => this.empresaService.autenticada() || this.perfilService.perfil() !== null,
  );

  protected readonly todos = TODOS_MUNICIPIOS;
  protected readonly todosPlanos = TODOS_PLANOS;
  protected readonly comPlano = COM_PLANO;
  protected readonly semPlano = SEM_PLANO;
  protected readonly municipios = this.store.municipios;
  protected readonly municipioSelecionado = this.store.municipio;
  protected readonly planos = this.store.planos;
  protected readonly planoSelecionado = this.store.plano;
  protected readonly busca = this.store.busca;
  protected readonly indicadores = this.store.indicadores;

  protected readonly sincronizadoEm = computed(() => formatarHora(this.store.atualizadoEm()));

  protected aoTrocarMunicipio(valor: string): void {
    this.store.definirMunicipio(valor);
  }

  protected aoTrocarPlano(valor: string): void {
    this.store.definirPlano(valor);
  }

  protected aoBuscar(valor: string): void {
    this.store.definirBusca(valor);
  }

  protected alternarFiltros(): void {
    this.filtrosAbertos.update((abertos) => !abertos);
  }

  protected alternarRecolhido(): void {
    this.recolhido.update((atual) => !atual);
  }
}
