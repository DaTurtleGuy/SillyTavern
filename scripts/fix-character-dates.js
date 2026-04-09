import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseSendDate(str) {
    if (!str || typeof str !== 'string') return null;
    const ms = Date.parse(str);
    return isNaN(ms) ? null : ms;
}

function parseCreateDate(str) {
    if (!str || typeof str !== 'string') return null;
    const normalized = str
        .replace('@', 'T')
        .replace(/h/g, ':')
        .replace(/m/g, ':')
        .replace(/s$/, '');
    const ms = Date.parse(normalized);
    return isNaN(ms) ? null : ms;
}

function normalizeToMs(value) {
    if (value === undefined || value === null) return null;
    if (typeof value === 'number') return isNaN(value) ? null : value;
    if (typeof value === 'string') {
        if (/^\d+(\.\d+)?$/.test(value.trim())) return parseFloat(value);
        let ms = parseCreateDate(value);
        if (ms !== null) return ms;
        ms = parseSendDate(value);
        if (ms !== null) return ms;
        ms = Date.parse(value);
        return isNaN(ms) ? null : ms;
    }
    return null;
}

function parseMessageTimestamp(line) {
    try {
        const obj = JSON.parse(line);
        if (obj.send_date) {
            const t = parseSendDate(obj.send_date);
            if (t) return t;
        }
        if (obj.create_date && typeof obj.create_date === 'string') {
            const t = parseCreateDate(obj.create_date);
            if (t) return t;
        }
    } catch {}
    return null;
}

function getOldestAndNewestFromChatFile(chatFilePath) {
    let oldest = Infinity;
    let newest = 0;
    try {
        const contents = fs.readFileSync(chatFilePath, 'utf8');
        const lines = contents.split('\n').filter(l => l.trim());
        for (const line of lines) {
            const ts = parseMessageTimestamp(line);
            if (ts !== null) {
                if (ts < oldest) oldest = ts;
                if (ts > newest) newest = ts;
            }
        }
    } catch (e) {
        console.warn(`  Warning: Could not read ${chatFilePath}: ${e.message}`);
    }
    return {
        oldest: oldest === Infinity ? null : oldest,
        newest: newest === 0 ? null : newest,
    };
}

function main() {
    const args = process.argv.slice(2);
    const isUndo = args.includes('--undo');
    const dataDir = args.filter(a => a !== '--undo')[0] || path.resolve(__dirname, '..', 'data', 'default-user');

    console.log(`Data directory: ${dataDir}`);

    const chatsDir = path.join(dataDir, 'chats');
    const charactersDir = path.join(dataDir, 'characters');
    const dateAddedFile = path.join(charactersDir, 'date_added.json');
    const backupFile = path.join(__dirname, 'backup-character-dates.json');

    if (isUndo) {
        if (!fs.existsSync(backupFile)) {
            console.error('No backup file found at ' + backupFile);
            process.exit(1);
        }
        const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
        let dateAddedData = {};
        if (fs.existsSync(dateAddedFile)) {
            dateAddedData = JSON.parse(fs.readFileSync(dateAddedFile, 'utf8'));
        }
        let restored = 0;
        for (const [charName, originalValue] of Object.entries(backup)) {
            if (originalValue === null) {
                if (dateAddedData[charName] !== undefined) {
                    console.log(`Restoring ${charName}: removing entry (was not present before)`);
                    delete dateAddedData[charName];
                    restored++;
                }
            } else if (dateAddedData[charName] !== originalValue) {
                console.log(`Restoring ${charName}: ${dateAddedData[charName]} -> ${originalValue}`);
                dateAddedData[charName] = originalValue;
                restored++;
            }
        }
        if (restored > 0) {
            fs.writeFileSync(dateAddedFile, JSON.stringify(dateAddedData, null, 4), 'utf8');
            console.log(`\nRestored ${restored} character(s) from backup.`);
        } else {
            console.log('Nothing to restore.');
        }
        return;
    }

    if (!fs.existsSync(chatsDir)) {
        console.error('Chats directory not found: ' + chatsDir);
        process.exit(1);
    }

    let dateAddedData = {};
    if (fs.existsSync(dateAddedFile)) {
        dateAddedData = JSON.parse(fs.readFileSync(dateAddedFile, 'utf8'));
    }

    const backup = {};
    const changes = [];
    const charFolders = fs.readdirSync(chatsDir, { withFileTypes: true })
        .filter(d => d.isDirectory());

    for (const folder of charFolders) {
        const charName = folder.name;
        const folderPath = path.join(chatsDir, charName);
        const chatFiles = fs.readdirSync(folderPath)
            .filter(f => f.endsWith('.jsonl'));

        if (chatFiles.length === 0) continue;

        let oldestAll = Infinity;
        let newestAll = 0;

        for (const chatFile of chatFiles) {
            const { oldest, newest } = getOldestAndNewestFromChatFile(path.join(folderPath, chatFile));
            if (oldest !== null && oldest < oldestAll) oldestAll = oldest;
            if (newest !== null && newest > newestAll) newestAll = newest;
        }

        if (oldestAll === Infinity && newestAll === 0) continue;

        const rawCurrentDateAdded = dateAddedData[charName];
        const currentDateAdded = normalizeToMs(rawCurrentDateAdded);
        let updated = false;

        if (oldestAll !== Infinity) {
            if (currentDateAdded === null || oldestAll < currentDateAdded) {
                changes.push({
                    charName,
                    field: 'date_added',
                    old: rawCurrentDateAdded ?? '(none)',
                    new: oldestAll,
                    oldReadable: currentDateAdded ? new Date(currentDateAdded).toISOString() : '(none)',
                    newReadable: new Date(oldestAll).toISOString(),
                });
                backup[charName] = rawCurrentDateAdded ?? null;
                dateAddedData[charName] = oldestAll;
                updated = true;
            }
        }

        // Note: date_last_chat is not stored in date_added.json - it's computed at runtime.
        // We don't need to fix it here since it comes from filesystem mtime of chat files.
        // But we report it for informational purposes.
        if (!updated && newestAll > 0) {
            const dateLastChat = newestAll;
        }
    }

    if (changes.length === 0) {
        console.log('No character dates need fixing. Everything looks good!');
        return;
    }

    console.log(`\nFound ${changes.length} date(s) to fix:\n`);
    for (const c of changes) {
        console.log(`  [${c.charName}] ${c.field}:`);
        console.log(`    ${c.oldReadable} -> ${c.newReadable}`);
    }

    // Save backup before writing
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 4), 'utf8');
    console.log(`\nBackup saved to ${backupFile}`);

    // Write updated date_added.json
    fs.writeFileSync(dateAddedFile, JSON.stringify(dateAddedData, null, 4), 'utf8');
    console.log(`Updated ${dateAddedFile}`);
    console.log(`\nTo undo these changes, run: node scripts/fix-character-dates.js --undo`);
}

main();
