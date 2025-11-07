# testTenpo

Repositorio que da solución a los tres desafíos propuestos: documentación de la estrategia, infraestructura privada con Terraform y despliegue de una aplicación sobre GKE con pipeline end-to-end.

## Desafío #1 – Arquitectura y estrategia

### Diagrama de alto nivel

```mermaid
flowchart LR
	Dev["GitHub Actions\n(checkout, lint, test, build)"] -->|Terraform apply| GCPAPI((GCP APIs))
	subgraph VPC[Proyecto Tenpo - VPC Privada]
		subgraph PrivateSubnetwork[Subred privada 10.0.0.0/24]
			GKE[GKE Autopilot/Standard Cluster\nNodos sin IP pública]
			HPA[Horizontal Pod Autoscaler]
			Ingress[HTTP(S) Load Balancer]
			Service[ClusterIP / NodePort Service]
			Pods[Express App Pods]
			Logging[(Cloud Logging)]
		end
		subgraph DatabaseSubnetwork[Subred privada 10.0.1.0/24]
			CloudSQL[(Cloud SQL PostgreSQL)]
		end
		NAT[NAT Gateway]
	end
	Pods -->|Secret + Cloud SQL connector| CloudSQL
	Pods -->|Stdout JSON| Logging
	Ingress --> Service --> Pods
	HPA --> Pods
	Dev -->|GKE deploy| Pods
	NAT -->|Salida controlada| Internet
```

### Estrategia resumida
- Red privada dedicada con subredes separadas para Kubernetes y base de datos, sin exposición pública de IPs.
- GKE privado con nodo pool restringido y acceso a Cloud SQL mediante Cloud SQL Connector + servicio administrado.
- Cloud SQL PostgreSQL 15 en modo privado, emparejado a la VPC vía Service Networking.
- Salida a internet únicamente mediante Cloud NAT para actualizaciones del clúster.
- Pipelines separados: Terraform para infraestructura (seguridad/checks) y CI/CD de la aplicación (lint, test, build, despliegue).
- Observabilidad mediante logs estructurados (Pino → stdout → Cloud Logging) y health-checks.

## Desafío #2 – Infraestructura como código

### Recursos definidos en Terraform (`envs/dev`)
- `network.tf`: VPC, subredes privadas con rangos secundarios para Pods/Services y Cloud NAT.
- `database.tf`: Cloud SQL PostgreSQL privado + conexión de red de servicios y base/usuario inicial.
- `main.tf`: GKE privado, node pool sin IP pública, master authorized networks y configuraciones regionales.
- `variables.tf` / `terraform.tfvars`: parámetros de proyecto, regiones y credenciales.

### Pipeline de infraestructura (`.github/workflows/deploy.yml`)
- Ejecuta `terraform fmt`, `terraform validate` y análisis de seguridad con Checkov en cada PR.
- Genera `terraform plan` en PR y `terraform apply` en `main`, autenticándose con Google Workload Identity / service account.
- Asegura que cualquier cambio de IaC pase por controles de formato, validación y seguridad antes de ser aplicado.

### Ejecución manual
```bash
cd envs/dev
terraform init
terraform plan
terraform apply
```

## Desafío #3 – Aplicación desplegada en GKE

### Servicio Express (`app/`)
- Endpoints protegidos con OAuth2 Bearer (`src/auth.js`).
	- `GET /customers/:rut`: consulta clientes en Cloud SQL.
	- `POST /customers`: valida, persiste/actualiza el cliente y guarda el payload en `customer_events`.
- Conector Cloud SQL nativo (`@google-cloud/cloud-sql-connector`) para conectividad privada.
- Logs JSON estructurados (Pino) con `requestId` para trazar cada paso en Cloud Logging.
- Tests unitarios con Jest + Supertest (`app/test/customers.test.js`).

### Modelo de datos (`app/sql/schema.sql`)
- Tabla `customers` (upsert de clientes vía API) con `updated_at` automático.
- Tabla `customer_events` para historizar cada payload recibido, enlazada al cliente.

### Contenedorización y manifiestos
- `Dockerfile`: imagen Node 20 minimalista (instala dependencias en modo producción).
- `k8s/deployment.yaml`: Deployment + ServiceAccount, monta secretos de BD/credenciales y expone health-checks.
- `k8s/service.yaml`: Servicio NodePort interno para el Ingress.
- `k8s/ingress.yaml` + `k8s/certificate.yaml`: HTTP(S) load balancer con certificado administrado y dirección IP fija.
- `k8s/hpa.yaml`: HPA CPU 60% (2–20 réplicas) para soportar alzas 10x.
- `k8s/secret.yaml`: placeholders de secretos (deben reemplazarse antes de aplicar).

### Pipeline de la aplicación (`.github/workflows/app-delivery.yml`)
- Job `quality`: ejecuta `npm ci`, `npm run lint`, `npm test` (ESM + Jest) sobre `app/` en cada PR/push.
- Job `deploy`: en `main` construye con Cloud Build (`gcloud builds submit`), publica en Artifact Registry y aplica manifiestos renderizados con el nuevo tag.
- Requiere secretos en GitHub: `GCP_PROJECT_ID`, `GCP_REGION`, `GKE_CLUSTER_NAME`, `GKE_LOCATION`, `ARTIFACT_REGISTRY_REPOSITORY`, `GCP_SA_KEY`.

### Despliegue manual
```bash
# Construir imagen
docker build -t customer-query:dev app

# Test locales
cd app
npm run lint
npm test

# Aplicar manifiestos (reemplazar variables antes de usar en producción)
kubectl apply -f k8s/secret.yaml
ARTIFACT_REGISTRY="us-central1-docker.pkg.dev/proyecto/repo" IMAGE_TAG="manual" envsubst < k8s/deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/certificate.yaml
kubectl apply -f k8s/ingress.yaml
```

## Requisitos previos locales
- Terraform ≥ 1.5, Node.js ≥ 20, `gcloud` CLI configurado.
- Variables de entorno para ejecutar la API localmente:
	- `INSTANCE_CONNECTION_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
	- `OAUTH_ISSUER`, `OAUTH_AUDIENCE`, `OAUTH_JWKS_URI` para validar tokens.

## Estructura relevante

```
app/
├── Dockerfile
├── package.json
├── src/
│   ├── index.js
│   ├── server.js
│   ├── routes.js
│   ├── auth.js
│   ├── db.js
│   ├── logger.js
│   └── utils.js
├── test/
│   └── customers.test.js
└── sql/
		└── schema.sql
envs/dev/
├── main.tf
├── network.tf
├── database.tf
└── ...
k8s/
├── deployment.yaml
├── service.yaml
├── hpa.yaml
├── ingress.yaml
├── certificate.yaml
└── secret.yaml
.github/workflows/
├── deploy.yml          # Terraform pipeline
└── app-delivery.yml    # Aplicación (build + deploy)
```

## Credenciales y seguridad
- `envs/dev/service-account.json` es un placeholder; reemplazar por el JSON real o usar Workload Identity.
- Los secretos de Kubernetes (`k8s/secret.yaml`) contienen valores de ejemplo; reemplazarlos antes de aplicar.
- Agregar el servicio a Cloud Logging y definir alertas según métricas de HPA para cobertura operativa.
