resource "google_compute_network" "vpc" {
  name                    = "demo-tenpo-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "private_subnet" {
  name          = "gke-subnet"
  ip_cidr_range = "10.1.0.0/16"
  region        = var.region
  network       = google_compute_network.vpc.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.2.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.3.0.0/16"
  }

  private_ip_google_access = true
}

# NAT Gateway
resource "google_compute_router" "router" {
  name    = "demo-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "demo-nat"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}