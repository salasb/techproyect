'use server'

import { CurrencyService } from "@/services/currencyService";

export async function getDollarRateAction() {
    return await CurrencyService.getDollarRate();
}

export async function getUfRateAction() {
    return await CurrencyService.getUfRate();
}
