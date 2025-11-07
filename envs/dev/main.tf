terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.40"
    }
  }
}

provider "google" {
  credentials = file(var.credentials_file)
  project     = var.project_id
  region      = var.region
}

resource "google_container_cluster" "gke" {
  name       = "demo-tenpo"
  location   = var.region
  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.private_subnet.name

  # Cluster privado
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = true
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  # Ranges secundarios para pods y servicios
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Acceso autorizado al master
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "10.1.0.0/16"
      display_name = "VPC"
    }
  }

  initial_node_count       = 1
  remove_default_node_pool = true
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "primary-node-pool"
  location   = var.region
  cluster    = google_container_cluster.gke.name
  node_count = 1

  node_config {
    machine_type = "e2-medium"
    
    # Nodos sin IPs públicas
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}
