import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export interface PerfilPaciente {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cep: string;
  estado: string;
  cidade: string;
  bairro: string;
  rua: string;
  numero: string;
  complemento: string;
}

const CHAVE_PERFIL = 'carehub.perfil-paciente';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly janela = inject(DOCUMENT).defaultView;

  readonly perfil = signal<PerfilPaciente | null>(this.carregar());

  salvar(perfil: PerfilPaciente): void {
    this.perfil.set(perfil);
    this.janela?.localStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil));
  }

  limpar(): void {
    this.perfil.set(null);
    this.janela?.localStorage.removeItem(CHAVE_PERFIL);
  }

  private carregar(): PerfilPaciente | null {
    try {
      const valor = this.janela?.localStorage.getItem(CHAVE_PERFIL);
      return valor ? (JSON.parse(valor) as PerfilPaciente) : null;
    } catch {
      return null;
    }
  }
}
