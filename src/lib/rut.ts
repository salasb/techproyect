export function cleanRut(rut: string): string {
    return typeof rut === 'string' ? rut.replace(/[^0-9kK]/g, '').toUpperCase() : '';
}

export function validateRut(rut: string): boolean {
    const clean = cleanRut(rut);
    if (!clean || clean.length < 2) return false;

    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);

    if (!/^\d+$/.test(body)) return false;

    let total = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i--) {
        total += parseInt(body.charAt(i)) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const calculatedDv = 11 - (total % 11);
    const finalDv = calculatedDv === 11 ? '0' : calculatedDv === 10 ? 'K' : calculatedDv.toString();

    return finalDv === dv;
}

export function formatRut(rut: string): string {
    const clean = cleanRut(rut);
    if (!clean) return '';
    if (clean.length <= 1) return clean;

    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);

    let formattedBody = '';
    for (let i = body.length - 1, j = 0; i >= 0; i--, j++) {
        formattedBody = body.charAt(i) + (j > 0 && j % 3 === 0 ? '.' : '') + formattedBody;
    }

    return `${formattedBody}-${dv}`;
}
