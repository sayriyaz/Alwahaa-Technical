export const DEFAULT_VAT_RATE = 0.05
export const DEFAULT_VAT_RATE_PERCENT = 5

export function roundCurrencyAmount(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function parseVatApplicableValue(value: FormDataEntryValue | null) {
  return value === 'true' || value === 'on' || value === '1'
}

export function calculateDefaultVatAmount(baseAmount: number) {
  return roundCurrencyAmount(Math.max(baseAmount, 0) * DEFAULT_VAT_RATE)
}

export function normalizeVatAmount(baseAmount: number, vatApplicable: boolean, vatAmount: number) {
  if (!vatApplicable) {
    return 0
  }

  if (vatAmount < 0) {
    return 0
  }

  return roundCurrencyAmount(vatAmount)
}

export function calculateTotalAmount(baseAmount: number, vatApplicable: boolean, vatAmount: number) {
  return roundCurrencyAmount(Math.max(baseAmount, 0) + normalizeVatAmount(baseAmount, vatApplicable, vatAmount))
}

export function calculateVatPercentage(baseAmount: number, vatApplicable: boolean, vatAmount: number) {
  if (!vatApplicable || baseAmount <= 0) {
    return 0
  }

  return roundCurrencyAmount((normalizeVatAmount(baseAmount, vatApplicable, vatAmount) / baseAmount) * 100)
}
