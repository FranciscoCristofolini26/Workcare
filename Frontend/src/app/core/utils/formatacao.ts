export function formatarMinutos(minutos: number): string {
  if (minutos < 60) {
    return `${minutos} min`;
  }
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function formatarNumero(valor: number): string {
  return new Intl.NumberFormat('pt-BR').format(valor);
}

export function formatarPercentual(valor: number, casas = 1): string {
  return `${valor.toFixed(casas).replace('.', ',')}%`;
}

export function formatarHora(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(data);
}

export function formatarTempoRelativo(data: Date, referencia = new Date()): string {
  const segundos = Math.max(0, Math.round((referencia.getTime() - data.getTime()) / 1000));
  if (segundos < 60) {
    return 'agora mesmo';
  }
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) {
    return `há ${minutos} min`;
  }
  return `há ${Math.round(minutos / 60)} h`;
}
