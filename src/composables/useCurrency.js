/**
 * Formatea un importe como moneda usando el locale es-MX. La moneda se toma del
 * paquete (columna currency) para no fijar simbolos ni formatos manualmente.
 */
export function formatCurrency(amount, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function useCurrency() {
  return { formatCurrency }
}
