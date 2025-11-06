resource "google_sql_database_instance" "postgres" {
  name             = "demo-tenpo-db"
  region           = var.region
  database_version = "POSTGRES_15"

  settings {
    tier = "db-f1-micro" 

    backup_configuration {
      enabled = true
    }
  }
}

resource "google_sql_database" "app_db" {
  name     = "appdb"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "db_user" {
  name     = "appuser"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}
