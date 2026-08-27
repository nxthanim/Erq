export function formatETB(value, { symbol = 'ETB', decimals = 0 } = {}) {
  const amount = Number(value || 0);
  return `${symbol} ${amount.toLocaleString('en-ET', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
