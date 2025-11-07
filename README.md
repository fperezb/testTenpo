# testTenpo

Configuración de Terraform para crear un cluster GKE básico en Google Cloud.

## Setup

Necesitas tener instalado:
- Terraform 1.5+
- gcloud CLI

## Credenciales

El archivo `envs/dev/service-account.json` es solo un placeholder. Para usar este proyecto:

1. Crea un service account en GCP con permisos para GKE
2. Descarga la clave JSON
3. Reemplaza el contenido de `service-account.json`
4. Agrega `service-account.json` al .gitignore

O usa gcloud auth:
```bash
gcloud auth application-default login
```

## Usar

```bash
cd envs/dev
terraform init
terraform plan
terraform apply
```

Esto crea:
- VPC privada con subnets para GKE y servicios
- Un cluster GKE privado (`demo-tenpo`) con nodos sin IPs públicas
- Una instancia PostgreSQL 15 privada (`demo-tenpo-db`) solo accesible desde la VPC
- NAT Gateway para conectividad de salida controlada
- Base de datos `appdb` y usuario `appuser`

## Limpiar

```bash
terraform destroy
```

## Estructura

```
envs/dev/
├── main.tf              # Config del cluster GKE privado
├── network.tf           # VPC, subnets y NAT Gateway
├── database.tf          # PostgreSQL privado con VPC peering
├── variables.tf         # Variables 
├── terraform.tfvars     # Valores (incluye db_password)
└── service-account.json # Credenciales (fake por ahora)
```

El proyecto está configurado para `ProyectoTenpoDev` pero puedes cambiar el project_id en `terraform.tfvars`.

## Notas

- Todos los recursos son privados (sin IPs públicas)
- El cluster GKE solo es accesible desde la VPC
- La BD PostgreSQL solo acepta conexiones privadas
- NAT Gateway permite salida a internet para actualizaciones
- Recuerda destruir los recursos para evitar costos (especialmente Cloud SQL)
- El service account necesita roles de container.admin, compute.admin, cloudsql.admin y servicenetworking.serviceAgent
- El password de BD está en terraform.tfvars (cambiar en prod)