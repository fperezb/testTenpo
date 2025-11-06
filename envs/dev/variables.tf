variable "project_id" {
  description = "ID del proyecto en Google Cloud"
  type        = string
}

variable "region" {
  description = "Región de Google Cloud para desplegar recursos"
  type        = string
  default     = "southamerica-west1"
}

variable "credentials_file" {
  description = "Ruta al archivo de credenciales del Service Account"
  type        = string
  default     = "./service-account.json"
}

variable "db_password" {
  type      = string
  sensitive = true
}