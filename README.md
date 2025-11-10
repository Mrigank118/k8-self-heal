

# Kubernetes Self-Healing Demonstration

## Overview

This project demonstrates core self-healing capabilities of Kubernetes using a containerized Node.js application. The system enables controlled failure scenarios to observe how Kubernetes reacts through automated restart, traffic withdrawal, and deferred readiness during slow startup conditions.

The primary objective is to illustrate how Kubernetes maintains application availability and minimizes MTTR (Mean Time To Recovery) by leveraging built-in probes and container lifecycle management.

---

## Core Concepts Demonstrated

### Startup Probe

Certain applications require extended initialization. `startupProbe` prevents premature restarts by disabling liveness/readiness checks until startup is complete.

### Liveness Probe

`livenessProbe` detects faulty or deadlocked applications. When the check fails, Kubernetes restarts the container to recover service.

### Readiness Probe

`readinessProbe` determines traffic availability. During failure, Pods are removed from endpoints while remaining alive. Kubernetes does not restart the container.

### Crash Recovery

A dedicated route forces immediate process exit, demonstrating automatic Pod restart at the container runtime level.

---

## Self-Healing Behavior Summary

| Scenario                | Probe          | Result                                    |
| ----------------------- | -------------- | ----------------------------------------- |
| Slow startup            | startupProbe   | Pod allowed to initialize without restart |
| Internal failure        | livenessProbe  | Container restarted                       |
| Temporarily unavailable | readinessProbe | Pod removed from Service endpoints        |
| Application crash       | N/A            | Container restarted by kubelet            |

---

## Application Endpoints

| Path         | Description                              |
| ------------ | ---------------------------------------- |
| `/`          | Base route; responds only when ready     |
| `/healthz`   | Health signal for liveness/startup       |
| `/unhealthy` | Forces liveness failure                  |
| `/notready`  | Forces readiness failure                 |
| `/ready`     | Restores readiness                       |
| `/crash`     | Terminates the process to simulate crash |

---

## Docker Image

Public image on Docker Hub:

```
mrigankwastaken/k8-self-heal:latest
```

You may use directly in Kubernetes deployments without building locally.

---

## Deployment Architecture

* Node.js application wrapped in Docker
* Deployment with:

  * startupProbe
  * livenessProbe
  * readinessProbe
* kubelet restartPolicy handling
* Declarative state control via Deployment

The Deployment guarantees Pod replacement. Kubelet enforces container restarts on failure.

---

# Running Steps

## 1) Clone Repository

```
git clone <repo_url>
cd k8-self-heal
```

## 2) Ensure Kubernetes Cluster Is Running

Start a local cluster (example: Minikube):

```
minikube start
```

Validate:

```
kubectl get nodes
```

## 3) Deploy to Kubernetes

Your Deployment configuration should reference the provided image:

```yaml
image: mrigankwastaken/k8-self-heal:latest
imagePullPolicy: Always
```

Apply deployment:

```
kubectl apply -f k8s-deployment.yaml
```

Verify:

```
kubectl get pods
```

Wait until:

```
2/2 Running
```

## 4) Port-Forward for Local Access

```
kubectl port-forward deployment/k8-self-heal 3000:3000
```

## 5) Test Endpoints

### Verify Ready

```
curl localhost:3000
```

### Check Liveness

```
curl localhost:3000/healthz
```

### Make Unhealthy → triggers liveness restart

```
curl localhost:3000/unhealthy
```

### Make Not Ready → traffic blocked, no restart

```
curl localhost:3000/notready
```

### Restore readiness

```
curl localhost:3000/ready
```

### Crash the process → container restarts

```
curl localhost:3000/crash
```

Check restart count:

```
kubectl get pods
```

## 6) View Logs

```
kubectl logs -f deployment/k8-self-heal
```

---

# Probe Behavior Validation

### Startup Probe

During initialization, `startupProbe` ensures Pod is not restarted even if `/healthz` fails. Liveness/readiness only begin after startup finishes.

### Liveness Probe

Upon `/unhealthy`, `/healthz` returns 500 → liveness fails → Pod restarts automatically → returns healthy.

### Readiness Probe

Upon `/notready`, traffic is stopped without restart. `/ready` restores traffic acceptance.

### Crash

`/crash` exits the process → kubelet restarts container → service restored.

---

## Key Takeaways

* startupProbe prevents false restarts during initialization.
* livenessProbe ensures automatic recovery after faults.
* readinessProbe preserves availability by isolating degraded Pods.
* Kubernetes natively applies resilient automation without operator intervention.
* System demonstrates automated remediation of different failure classes.

---

## Potential Extensions

* Horizontal Pod Autoscaling (HPA)
* Chaotic fault injection (Litmus / ChaosMesh)
* Istio-based latency or abort injection
* Tracing and metrics via Prometheus/Grafana
* Multi-replica testing with Pod kill and drain scenarios

---

## Conclusion

This project highlights the operational resilience that Kubernetes delivers through declarative configuration and runtime intelligence. By simulating controlled failures in a containerized workload, it demonstrates how Kubernetes distinguishes between transient unavailability and critical failure, applying appropriate remediation strategies with minimal intervention. This provides a framework for building highly available, fault-tolerant applications in production environments.

