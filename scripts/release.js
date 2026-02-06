const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = require(packageJsonPath);

const currentVersion = packageJson.version;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log(`\n🚀  TechProyect Release Tool`);
console.log(`Current Version: ${currentVersion}`);
console.log('-----------------------------------');

rl.question('Select release type (patch/minor/major) or enter specific version: ', (input) => {
    let newVersion = input.trim();

    if (['patch', 'minor', 'major'].includes(newVersion)) {
        const parts = currentVersion.split('.').map(Number);
        if (newVersion === 'patch') parts[2]++;
        if (newVersion === 'minor') { parts[1]++; parts[2] = 0; }
        if (newVersion === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0; }
        newVersion = parts.join('.');
    }

    // Validate version format
    if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
        console.error('❌  Invalid version format. Use x.y.z');
        rl.close();
        process.exit(1);
    }

    console.log(`\nPreparing Release: v${newVersion}...`);

    try {
        // 1. Update package.json
        packageJson.version = newVersion;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
        console.log('✅  Updated package.json');

        // 2. Run update-build-date.js
        execSync('node scripts/update-build-date.js', { stdio: 'inherit' });
        console.log('✅  Updated version.ts and build date');

        // 3. Confirm Git Operations
        rl.question(`\nType 'yes' to commit and tag "v${newVersion}": `, (confirm) => {
            if (confirm.toLowerCase() === 'yes') {
                try {
                    execSync('git add package.json src/lib/version.ts');
                    execSync(`git commit -m "Release v${newVersion}"`);
                    execSync(`git tag v${newVersion}`);

                    console.log(`\n🎉  Release v${newVersion} created successfully!`);
                    console.log(`\nNext steps:`);
                    console.log(`  git push origin main`);
                    console.log(`  git push origin v${newVersion}`);
                } catch (e) {
                    console.error('❌  Git operation failed:', e.message);
                }
            } else {
                console.log('\n❌  Git operations cancelled. Files were modified but not committed.');
            }
            rl.close();
        });

    } catch (e) {
        console.error('❌  Error:', e.message);
        rl.close();
        process.exit(1);
    }
});
