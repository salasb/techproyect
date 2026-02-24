import React from 'react';
import { renderToString } from 'react-dom/server';
import AdminDashboard from '../src/app/admin/page';

async function main() {
    try {
        const element = await AdminDashboard();
        const html = renderToString(element);
        const count = (html.match(/Accesos R&#xE1;pidos/ig) || []).length;
        const count2 = (html.match(/Accesos Rápidos/ig) || []).length;
        console.log("Count of 'Accesos Rápidos':", count + count2);
    } catch (e) {
        console.error(e);
    }
}
main();
