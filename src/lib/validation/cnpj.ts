const WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const WEIGHTS_2 = [6, ...WEIGHTS_1];

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function checkDigit(digits: string, weights: number[]) {
  const sum = weights.reduce((acc, weight, i) => acc + Number(digits[i]) * weight, 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

/** Mesma regra de `public.is_valid_cnpj` no banco. */
export function isValidCnpj(value: string) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  return (
    checkDigit(cnpj, WEIGHTS_1) === Number(cnpj[12]) &&
    checkDigit(cnpj, WEIGHTS_2) === Number(cnpj[13])
  );
}

/** Máscara progressiva: 00.000.000/0000-00. */
export function maskCnpj(value: string) {
  return onlyDigits(value)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
