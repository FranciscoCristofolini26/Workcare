import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { formatarCnpj, validarCnpj } from '../../core/models/empresa.model';
import { REDE_VAZIA } from '../../core/models/rede.model';
import { EmpresaService } from '../../core/services/empresa.service';
import { LocalizacaoService } from '../../core/services/localizacao.service';
import { PerfilPaciente, PerfilService } from '../../core/services/perfil.service';
import { RedeDataService } from '../../core/services/rede-data.service';

interface ResultadoGeocodificacao {
  lat?: string;
  lon?: string;
  display_name?: string;
}

interface GrupoMunicipio {
  municipio: string;
  unidades: readonly { id: string; nome: string; tipo: string; bairro: string }[];
}

type AbaCadastro = 'paciente' | 'empresa';

function validarCpf(controle: AbstractControl<string>): ValidationErrors | null {
  const cpf = controle.value.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return { cpf: true };
  }

  const calcularDigito = (tamanho: number): number => {
    let soma = 0;
    for (let indice = 0; indice < tamanho; indice += 1) {
      soma += Number(cpf[indice]) * (tamanho + 1 - indice);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcularDigito(9) === Number(cpf[9]) && calcularDigito(10) === Number(cpf[10])
    ? null
    : { cpf: true };
}

function senhasIguais(grupo: AbstractControl): ValidationErrors | null {
  const senha = grupo.get('senha')?.value;
  const confirmacao = grupo.get('confirmacao')?.value;
  return !confirmacao || senha === confirmacao ? null : { confirmacao: true };
}

@Component({
  selector: 'app-cadastro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.scss',
})
export class Cadastro {
  private readonly formulario = inject(FormBuilder);
  private readonly perfilService = inject(PerfilService);
  private readonly empresaService = inject(EmpresaService);
  private readonly localizacao = inject(LocalizacaoService);
  private readonly rede = inject(RedeDataService);
  private readonly roteador = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly janela = inject(DOCUMENT).defaultView;

  private readonly snapshot = toSignal(this.rede.rede$, { initialValue: REDE_VAZIA });

  protected readonly aba = signal<AbaCadastro>(
    this.rota.snapshot.queryParamMap.get('perfil') === 'empresa' ? 'empresa' : 'paciente',
  );
  protected readonly enviando = signal(false);
  protected readonly sucesso = signal(false);
  protected readonly mensagem = signal('');
  protected readonly unidadesEscolhidas = signal<readonly string[]>([]);

  protected readonly cadastro = this.formulario.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    cpf: ['', [Validators.required, validarCpf]],
    email: ['', [Validators.required, Validators.email]],
    telefone: [''],
    cep: ['', [Validators.required, Validators.pattern(/^\d{5}-?\d{3}$/)]],
    estado: ['', [Validators.required, Validators.minLength(2)]],
    cidade: ['', Validators.required],
    bairro: ['', Validators.required],
    rua: ['', Validators.required],
    numero: ['', Validators.required],
    complemento: [''],
  });

  protected readonly empresa = this.formulario.nonNullable.group(
    {
      razaoSocial: ['', [Validators.required, Validators.minLength(3)]],
      nomeFantasia: [''],
      cnpj: ['', [Validators.required, validarCnpj]],
      responsavel: ['', [Validators.required, Validators.minLength(3)]],
      cargo: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefone: ['', Validators.required],
      senha: ['', [Validators.required, Validators.minLength(8)]],
      confirmacao: ['', Validators.required],
    },
    { validators: senhasIguais },
  );

  /** Catálogo de unidades da rede, agrupado por município, para vincular à empresa. */
  protected readonly gruposDeUnidades = computed<readonly GrupoMunicipio[]>(() => {
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

  protected readonly totalEscolhidas = computed(() => this.unidadesEscolhidas().length);

  constructor() {
    const perfil = this.perfilService.perfil();
    if (perfil) {
      this.cadastro.setValue(perfil);
    }
  }

  protected trocarAba(aba: AbaCadastro): void {
    this.aba.set(aba);
    this.mensagem.set('');
    this.sucesso.set(false);
  }

  protected formatarCpf(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 11);
    const formatado = valor
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
    this.cadastro.controls.cpf.setValue(formatado);
  }

  protected formatarCep(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 8);
    this.cadastro.controls.cep.setValue(valor.replace(/^(\d{5})(\d)/, '$1-$2'));
  }

  protected aoDigitarCnpj(evento: Event): void {
    this.empresa.controls.cnpj.setValue(formatarCnpj((evento.target as HTMLInputElement).value));
  }

  protected alternarUnidade(id: string): void {
    this.unidadesEscolhidas.update((atuais) =>
      atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id],
    );
  }

  protected unidadeMarcada(id: string): boolean {
    return this.unidadesEscolhidas().includes(id);
  }

  protected marcarMunicipio(grupo: GrupoMunicipio): void {
    const ids = grupo.unidades.map((unidade) => unidade.id);
    const todasMarcadas = ids.every((id) => this.unidadeMarcada(id));
    this.unidadesEscolhidas.update((atuais) =>
      todasMarcadas ? atuais.filter((id) => !ids.includes(id)) : [...new Set([...atuais, ...ids])],
    );
  }

  protected async salvar(): Promise<void> {
    this.cadastro.markAllAsTouched();
    this.sucesso.set(false);
    if (this.cadastro.invalid || this.enviando()) {
      this.mensagem.set('Revise os campos obrigatórios destacados.');
      return;
    }

    this.enviando.set(true);
    this.mensagem.set('Localizando o endereço informado…');

    try {
      const perfil = this.cadastro.getRawValue() as PerfilPaciente;
      const resultado = await this.geocodificar(perfil);
      if (!resultado) {
        this.mensagem.set(
          'Não encontramos esse endereço. Confira rua, número, cidade, estado e CEP.',
        );
        return;
      }

      this.perfilService.salvar(perfil);
      this.localizacao.definirLocalizacaoPadrao(
        { lat: resultado.lat, lng: resultado.lng },
        resultado.rotulo,
      );
      this.sucesso.set(true);
      this.mensagem.set('Cadastro salvo. Abrindo as unidades no mapa…');
      void this.roteador.navigate(['/painel']);
    } catch {
      this.mensagem.set('Não foi possível localizar o endereço agora. Tente novamente.');
    } finally {
      this.enviando.set(false);
    }
  }

  protected salvarEmpresa(): void {
    this.empresa.markAllAsTouched();
    this.sucesso.set(false);

    if (this.empresa.invalid) {
      this.mensagem.set(
        this.empresa.hasError('confirmacao')
          ? 'A confirmação de senha não confere.'
          : 'Revise os campos obrigatórios destacados.',
      );
      return;
    }

    const dados = this.empresa.getRawValue();
    const resultado = this.empresaService.cadastrar({
      razaoSocial: dados.razaoSocial,
      nomeFantasia: dados.nomeFantasia,
      cnpj: dados.cnpj,
      responsavel: dados.responsavel,
      cargo: dados.cargo,
      email: dados.email,
      telefone: dados.telefone,
      senha: dados.senha,
      unidadeIds: this.unidadesEscolhidas(),
    });

    if (!resultado.ok) {
      this.mensagem.set(resultado.erro);
      return;
    }

    this.sucesso.set(true);
    this.mensagem.set('Conta corporativa criada. Abrindo o painel de gestão…');
    void this.roteador.navigate(['/gestao']);
  }

  private async geocodificar(
    perfil: PerfilPaciente,
  ): Promise<{ lat: number; lng: number; rotulo: string } | null> {
    if (typeof this.janela?.fetch !== 'function') {
      return null;
    }

    const endereco = [
      `${perfil.rua}, ${perfil.numero}`,
      perfil.bairro,
      perfil.cidade,
      perfil.estado,
      perfil.cep,
      'Brasil',
    ].join(', ');
    const parametros = new URLSearchParams({
      q: endereco,
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'br',
      'accept-language': 'pt-BR',
    });
    const resposta = await this.janela.fetch(
      `https://nominatim.openstreetmap.org/search?${parametros.toString()}`,
    );
    if (!resposta.ok) {
      throw new Error(`Falha ao localizar endereço: ${resposta.status}`);
    }

    const [resultado] = (await resposta.json()) as ResultadoGeocodificacao[];
    const lat = Number(resultado?.lat);
    const lng = Number(resultado?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return { lat, lng, rotulo: resultado.display_name ?? endereco };
  }
}
