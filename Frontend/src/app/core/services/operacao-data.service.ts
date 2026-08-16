import { Unidade } from '../models/rede.model';
import { PerfilOperacional, SerieOperacional } from '../models/gestao.model';

/**
 * Fonte dos dados operacionais das unidades administradas por uma empresa.
 * A implementação padrão simula a movimentação; um backend real substitui a classe.
 */
export abstract class OperacaoDataService {
  abstract perfil(unidade: Unidade): PerfilOperacional;
  abstract serie(unidade: Unidade, dias: readonly Date[]): SerieOperacional;
}

export function chaveDoDia(data: Date): string {
  return `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}-${data
    .getDate()
    .toString()
    .padStart(2, '0')}`;
}

/** Janela fechada terminando na data de referência, do mais antigo para o mais recente. */
export function ultimosDias(referencia: Date, quantidade: number): readonly Date[] {
  return Array.from({ length: quantidade }, (_, indice) => {
    const data = new Date(referencia);
    data.setHours(0, 0, 0, 0);
    data.setDate(data.getDate() - (quantidade - 1 - indice));
    return data;
  });
}
