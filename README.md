

# Kubernetes Self-Healing and Fault-Injection Demonstration

## 1. Overview

This project presents an implementation of fault-tolerant application behavior in Kubernetes using a containerized Node.js workload. It demonstrates automatic workload remediation via Kubernetes self-healing primitives and controlled failure injection using Istio service mesh. The system enables analysis of application availability and Mean Time To Recovery (MTTR) under both application-level and network-level fault conditions.

---

## 2. Self-Healing Capabilities

### 2.1 Startup Probe

`startupProbe` defers liveness/readiness evaluation until application initialization completes, preventing premature termination during slow startup.

### 2.2 Liveness Probe

`livenessProbe` monitors application health. Failure signals (e.g., `/unhealthy`) result in automatic container restart enforced by kubelet.

### 2.3 Readiness Probe

`readinessProbe` controls traffic admission. When failing (e.g., `/notready`), the Pod is removed from Service endpoints but is not restarted. This preserves ongoing processes while preventing degraded instances from serving traffic.

### 2.4 Crash Recovery

A controlled `/crash` endpoint forces process termination. kubelet automatically reinstantiates the container via the deployment controller.

---

## 3. Self-Healing Behavioral Matrix

| Scenario              | Mechanism      | Result                               |
| --------------------- | -------------- | ------------------------------------ |
| Slow initialization   | startupProbe   | Pod permitted to complete startup    |
| Internal malfunction  | livenessProbe  | Container restarted                  |
| Temporary degradation | readinessProbe | Pod removed from routing; no restart |
| Process termination   | kubelet        | Container restarted                  |

---

## 4. Application Endpoints

| Endpoint     | Description                              |
| ------------ | ---------------------------------------- |
| `/`          | Base response; available only when Ready |
| `/healthz`   | Liveness / Startup probe target          |
| `/unhealthy` | Forces liveness failure                  |
| `/notready`  | Forces readiness failure                 |
| `/ready`     | Restores readiness state                 |
| `/crash`     | Terminates process to simulate crash     |

---

## 5. Runtime Image

```
mrigankwastaken/k8-self-heal:latest
```

---

## 6. Deployment Architecture

The application is deployed as a Kubernetes Deployment backed by a ClusterIP Service. Probes and kubelet restart policy enforce resiliency guarantees. Istio augments network behavior by introducing controlled upstream-failure simulation via VirtualService rules.

#### Components

* Deployment (application + sidecar)
* ClusterIP Service
* Istio Gateway
* Istio VirtualService
* Probes (startup / liveness / readiness)
* kubelet restart policy

---

## 7. Deployment Procedure

### 7.1 Cluster Initialization

```bash
minikube start
kubectl get nodes
```

### 7.2 Deploy Application

```bash
kubectl apply -f k8s-deployment.yaml
kubectl apply -f k8s-service.yaml
kubectl get pods
```

Expected:

```
2/2 Running   # App + Istio sidecar
```

### 7.3 Local Forwarding

(Optional)

```bash
kubectl port-forward deployment/k8-self-heal 3000:3000
```

---

## 8. Self-Healing Validation

### 8.1 Base Health

```bash
curl localhost:3000
curl localhost:3000/healthz
```

### 8.2 Liveness Failure → Restart

```bash
curl localhost:3000/unhealthy
kubectl get pods
```

### 8.3 Readiness Failure → Traffic Withdrawal

```bash
curl localhost:3000/notready
curl localhost:3000/ready
```

### 8.4 Crash Recovery

```bash
curl localhost:3000/crash
kubectl get pods
```

---

## 9. MTTR Evaluation

MTTR (Mean Time To Recovery) measures the time required for the system to return to a healthy Ready state following a real failure.

### 9.1 Steps

1. Monitor Pod lifecycle:

   ```bash
   kubectl get pods -w
   ```
2. Trigger failure:

   ```bash
   curl localhost:3000/crash
   ```
3. Record:

   * Timestamp of failure
   * Timestamp when replacement becomes `Ready`

Example:

```
Failure:  14:22:10
Ready:    14:22:38
MTTR ≈ 28s
```

> MTTR applies only to actual application-level failures (crash / failed liveness).
> Network-level failures do **not** trigger restarts and therefore do not participate in MTTR.

---

## 10. Fault Injection via Istio

Istio is utilized to inject controlled upstream failures to validate resilience under adverse network behavior.

### 10.1 Gateway

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: k8-self-heal-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "*"
```

### 10.2 VirtualService (50% HTTP-503 injection)

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: k8-self-heal
spec:
  hosts:
  - "*"
  gateways:
  - k8-self-heal-gateway
  http:
  - fault:
      abort:
        httpStatus: 503
        percentage:
          value: 50
    route:
    - destination:
        host: k8-self-heal
        port:
          number: 3000
```

### 10.3 Validation

Determine ingress:

```bash
kubectl -n istio-system get svc istio-ingressgateway
```

Traffic test:

```bash
while true; do curl http://<MINIKUBE_IP>:<INGRESS_PORT>; sleep 1; done
```

Expected output alternates:

```
HTTP 200 (application response)
HTTP 503 (fault-injected)
```

**No Pod restart occurs**.
This validates proper separation between network-level degradation (handled by mesh) and application-level failures (handled by Kubernetes).

---

## 11. System Behavior Summary

| Fault Type        | Triggered By | Pod Restart | MTTR Relevant |
| ----------------- | ------------ | ----------- | ------------- |
| Network abort     | Istio        | No          | No            |
| App crash         | /crash       | Yes         | Yes           |
| Liveness failure  | /unhealthy   | Yes         | Yes           |
| Readiness failure | /notready    | No          | No            |

---

## 12. Key Observations

* Probe-driven remediation ensures automatic restart upon application failure.
* Readiness isolation prevents degraded Pods from serving traffic without restarting them.
* Istio fault injection exercises service behavior under partial network outage without interfering with Pod health.
* MTTR captures recovery time exclusively for true application disruptions.

---

## 13. Conclusion

This implementation demonstrates how Kubernetes and Istio provide complementary resilience layers:

* **Kubernetes self-healing** reconstitutes workload state automatically in response to internal failure.
* **Istio fault injection** introduces deterministic failure scenarios at the traffic layer to validate behavioral robustness without destabilizing the underlying application.
* **MTTR measurements** quantify recovery efficiency and can guide SLO establishment.

Together, these capabilities form a robust foundation for reliable, fault-tolerant microservice platforms.

