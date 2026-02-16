'use client';

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";

interface LocationSelectorProps {
    locations: { id: string; name: string }[];
}

export function LocationSelector({ locations }: LocationSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const locationId = searchParams.get('locationId') || 'all';

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        const params = new URLSearchParams(searchParams.toString());
        if (value === 'all') {
            params.delete('locationId');
        } else {
            params.set('locationId', value);
        }
        router.push(`?${params.toString()}`);
    };

    const options = [
        { value: 'all', label: 'Todas las Bodegas' },
        ...locations.map(loc => ({ value: loc.id, label: loc.name }))
    ];

    return (
        <div className="w-[200px]">
            <Select
                options={options}
                value={locationId}
                onChange={handleChange}
                className="bg-white dark:bg-zinc-900"
            />
        </div>
    );
}
