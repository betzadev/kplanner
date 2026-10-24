use crate::models::{DDayEvent, SubjectItem};
use libsql::{Builder, Connection, Database};
use std::path::PathBuf;

pub struct TursoManager {
    db: Database,
    conn: Connection,
    is_remote: bool,
}

impl TursoManager {
    /// Inicializa la base de datos local SQLite (.db) usando libsql.
    /// Si se proporcionan turso_url y auth_token, opera en modo réplica remota con sincronización nativa.
    pub async fn init(
        local_db_path: PathBuf,
        turso_url: Option<String>,
        auth_token: Option<String>,
    ) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let (db, is_remote) = match (turso_url, auth_token) {
            (Some(url), Some(token)) if !url.trim().is_empty() && !token.trim().is_empty() => {
                // Modo réplica remota nativa con sincronización en la nube (Turso)
                let database = Builder::new_remote_replica(local_db_path, url, token)
                    .build()
                    .await
                    .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;
                (database, true)
            }
            _ => {
                // Modo local SQLite puro (0ms de latencia, sin conexión requerida)
                let database = Builder::new_local(local_db_path)
                    .build()
                    .await
                    .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;
                (database, false)
            }
        };

        let conn = db
            .connect()
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;

        // Crear tablas principales para las hojas diarias y materias con columnas updated_at
        conn.execute(
            "CREATE TABLE IF NOT EXISTS daily_sheets (
                date TEXT PRIMARY KEY,
                main_goal TEXT,
                total_minutes INTEGER,
                data_json TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            );",
            (),
        )
        .await
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS subjects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                slot_index INTEGER NOT NULL,
                updated_at INTEGER NOT NULL DEFAULT 0
            );",
            (),
        )
        .await
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS dday_events (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                target_date TEXT NOT NULL,
                color_id TEXT NOT NULL,
                is_pinned INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );",
            (),
        )
        .await
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS gamification_profile (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                payload_json TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            );",
            (),
        )
        .await
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;

        Ok(Self { db, conn, is_remote })
    }

    /// Sincronización nativa con Turso: envía mutaciones locales y descarga las nuevas.
    /// Si la base es local pura, retorna Ok(0) sin error.
    pub async fn sync(&self) -> Result<usize, Box<dyn std::error::Error + Send + Sync>> {
        if !self.is_remote {
            // La base de datos es local pura, todos los cambios están persistidos en disco.
            return Ok(0);
        }

        let replicated = self
            .db
            .sync()
            .await
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;
        Ok(replicated.frames_synced())
    }

    #[allow(dead_code)]
    pub fn is_remote(&self) -> bool {
        self.is_remote
    }

    #[allow(dead_code)]
    pub fn connection(&self) -> &Connection {
        &self.conn
    }

    /// Escritura idempotente con UPSERT y timestamp updated_at
    pub async fn upsert_daily_sheet(
        &self,
        date: &str,
        main_goal: &str,
        total_minutes: u32,
        data_json: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;

        self.conn
            .execute(
                "INSERT INTO daily_sheets (date, main_goal, total_minutes, data_json, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)
                 ON CONFLICT(date) DO UPDATE SET
                     main_goal = excluded.main_goal,
                     total_minutes = excluded.total_minutes,
                     data_json = excluded.data_json,
                     updated_at = excluded.updated_at;",
                libsql::params![date, main_goal, total_minutes as i64, data_json, now],
            )
            .await
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;
        Ok(())
    }

    pub async fn upsert_subjects(
        &self,
        subjects: &[SubjectItem],
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;

        for s in subjects {
            self.conn
                .execute(
                    "INSERT INTO subjects (id, name, color, slot_index, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5)
                     ON CONFLICT(id) DO UPDATE SET
                         name = excluded.name,
                         color = excluded.color,
                         slot_index = excluded.slot_index,
                         updated_at = excluded.updated_at;",
                    libsql::params![
                        s.id.as_str(),
                        s.name.as_str(),
                        s.color.as_str(),
                        s.slot_index as i64,
                        now
                    ],
                )
                .await
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;
        }
        Ok(())
    }

    pub async fn upsert_dday_events(
        &self,
        events: &[DDayEvent],
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;

        for ev in events {
            self.conn
                .execute(
                    "INSERT INTO dday_events (id, title, target_date, color_id, is_pinned, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                     ON CONFLICT(id) DO UPDATE SET
                         title = excluded.title,
                         target_date = excluded.target_date,
                         color_id = excluded.color_id,
                         is_pinned = excluded.is_pinned,
                         updated_at = excluded.updated_at;",
                    libsql::params![
                        ev.id.as_str(),
                        ev.title.as_str(),
                        ev.target_date.as_str(),
                        ev.color_id.as_str(),
                        if ev.is_pinned { 1i64 } else { 0i64 },
                        now
                    ],
                )
                .await
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;
        }
        Ok(())
    }

    pub async fn upsert_gamification_profile(
        &self,
        payload_json: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;

        self.conn
            .execute(
                "INSERT INTO gamification_profile (id, payload_json, updated_at)
                 VALUES (1, ?1, ?2)
                 ON CONFLICT(id) DO UPDATE SET
                     payload_json = excluded.payload_json,
                     updated_at = excluded.updated_at;",
                libsql::params![payload_json, now],
            )
            .await
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;
        Ok(())
    }

    pub async fn get_gamification_profile(
        &self,
    ) -> Result<Option<String>, Box<dyn std::error::Error + Send + Sync>> {
        let mut rows = self
            .conn
            .query(
                "SELECT payload_json FROM gamification_profile WHERE id = 1;",
                (),
            )
            .await
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;

        if let Ok(Some(row)) = rows.next().await {
            let payload: String = row.get(0)?;
            Ok(Some(payload))
        } else {
            Ok(None)
        }
    }
}
