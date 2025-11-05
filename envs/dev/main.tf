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
  project = var.project_id
  region  = var.region
}

resource "google_container_cluster" "gke" {
  name     = "demo-Tenpo"
  location = var.region

  initial_node_count = 1

  node_config {
    machine_type = "e2-medium"
  }
}
