import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LocalizacaoService } from '../../core/services/localizacao.service';
import { PerfilPaciente, PerfilService } from '../../core/services/perfil.service';

interface ResultadoGeocodificacao {
  lat?: string;
  lon?: string;
  display_name?: string;
}

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
  private readonly localizacao = inject(LocalizacaoService);
  private readonly janela = inject(DOCUMENT).defaultView;

  protected readonly enviando = signal(false);
  protected readonly sucesso = signal(false);
  protected readonly mensagem = signal('');

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

  constructor() {
    const perfil = this.perfilService.perfil();
    if (perfil) {
      this.cadastro.setValue(perfil);
    }
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
      this.mensagem.set('Cadastro salvo. Seu endereço já é a localização padrão do mapa.');
    } catch {
      this.mensagem.set('Não foi possível localizar o endereço agora. Tente novamente.');
    } finally {
      this.enviando.set(false);
    }
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
