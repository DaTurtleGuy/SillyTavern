import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';

const INDEX_VERSION = 1;

function getIndexPath() {
    return path.join(globalThis.DATA_ROOT, '_cache', 'character-index.db');
}

let db = null;

function getDb() {
    if (db) return db;
    const dbPath = getIndexPath();
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initTables(db);
    return db;
}

function initTables(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value INTEGER
        );

        CREATE TABLE IF NOT EXISTS characters (
            user_folder TEXT NOT NULL,
            avatar TEXT NOT NULL,
            name TEXT,
            fav INTEGER DEFAULT 0,
            date_added REAL DEFAULT 0,
            create_date REAL DEFAULT 0,
            date_last_chat REAL DEFAULT 0,
            chat_size INTEGER DEFAULT 0,
            data_size INTEGER DEFAULT 0,
            tags TEXT DEFAULT '[]',
            chat TEXT,
            creator TEXT,
            creator_notes TEXT,
            character_version TEXT,
            mtime REAL DEFAULT 0,
            PRIMARY KEY (user_folder, avatar)
        );

        CREATE INDEX IF NOT EXISTS idx_characters_user_folder ON characters(user_folder);
        CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);
        CREATE INDEX IF NOT EXISTS idx_characters_fav ON characters(fav);
        CREATE INDEX IF NOT EXISTS idx_characters_date_last_chat ON characters(date_last_chat);
    `);

    const row = database.prepare('SELECT value FROM meta WHERE key = ?').get('version');
    if (!row) {
        database.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('version', INDEX_VERSION);
    }
}

export function closeIndex() {
    if (db) {
        db.close();
        db = null;
    }
}

export function needsRebuild(userFolder) {
    const database = getDb();
    const row = database.prepare('SELECT MAX(mtime) as max_mtime FROM characters WHERE user_folder = ?').get(userFolder);
    const indexedMtime = row?.max_mtime || 0;

    try {
        const files = fs.readdirSync(userFolder, { withFileTypes: true });
        for (const file of files) {
            if (!file.isFile() || !file.name.endsWith('.png')) continue;
            const filePath = path.join(userFolder, file.name);
            const stat = fs.statSync(filePath);
            if (stat.mtimeMs > indexedMtime) {
                return true;
            }
        }
        const countRow = database.prepare('SELECT COUNT(*) as count FROM characters WHERE user_folder = ?').get(userFolder);
        const indexedCount = countRow?.count || 0;
        const pngCount = files.filter(f => f.isFile() && f.name.endsWith('.png')).length;
        return indexedCount !== pngCount;
    } catch (error) {
        console.error('Error checking for rebuild:', error);
        return true;
    }
}

export function getAllCharacters(userFolder) {
    const database = getDb();
    const rows = database.prepare(`
        SELECT avatar, name, fav, date_added, create_date, date_last_chat, chat_size, data_size, tags, chat, creator, creator_notes, character_version
        FROM characters WHERE user_folder = ?
    `).all(userFolder);

    return rows.map(row => ({
        shallow: true,
        name: row.name,
        avatar: row.avatar,
        chat: row.chat,
        fav: !!row.fav,
        date_added: row.date_added,
        create_date: row.create_date,
        date_last_chat: row.date_last_chat,
        chat_size: row.chat_size,
        data_size: row.data_size,
        tags: JSON.parse(row.tags || '[]'),
        data: {
            name: row.name,
            character_version: row.character_version || '',
            creator: row.creator || '',
            creator_notes: row.creator_notes || '',
            tags: JSON.parse(row.tags || '[]'),
            extensions: { fav: !!row.fav },
        },
    }));
}

export function upsertCharacter(userFolder, character) {
    const database = getDb();
    const avatarPath = path.join(userFolder, character.avatar);
    let mtime = 0;
    try {
        mtime = fs.statSync(avatarPath).mtimeMs;
    } catch {
        // File doesn't exist or is inaccessible, use default mtime
    }

    database.prepare(`
        INSERT OR REPLACE INTO characters (
            user_folder, avatar, name, fav, date_added, create_date, date_last_chat,
            chat_size, data_size, tags, chat, creator, creator_notes, character_version, mtime
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        userFolder,
        character.avatar,
        character.name || '',
        character.fav ? 1 : 0,
        character.date_added || 0,
        character.create_date || character.date_added || 0,
        character.date_last_chat || 0,
        character.chat_size || 0,
        character.data_size || 0,
        JSON.stringify(character.tags || []),
        character.chat || null,
        character.data?.creator || '',
        character.data?.creator_notes || '',
        character.data?.character_version || '',
        mtime,
    );
}

export function deleteCharacter(userFolder, avatar) {
    const database = getDb();
    database.prepare('DELETE FROM characters WHERE user_folder = ? AND avatar = ?').run(userFolder, avatar);
}

export function clearUserIndex(userFolder) {
    const database = getDb();
    database.prepare('DELETE FROM characters WHERE user_folder = ?').run(userFolder);
}

export async function rebuildIndex(userFolder, processCharacter, directories) {
    const database = getDb();
    database.prepare('DELETE FROM characters WHERE user_folder = ?').run(userFolder);

    try {
        const files = fs.readdirSync(userFolder, { withFileTypes: true });
        const pngFiles = files.filter(f => f.isFile() && f.name.endsWith('.png'));

        const results = [];
        for (const file of pngFiles) {
            try {
                const character = await processCharacter(file.name, directories, { shallow: true });
                if (character && character.name) {
                    upsertCharacter(userFolder, character);
                    results.push(character);
                }
            } catch (err) {
                console.error(`Failed to process ${file.name}:`, err);
            }
        }

        return results;
    } catch (error) {
        console.error('Error rebuilding index:', error);
        return [];
    }
}

export { getDb };
