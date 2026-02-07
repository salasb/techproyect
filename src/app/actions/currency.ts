'use server'

import { getDollarRate, getUfRate } from "@/services/currency";

export async function getDollarRateAction() {
    return await getDollarRate();
}

export async function getUfRateAction() {
    return await getUfRate();
}
