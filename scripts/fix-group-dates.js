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

    const groupsDir = path.join(dataDir, 'groups');
    const groupChatsDir = path.join(dataDir, 'group chats');
    const backupFile = path.join(__dirname, 'backup-group-dates.json');

    if (isUndo) {
        if (!fs.existsSync(backupFile)) {
            console.error('No backup file found at ' + backupFile);
            process.exit(1);
        }
        const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
        let restored = 0;
        for (const [groupId, original] of Object.entries(backup)) {
            const groupFilePath = path.join(groupsDir, `${groupId}.json`);
            if (!fs.existsSync(groupFilePath)) {
                console.warn(`Group file not found for ${groupId}, skipping.`);
                continue;
            }
            try {
                const group = JSON.parse(fs.readFileSync(groupFilePath, 'utf8'));
                let changed = false;
                for (const field of ['date_added', 'create_date', 'date_last_chat']) {
                    if (original[field] !== undefined && group[field] !== original[field]) {
                        console.log(`Restoring ${groupId} ${field}: ${group[field]} -> ${original[field]}`);
                        group[field] = original[field];
                        changed = true;
                    }
                }
                if (changed) {
                    fs.writeFileSync(groupFilePath, JSON.stringify(group, null, 4), 'utf8');
                    restored++;
                }
            } catch (e) {
                console.error(`Error restoring ${groupId}: ${e.message}`);
            }
        }
        if (restored > 0) {
            console.log(`\nRestored ${restored} group(s) from backup.`);
        } else {
            console.log('Nothing to restore.');
        }
        return;
    }

    if (!fs.existsSync(groupsDir)) {
        console.error('Groups directory not found: ' + groupsDir);
        process.exit(1);
    }

    const backup = {};
    const changes = [];
    const groupFiles = fs.readdirSync(groupsDir).filter(f => f.endsWith('.json'));

    for (const groupFile of groupFiles) {
        const groupFilePath = path.join(groupsDir, groupFile);
        let group;
        try {
            group = JSON.parse(fs.readFileSync(groupFilePath, 'utf8'));
        } catch (e) {
            console.warn(`Could not parse ${groupFile}: ${e.message}`);
            continue;
        }

        const groupId = group.id || path.basename(groupFile, '.json');
        const chatIds = Array.isArray(group.chats) ? group.chats : [];

        if (chatIds.length === 0) continue;

        let oldestAll = Infinity;
        let newestAll = 0;

        for (const chatId of chatIds) {
            // Try to find the chat file - name could be chatId.jsonl or sanitized version
            let chatFilePath = path.join(groupChatsDir, `${chatId}.jsonl`);
            if (!fs.existsSync(chatFilePath)) {
                // Try sanitized name
                const sanitized = chatId.replace(/[^a-zA-Z0-9_\-]/g, '_');
                chatFilePath = path.join(groupChatsDir, `${sanitized}.jsonl`);
            }
            if (!fs.existsSync(chatFilePath)) {
                continue;
            }

            const { oldest, newest } = getOldestAndNewestFromChatFile(chatFilePath);
            if (oldest !== null && oldest < oldestAll) oldestAll = oldest;
            if (newest !== null && newest > newestAll) newestAll = newest;
        }

        if (oldestAll === Infinity && newestAll === 0) continue;

        const originalValues = {};
        let changed = false;

        if (oldestAll !== Infinity) {
            const rawDateAdded = group.date_added;
            const currentDateAdded = normalizeToMs(rawDateAdded);
            if (currentDateAdded === null || oldestAll < currentDateAdded) {
                changes.push({
                    groupId,
                    field: 'date_added',
                    old: rawDateAdded ?? '(none)',
                    new: oldestAll,
                    oldReadable: currentDateAdded ? new Date(currentDateAdded).toISOString() : '(none)',
                    newReadable: new Date(oldestAll).toISOString(),
                });
                originalValues.date_added = rawDateAdded ?? null;
                group.date_added = oldestAll;
                changed = true;
            }

            const rawCreateDate = group.create_date;
            const currentCreateDate = normalizeToMs(rawCreateDate);
            if (currentCreateDate === null || oldestAll < currentCreateDate) {
                changes.push({
                    groupId,
                    field: 'create_date',
                    old: rawCreateDate ?? '(none)',
                    new: new Date(oldestAll).toISOString(),
                    oldReadable: currentCreateDate ? new Date(currentCreateDate).toISOString() : '(none)',
                    newReadable: new Date(oldestAll).toISOString(),
                });
                originalValues.create_date = rawCreateDate ?? null;
                group.create_date = new Date(oldestAll).toISOString();
                changed = true;
            }
        }

        if (newestAll > 0) {
            const rawLastChat = group.date_last_chat;
            const currentLastChat = normalizeToMs(rawLastChat);
            if (currentLastChat === null || currentLastChat === 0 || newestAll > currentLastChat) {
                changes.push({
                    groupId,
                    field: 'date_last_chat',
                    old: rawLastChat ?? '(none)',
                    new: newestAll,
                    oldReadable: currentLastChat ? new Date(currentLastChat).toISOString() : '(none)',
                    newReadable: new Date(newestAll).toISOString(),
                });
                originalValues.date_last_chat = rawLastChat ?? null;
                group.date_last_chat = newestAll;
                changed = true;
            }
        }

        if (changed) {
            backup[groupId] = originalValues;
            fs.writeFileSync(groupFilePath, JSON.stringify(group, null, 4), 'utf8');
        }
    }

    if (changes.length === 0) {
        console.log('No group dates need fixing. Everything looks good!');
        return;
    }

    console.log(`\nFound ${changes.length} date(s) to fix:\n`);
    for (const c of changes) {
        console.log(`  [Group ${c.groupId}] ${c.field}:`);
        console.log(`    ${c.oldReadable} -> ${c.newReadable}`);
    }

    // Save backup
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 4), 'utf8');
    console.log(`\nBackup saved to ${backupFile}`);
    console.log(`\nTo undo these changes, run: node scripts/fix-group-dates.js --undo`);
}

main();
