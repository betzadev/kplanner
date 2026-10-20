use libsql::{Builder, Database, Connection};
use std::path::PathBuf;

pub struct TursoManager {
    db: Database,
    conn: Connection,
}

impl TursoManager {
    /// Inicializa la base de datos local SQLite (.db) usando libsql.
    /// Si se proporcionan turso_url y auth_token, opera en modo réplica remota con sincronización nativa.
    pub async fn init(
        local_db_path: PathBuf,
        turso_url: Option<String>,
        auth_token: Option<String>,
    ) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let db = match (turso_url, auth_token) {
            (Some(url), Some(token)) if !url.is_empty() && !token.is_empty() => {
                // Modo réplica remota nativa con sincronización en la nube (Turso)
                Builder::new_remote_replica(local_db_path, url, token)
                    .build()
                    .await
                    .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?
            }
            _ => {
                // Modo local SQLite puro (0ms de latencia, sin conexión requerida)
                Builder::new_local(local_db_path)
                    .build()
                    .await
                    .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?
            }
        };

        let conn = db.connect()
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;

        // Crear tablas principales para las hojas diarias y materias
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
                slot_index INTEGER NOT NULL
            );",
            (),
        )
        .await
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;

        Ok(Self { db, conn })
    }

    /// Sincronización nativa con Turso: envía mutaciones locales y descarga las nuevas
    pub async fn sync(&self) -> Result<usize, Box<dyn std::error::Error + Send + Sync>> {
        let replicated = self.db.sync().await
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;
        Ok(replicated.frames_synced())
    }

    pub fn connection(&self) -> &Connection {
        &self.conn
    }
}
