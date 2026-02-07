
export interface ExchangeRate {
    code: string;
    value: number;
    date: string; // ISO string
}

export async function getDollarRate(): Promise<ExchangeRate | null> {
    try {
        const res = await fetch('https://mindicador.cl/api', {
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!res.ok) {
            console.error(`Failed to fetch exchange rate: ${res.status}`);
            return null;
        }

        const data = await res.json();
        const dolar = data.dolar;

        if (!dolar || !dolar.valor) return null;

        return {
            code: 'USD',
            value: dolar.valor,
            date: dolar.fecha
        };
    } catch (error) {
        console.error("Error fetching dollar rate:", error);
        return null;
    }
}

export async function getUfRate(): Promise<ExchangeRate | null> {
    try {
        const res = await fetch('https://mindicador.cl/api/uf', {
            next: { revalidate: 3600 }
        });

        if (!res.ok) return null;

        const data = await res.json();
        // The API returns 'serie' array, we want the first one [0] which is usually the requested date or latest
        const serie = data.serie;
        if (!serie || serie.length === 0) return null;

        return {
            code: 'UF',
            value: serie[0].valor,
            date: serie[0].fecha
        };
    } catch (error) {
        console.error("Error fetching UF rate:", error);
        return null;
    }
}
