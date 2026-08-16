import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { formatarCnpj, validarCnpj } from '../../../core/models/empresa.model';
import { EmpresaService } from '../../../core/services/empresa.service';

@Component({
  selector: 'app-acesso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './acesso.html',
  styleUrl: './acesso.scss',
})
export class Acesso {
  private readonly formulario = inject(FormBuilder);
  private readonly empresaService = inject(EmpresaService);
  private readonly roteador = inject(Router);

  protected readonly erro = signal('');

  protected readonly acesso = this.formulario.nonNullable.group({
    cnpj: ['', [Validators.required, validarCnpj]],
    senha: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected aoDigitarCnpj(evento: Event): void {
    this.acesso.controls.cnpj.setValue(formatarCnpj((evento.target as HTMLInputElement).value));
  }

  protected entrar(): void {
    this.acesso.markAllAsTouched();
    if (this.acesso.invalid) {
      this.erro.set('Informe o CNPJ e a senha cadastrados.');
      return;
    }

    const { cnpj, senha } = this.acesso.getRawValue();
    const resultado = this.empresaService.entrar(cnpj, senha);
    if (!resultado.ok) {
      this.erro.set(resultado.erro);
      return;
    }

    this.erro.set('');
    void this.roteador.navigate(['/gestao']);
  }
}
