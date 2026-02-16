'use server'

import { createClient } from "@/lib/supabase/server";

export interface InventoryMetrics {
    totalValue: number;
    totalCost: number;
    potentialMargin: number;
    totalItems: number;
    lowStockItems: number;
    stockByLocation: { name: string; value: number; count: number }[];
    categoryDistribution: { name: string; value: number }[];
}

export async function getInventoryMetrics(locationId?: string): Promise<InventoryMetrics> {
    const supabase = await createClient();

    // 1. Fetch Products for Price/Cost info
    const { data: products } = await supabase
        .from('Product')
        .select('id, name, priceNet, costNet, min_stock, type');

    const productMap = new Map();
    products?.forEach(p => productMap.set(p.id, p));

    // 2. Fetch Stock Entries
    let query = supabase
        .from('ProductStock')
        .select('locationId, quantity, productId, location:Location(name)');

    if (locationId) {
        query = query.eq('locationId', locationId);
    }

    const { data: stockEntries } = await query;

    let totalValue = 0;
    let totalCost = 0;
    let totalItems = 0;
    let lowStockItems = 0; // This is tricky per location vs global. 
    // If filtering by location, "low stock" might mean "low stock IN THIS LOCATION" (which likely doesn't have a specific threshold)
    // or just "how many items are present".
    // Global min_stock is on Product.
    // We will count lowStock only if we look globally, OR if we define it as "quantity < min_stock" for that location (which makes sense).

    let productsValue = 0;

    // We will aggregate stock per product to check against min_stock if we are in global view.
    // If filtered, we check against min_stock (assuming min_stock applies to the filtered scope? OR just check purely available quantity).
    // Let's assume min_stock is global for now. If filtering, "Low Stock" KPI might be less relevant or we just compare local qty vs global min (strict).

    // Better Aggregation
    const locationMap = new Map<string, { name: string; value: number; count: number }>();
    const productStockMap = new Map<string, number>();

    stockEntries?.forEach((entry: any) => {
        const product = productMap.get(entry.productId);
        if (product && product.type === 'PRODUCT') {
            const qty = entry.quantity || 0;
            const price = product.priceNet || 0;
            const cost = product.costNet || 0;
            const value = qty * price;
            const costVal = qty * cost;

            totalValue += value;
            totalCost += costVal;
            totalItems += qty;
            productsValue += value;

            // Aggregation for Stock By Location Chart
            const locName = entry.location?.name || 'Desconocida';
            const current = locationMap.get(locName) || { name: locName, value: 0, count: 0 };
            current.value += value;
            current.count += qty;
            locationMap.set(locName, current);

            // Accumulate for Min Stock check
            const currentStock = productStockMap.get(entry.productId) || 0;
            productStockMap.set(entry.productId, currentStock + qty);
        }
    });

    // Check Low Stock
    // If locationId is present, we only checked stock in that location.
    // If we want to know if "Product" is low stock, we need global stock.
    // But here we are reporting on "Inventory in View". 
    // Let's just count how many products IN THIS VIEW have quantity <= min_stock.
    productStockMap.forEach((qty, productId) => {
        const product = productMap.get(productId);
        if (product && qty <= (product.min_stock || 0)) {
            lowStockItems++;
        }
    });

    return {
        totalValue,
        totalCost,
        potentialMargin: totalValue - totalCost,
        totalItems,
        lowStockItems,
        stockByLocation: Array.from(locationMap.values()),
        categoryDistribution: [
            { name: 'Productos', value: productsValue },
            { name: 'Servicios', value: 0 }
        ]
    };
}
