export interface ExchangeRateInfo {
    rate: number;
    date: string;
    source: string;
}

const FALLBACK_RATE = 855; // Last known good rate from user
const API_URL = 'https://mindicador.cl/api/dolar';

// Cache in-memory for the duration of the server process
// In a serverless environment like Vercel, this is short-lived but helpful
let rateCache: ExchangeRateInfo | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 3600 * 1000; // 1 hour

export class CurrencyService {
    static async getExchangeRate(): Promise<ExchangeRateInfo> {
        const now = Date.now();

        if (rateCache && (now - lastFetchTime < CACHE_TTL)) {
            return rateCache;
        }

        try {
            console.log("Fetching real-time USD/CLP rate from mindicador.cl...");
            const response = await fetch(API_URL, {
                next: { revalidate: 3600 } // Next.js level caching (1 hour)
            });

            if (!response.ok) throw new Error('Failed to fetch from mindicador.cl');

            const data = await response.json();
            const latest = data.serie[0];

            rateCache = {
                rate: latest.valor,
                date: new Date(latest.fecha).toLocaleDateString('es-CL'),
                source: 'mindicador.cl'
            };
            lastFetchTime = now;

            return rateCache;
        } catch (error) {
            console.error("Error fetching exchange rate:", error);
            // Fallback to static value but mark source accordingly
            return {
                rate: FALLBACK_RATE,
                date: new Date().toLocaleDateString('es-CL'),
                source: 'Static Fallback'
            };
        }
    }
}
