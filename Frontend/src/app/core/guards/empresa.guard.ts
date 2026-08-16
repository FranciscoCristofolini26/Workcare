import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { EmpresaService } from '../services/empresa.service';

/** Libera as telas de gestão apenas para a sessão corporativa. */
export const empresaGuard: CanActivateFn = () =>
  inject(EmpresaService).autenticada() || inject(Router).createUrlTree(['/empresa/entrar']);

/** Evita reabrir o acesso quando já existe sessão corporativa ativa. */
export const semSessaoEmpresaGuard: CanActivateFn = () =>
  !inject(EmpresaService).autenticada() || inject(Router).createUrlTree(['/gestao']);
