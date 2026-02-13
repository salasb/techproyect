const FALLBACK_DOLLAR = 855;
const FALLBACK_UF = 38000;

export interface ExchangeRate {
    code: string;
    value: number;
    date: string; // ISO string
    source: string;
}

export async function getDollarRate(): Promise<ExchangeRate> {
    try {
        const res = await fetch('https://mindicador.cl/api', {
            next: { revalidate: 0 } // No cache, always fresh
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch exchange rate: ${res.status}`);
        }

        const data = await res.json();
        const dolar = data.dolar;

        if (!dolar || !dolar.valor) throw new Error('Invalid dollar data');

        return {
            code: 'USD',
            value: dolar.valor,
            date: dolar.fecha,
            source: 'mindicador.cl'
        };
    } catch (error) {
        console.error("Error fetching dollar rate, using fallback:", error);
        return {
            code: 'USD',
            value: FALLBACK_DOLLAR,
            date: new Date().toISOString(),
            source: 'Static Fallback'
        };
    }
}

export async function getUfRate(): Promise<ExchangeRate> {
    try {
        const res = await fetch('https://mindicador.cl/api/uf', {
            next: { revalidate: 86400 } // Cache for 24 hours
        });

        if (!res.ok) throw new Error('Failed to fetch UF');

        const data = await res.json();
        const serie = data.serie;
        if (!serie || serie.length === 0) throw new Error('Invalid UF data');

        return {
            code: 'UF',
            value: serie[0].valor,
            date: serie[0].fecha,
            source: 'mindicador.cl'
        };
    } catch (error) {
        console.error("Error fetching UF rate, using fallback:", error);
        return {
            code: 'UF',
            value: FALLBACK_UF,
            date: new Date().toISOString(),
            source: 'Static Fallback'
        };
    }
}
