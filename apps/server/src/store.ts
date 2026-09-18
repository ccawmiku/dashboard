import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  boardSchema,
  clockPoint,
  type Board,
} from '../../../packages/contracts/src/index';
import type { TimeSample } from '../../../packages/connector-sdk/src/index';

export class Store {
  private db: Database.Database;
  constructor(path: string, timezone: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    const version = this.db.pragma('user_version', { simple: true }) as number;
    if (version > 1) {
      this.db.close();
      throw new Error('DATABASE_VERSION_TOO_NEW');
    }
    this.db.transaction(() => {
      this.db.exec(
        'CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS diagnostics (key TEXT PRIMARY KEY, value TEXT NOT NULL); PRAGMA user_version = 1;',
      );
      const board: Board = {
        id: 'home',
        name: '我的看板',
        widgets: [
          {
            id: 'clock-main',
            type: 'digital-clock',
            version: 1,
            bindings: { time: clockPoint.id },
            options: { title: '数字时钟', timezone },
            position: { column: 0, row: 0 },
          },
        ],
      };
      this.db
        .prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)')
        .run('board', JSON.stringify(board));
      this.db
        .prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)')
        .run('point:dp_000001', JSON.stringify(clockPoint));
    })();
  }
  board(): Board {
    const row = this.db
      .prepare('SELECT value FROM config WHERE key = ?')
      .get('board') as { value: string };
    return boardSchema.parse(JSON.parse(row.value));
  }
  saveSample(sample: TimeSample) {
    // Diagnostics only: monotonic anchors must never be restored across process restarts.
    this.db
      .prepare('INSERT OR REPLACE INTO diagnostics (key,value) VALUES (?,?)')
      .run(
        'last-ntp',
        JSON.stringify({
          epochMs: sample.epochMs,
          offsetMs: sample.offsetMs,
          roundTripMs: sample.roundTripMs,
          server: sample.server,
        }),
      );
  }
  close() {
    this.db.close();
  }
}
