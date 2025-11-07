export function normalizeRut(input) {
  return input.replace(/\./g, '').toUpperCase();
}

export function isRutValid(rut) {
  const normalized = normalizeRut(rut);
  const match = normalized.match(/^(\d{1,8})-([0-9K])$/);
  if (!match) {
    return false;
  }
  const [, body, dv] = match;
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const computed = 11 - (sum % 11);
  const dvComputed = computed === 11 ? '0' : computed === 10 ? 'K' : String(computed);
  return dvComputed === dv;
}
