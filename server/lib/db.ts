import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'aimazing.db')

const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'WAITING',
    creator_id TEXT NOT NULL,
    creator_prompt TEXT NOT NULL,
    opponent_id TEXT,
    opponent_prompt TEXT,
    game_state TEXT NOT NULL
  );
`)

export type GameStatus = 'WAITING' | 'PLAYING' | 'CREATOR_WIN' | 'OPPONENT_WIN' | 'DRAW'

export interface DbGame {
  id: string
  started_at: string
  status: GameStatus
  creator_id: string
  creator_prompt: string
  opponent_id: string | null
  opponent_prompt: string | null
  game_state: string
}

const insertGame = db.prepare(`
  INSERT INTO games (id, creator_id, creator_prompt, game_state)
  VALUES (?, ?, ?, ?)
`)

const updateGame = db.prepare(`
  UPDATE games SET status = ?, opponent_id = ?, opponent_prompt = ?, game_state = ?
  WHERE id = ?
`)

const selectGame = db.prepare(`SELECT * FROM games WHERE id = ?`)
const selectAllGames = db.prepare(`SELECT * FROM games ORDER BY started_at DESC`)

export function createGame(id: string, creatorId: string, creatorPrompt: string, gameState: string): void {
  insertGame.run(id, creatorId, creatorPrompt, gameState)
}

export function updateGameDb(id: string, status: GameStatus, opponentId: string | null, opponentPrompt: string | null, gameState: string): void {
  updateGame.run(status, opponentId, opponentPrompt, gameState, id)
}

export function getGame(id: string): DbGame | null {
  return selectGame.get(id) as DbGame | null
}

export function getAllGames(): DbGame[] {
  return selectAllGames.all() as DbGame[]
}
