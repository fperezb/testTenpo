resource "google_compute_global_address" "private_ip_address" {
  name          = "private-ip-address"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
}

resource "google_sql_database_instance" "postgres" {
  name             = "demo-tenpo-db"
  region           = var.region
  database_version = "POSTGRES_15"

  settings {
    tier = "db-f1-micro"
    
    # Configuración de red privada
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    backup_configuration {
      enabled = true
    }
  }

  depends_on = [google_service_networking_connection.private_vpc_connection]
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
