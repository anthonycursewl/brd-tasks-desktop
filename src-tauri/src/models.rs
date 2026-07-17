use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

fn default_updated_at() -> DateTime<Utc> {
    Utc::now()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    pub completed: bool,
    pub completed_at: Option<DateTime<Utc>>,
    pub priority: String,
    pub tags: Vec<String>,
    pub notes: String,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    #[serde(default = "default_updated_at")]
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub version: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub avatar_url: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            avatar_url: String::new(),
        }
    }
}
