const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = require(packageJsonPath);

const currentVersion = packageJson.version;

// Parse CLI arguments
const args = process.argv.slice(2);
// Check for version argument (first non-flag argument)
const versionArg = args.find(arg => !arg.startsWith('--'));
// Check for flags
const autoYes = args.includes('--yes') || args.includes('-y');

console.log(`\n🚀  TechProyect Release Tool`);
console.log(`Current Version: ${currentVersion}`);
console.log('-----------------------------------');

function getNextVersion(typeOrVersion) {
    if (['patch', 'minor', 'major'].includes(typeOrVersion)) {
        const parts = currentVersion.split('.').map(Number);
        if (typeOrVersion === 'patch') parts[2]++;
        if (typeOrVersion === 'minor') { parts[1]++; parts[2] = 0; }
        if (typeOrVersion === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0; }
        return parts.join('.');
    }
    return typeOrVersion;
}

function runRelease(targetVersion) {
    // Validate version format
    if (!/^\d+\.\d+\.\d+$/.test(targetVersion)) {
        console.error('❌  Invalid version format. Use x.y.z');
        process.exit(1);
    }

    console.log(`\nPreparing Release: v${targetVersion}...`);

    try {
        // 1. Update package.json
        packageJson.version = targetVersion;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
        console.log('✅  Updated package.json');

        // 2. Run update-build-date.js
        execSync('node scripts/update-build-date.js', { stdio: 'inherit' });
        console.log('✅  Updated version.ts and build date');

        // 3. Confirm Git Operations
        const commitAndTag = () => {
            try {
                execSync('git add .');
                execSync(`git commit -m "Release v${targetVersion}"`);
                execSync(`git tag v${targetVersion}`);

                console.log(`\n🎉  Release v${targetVersion} created successfully!`);

                if (autoYes) {
                    console.log(`\n🚀  Pushing changes to origin (Deploying)...`);
                    execSync('git push origin main');
                    execSync(`git push origin v${targetVersion}`);
                    console.log('✅  Deployed successfully!');
                } else {
                    console.log(`\nNext steps:`);
                    console.log(`  git push origin main`);
                    console.log(`  git push origin v${targetVersion}`);
                }
                process.exit(0);
            } catch (e) {
                console.error('❌  Git operation failed:', e.message);
                process.exit(1);
            }
        };

        if (autoYes) {
            commitAndTag();
        } else {
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            rl.question(`\nType 'yes' to commit and tag "v${targetVersion}": `, (confirm) => {
                rl.close();
                if (confirm.toLowerCase() === 'yes') {
                    commitAndTag();
                } else {
                    console.log('\n❌  Git operations cancelled. Files were modified but not committed.');
                    process.exit(0);
                }
            });
        }

    } catch (e) {
        console.error('❌  Error:', e.message);
        process.exit(1);
    }
}

// Main logic
if (versionArg) {
    const nextVersion = getNextVersion(versionArg);
    runRelease(nextVersion);
} else {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Select release type (patch/minor/major) or enter specific version: ', (input) => {
        rl.close();
        const nextVersion = getNextVersion(input.trim());
        runRelease(nextVersion);
    });
}
