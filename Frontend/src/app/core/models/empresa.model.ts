import { AbstractControl, ValidationErrors } from '@angular/forms';

export interface DadosEmpresa {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  responsavel: string;
  cargo: string;
  email: string;
  telefone: string;
}

export interface PerfilEmpresa extends DadosEmpresa {
  id: string;
  unidadeIds: readonly string[];
  criadoEm: string;
}

/** Conta persistida localmente. O resumo de senha substitui, na simulação, o hash do backend. */
export interface ContaEmpresa extends PerfilEmpresa {
  resumoSenha: string;
}

export type ResultadoAcesso = { readonly ok: true } | { readonly ok: false; readonly erro: string };

export function apenasDigitosCnpj(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 14);
}

export function formatarCnpj(valor: string): string {
  return apenasDigitosCnpj(valor)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function cnpjValido(valor: string): boolean {
  const cnpj = apenasDigitosCnpj(valor);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  const digitoVerificador = (tamanho: number): number => {
    let peso = tamanho - 7;
    let soma = 0;
    for (let indice = 0; indice < tamanho; indice += 1) {
      soma += Number(cnpj[indice]) * peso;
      peso -= 1;
      if (peso < 2) {
        peso = 9;
      }
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return digitoVerificador(12) === Number(cnpj[12]) && digitoVerificador(13) === Number(cnpj[13]);
}

export function validarCnpj(controle: AbstractControl<string>): ValidationErrors | null {
  return cnpjValido(controle.value ?? '') ? null : { cnpj: true };
}

/**
 * Resumo determinístico usado apenas pela simulação local: mantém a senha fora do
 * armazenamento em texto puro. Em produção a verificação acontece no backend.
 */
export function resumirSenha(senha: string, sal: string): string {
  const texto = `${sal}::${senha}`;
  let primeiro = 0x811c9dc5;
  let segundo = 0x01000193;

  for (let indice = 0; indice < texto.length; indice += 1) {
    const codigo = texto.charCodeAt(indice);
    primeiro = Math.imul(primeiro ^ codigo, 0x01000193) >>> 0;
    segundo = Math.imul((segundo + codigo) ^ (segundo >>> 5), 0x85ebca6b) >>> 0;
  }

  return `${primeiro.toString(16).padStart(8, '0')}${segundo.toString(16).padStart(8, '0')}`;
}
