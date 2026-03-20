export interface ExchangeRate {
    code: string;
    value: number;
    date: string;
    source: string;
}

const FALLBACK_DOLLAR = 855;
const FALLBACK_UF = 38000;

export class CurrencyService {
    /**
     * Fetches current USD/CLP rate with 1-hour cache.
     */
    static async getDollarRate(): Promise<ExchangeRate> {
        try {
            const res = await fetch('https://mindicador.cl/api/dolar', {
                next: { revalidate: 3600 }
            });

            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

            const data = await res.json();
            const latest = data.serie[0];

            if (!latest || !latest.valor) throw new Error('Invalid data structure');

            return {
                code: 'USD',
                value: latest.valor,
                date: new Date(latest.fecha).toISOString(),
                source: 'mindicador.cl'
            };
        } catch (error) {
            console.error("[CurrencyService] Dollar fetch failed, using fallback:", error);
            return {
                code: 'USD',
                value: FALLBACK_DOLLAR,
                date: new Date().toISOString(),
                source: 'Static Fallback'
            };
        }
    }

    /**
     * Fetches current UF/CLP rate with 24-hour cache.
     */
    static async getUfRate(): Promise<ExchangeRate> {
        try {
            const res = await fetch('https://mindicador.cl/api/uf', {
                next: { revalidate: 86400 }
            });

            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

            const data = await res.json();
            const latest = data.serie[0];

            if (!latest || !latest.valor) throw new Error('Invalid data structure');

            return {
                code: 'UF',
                value: latest.valor,
                date: new Date(latest.fecha).toISOString(),
                source: 'mindicador.cl'
            };
        } catch (error) {
            console.error("[CurrencyService] UF fetch failed, using fallback:", error);
            return {
                code: 'UF',
                value: FALLBACK_UF,
                date: new Date().toISOString(),
                source: 'Static Fallback'
            };
        }
    }

    /**
     * Legacy support method
     */
    static async getExchangeRate() {
        return this.getDollarRate();
    }
}
