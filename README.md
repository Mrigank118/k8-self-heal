
# Kubernetes Self-Healing Demonstration

## Overview

This project demonstrates key self-healing capabilities of Kubernetes by deploying a containerized Node.js application instrumented with startup, liveness, and readiness probes. The application exposes endpoints that simulate common failure modes, allowing a controlled study of how Kubernetes detects, isolates, and remediates failures automatically.

The objective is to showcase how Kubernetes maintains application availability and reduces MTTR (Mean Time To Recovery) without manual intervention.

---

## Core Concepts Demonstrated

### 1. Startup Probe

Certain applications require significant initialization time (e.g., data model load, warm cache, delayed dependency readiness). A `startupProbe` prevents Kubernetes from prematurely killing containers that are still booting.
Only after the startup probe succeeds do liveness and readiness probes become active.

### 2. Liveness Probe

A `livenessProbe` determines if the application is still functioning correctly. If it fails due to logical failure, deadlock, or internal corruption, Kubernetes automatically restarts the container to restore service availability.

### 3. Readiness Probe

A `readinessProbe` determines if the application is capable of serving traffic. When failing, Kubernetes stops routing traffic to the Pod but does not restart it. Readiness probes thereby protect the system from sending traffic to degraded instances.

### 4. Crash Recovery

A dedicated endpoint intentionally terminates the process to simulate unexpected container failure. Kubernetes detects the exit and automatically provisions a replacement container.

---

## Self-Healing Workflow Summary

| Failure Mode                              | Probe Involved | Remediation                                |
| ----------------------------------------- | -------------- | ------------------------------------------ |
| Slow startup                              | startupProbe   | Container startup allowed without restarts |
| Logical failure (deadlock, corrupt state) | livenessProbe  | Container restarted                        |
| Temporary unavailability                  | readinessProbe | Removed from load balancer (no restart)    |
| Application crash                         | N/A            | Pod restarted by kubelet / Deployment      |

---

## Application Endpoints

| Path         | Behavior                                      |
| ------------ | --------------------------------------------- |
| `/`          | Base route; reflects readiness state          |
| `/healthz`   | Health status for liveness and startup probes |
| `/unhealthy` | Forces liveness failure                       |
| `/notready`  | Forces readiness failure                      |
| `/ready`     | Restores readiness                            |
| `/crash`     | Simulates abrupt application crash            |

The application transitions through health states based on probe responses, enabling controlled testing of Kubernetes self-healing behavior.

---

## Startup Delay Simulation

A delayed initialization period is built into the application to demonstrate protection provided by the startup probe. During this window, both readiness and liveness fail, but the container remains alive because only the startup probe governs behavior during boot.

---

## Architecture

* Node.js application
* Docker container image hosted on Docker Hub
* Kubernetes Deployment with:

  * Startup probe
  * Liveness probe
  * Readiness probe
* kubectl for deployment and observation

The Deployment guarantees Pod replacement, while kubelet enforces container-level restart policies.

---

## Expected Behavior

1. During startup, the container remains running even when `/healthz` fails until initialization completes.
2. When liveness fails, Kubernetes restarts the container.
3. When readiness fails, Kubernetes removes the Pod from service endpoints without restart.
4. When `/crash` is invoked, Kubernetes automatically restarts the container.
5. After restart, readiness and liveness return to normal and traffic resumes.

---

## Learning Outcomes

This project highlights:

* Kubernetes declarative reliability controls
* Container-level process lifecycle management
* Pod lifecycle behavior driven by probe health
* Zero-touch remediation of common failure scenarios
* Differentiation between traffic readiness and operational health
* MTTR reduction and service continuity without manual action

---

## Key Takeaways

* Startup probes prevent false restarts during long initialization.
* Liveness probes enforce automatic recovery from broken states.
* Readiness probes ensure only healthy Pods receive traffic.
* Crash events are naturally remediated via restart policies.
* Kubernetes natively implements automated fault tolerance mechanisms.

---

## Next Extensions

Potential expansions:

* Horizontal Pod Autoscaling (HPA)
* Pod disruption budgets
* Istio fault injection
* Chaos engineering (Litmus, ChaosMesh)
* Distributed tracing and metrics with Prometheus/Grafana
* Canary rollouts and traffic splitting

---

## Conclusion

This project provides a controlled environment to study Kubernetes fault tolerance and automated remediation. By simulating failure conditions at application and container levels, it demonstrates how Kubernetes ensures service reliability by distinguishing between temporary unavailability and critical failure, preserving overall stability with minimal operator intervention.

---

