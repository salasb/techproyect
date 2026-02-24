import { getCockpitDataSafe } from "../src/lib/superadmin/cockpit-data-adapter";

async function main() {
    console.log("Running getCockpitDataSafe...");
    try {
        const result = await getCockpitDataSafe();
        console.log("Success!");
        console.log("Alerts count:", result.blocks.alerts.data.length);
        const unique = new Set(result.blocks.alerts.data.map(a => a.fingerprint));
        console.log("Unique fingerprints:", unique.size);
        if (result.blocks.alerts.data.length > 0) {
            console.log("Sample fingerprint:", result.blocks.alerts.data[0].fingerprint);
            console.log("Sample ID:", result.blocks.alerts.data[0].id);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}
main();
