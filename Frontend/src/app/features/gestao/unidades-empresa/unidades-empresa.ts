import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { REDE_VAZIA } from '../../../core/models/rede.model';
import { EmpresaService } from '../../../core/services/empresa.service';
import { RedeDataService } from '../../../core/services/rede-data.service';

interface GrupoMunicipio {
  municipio: string;
  unidades: readonly { id: string; nome: string; tipo: string; bairro: string }[];
}

@Component({
  selector: 'app-gestao-unidades-empresa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './unidades-empresa.html',
  styleUrl: './unidades-empresa.scss',
})
export class UnidadesEmpresa {
  private readonly rede = inject(RedeDataService);
  private readonly empresaService = inject(EmpresaService);

  private readonly snapshot = toSignal(this.rede.rede$, { initialValue: REDE_VAZIA });

  protected readonly empresa = this.empresaService.empresa;
  protected readonly selecionadas = signal<readonly string[]>(
    this.empresaService.empresa()?.unidadeIds ?? [],
  );
  protected readonly mensagem = signal('');

  protected readonly grupos = computed<readonly GrupoMunicipio[]>(() => {
    const unidades = this.snapshot().unidades;
    const municipios = [...new Set(unidades.map((unidade) => unidade.municipio))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    );

    return municipios.map((municipio) => ({
      municipio,
      unidades: unidades
        .filter((unidade) => unidade.municipio === municipio)
        .map((unidade) => ({
          id: unidade.id,
          nome: unidade.nome,
          tipo: unidade.tipo,
          bairro: unidade.bairro,
        })),
    }));
  });

  protected readonly total = computed(() => this.selecionadas().length);

  protected marcada(id: string): boolean {
    return this.selecionadas().includes(id);
  }

  protected alternar(id: string): void {
    this.mensagem.set('');
    this.selecionadas.update((atuais) =>
      atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id],
    );
  }

  protected alternarMunicipio(grupo: GrupoMunicipio): void {
    const ids = grupo.unidades.map((unidade) => unidade.id);
    const todas = ids.every((id) => this.marcada(id));
    this.mensagem.set('');
    this.selecionadas.update((atuais) =>
      todas ? atuais.filter((id) => !ids.includes(id)) : [...new Set([...atuais, ...ids])],
    );
  }

  protected salvar(): void {
    if (this.selecionadas().length === 0) {
      this.mensagem.set('Selecione ao menos uma unidade para manter o painel de gestão ativo.');
      return;
    }

    this.empresaService.definirUnidades(this.selecionadas());
    this.mensagem.set('Unidades atualizadas. Os indicadores já refletem a nova seleção.');
  }
}
