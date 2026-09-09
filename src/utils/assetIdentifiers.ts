import { Patrimonio } from '../types';

export function ean13CheckDigit(body12: string): number {
  const digits = body12.split('').map(Number);
  const sum = digits.reduce((acc, digit, idx) => acc + digit * (idx % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

export function buildUniqueEan13(code: string, fallbackSeed: number = 0): string {
  let digits = code.replace(/\D/g, '');
  if (digits.length >= 12) digits = digits.slice(-12);
  else digits = digits.padStart(12, '0');
  if (/^0{12}$/.test(digits)) digits = String(fallbackSeed + 1).padStart(12, '0').slice(-12);
  return `${digits}${ean13CheckDigit(digits)}`;
}

export function normalizeAssetIdentifiers(items: Patrimonio[]): { items: Patrimonio[]; changed: boolean } {
  const usedBarcodes = new Set<string>();
  const usedQr = new Set<string>();
  let changed = false;

  const normalized = items.map((item, index) => {
    let barcode = buildUniqueEan13(item.codigoPatrimonial || item.id, index);
    let attempt = 0;
    while (usedBarcodes.has(barcode)) {
      attempt += 1;
      barcode = buildUniqueEan13(`${index + 1}${attempt}`.padStart(12, '0'), index + attempt);
    }
    usedBarcodes.add(barcode);

    let qrCode = `SISPAT-${item.codigoPatrimonial}`;
    if (usedQr.has(qrCode)) qrCode = `SISPAT-${item.codigoPatrimonial}-${item.id}`;
    usedQr.add(qrCode);

    if (item.codigoBarras !== barcode || item.qrCode !== qrCode) changed = true;
    return { ...item, codigoBarras: barcode, qrCode };
  });

  return { items: normalized, changed };
}
