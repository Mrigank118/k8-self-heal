#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-monitoring}"
LABEL_SELECTOR="${LABEL_SELECTOR:-app=k8-self-heal}"

# Find the current Pod and pick the first non-istio container as the "app" container
POD="$(kubectl -n "$NAMESPACE" get pod -l "$LABEL_SELECTOR" -o jsonpath='{.items[0].metadata.name}')"
APP_CONTAINER="$(kubectl -n "$NAMESPACE" get pod "$POD" -o jsonpath='{.spec.containers[0].name}')"
if [[ "$APP_CONTAINER" == "istio-proxy" ]]; then
  # fallback: if istio-proxy is first, pick the second
  APP_CONTAINER="$(kubectl -n "$NAMESPACE" get pod "$POD" -o jsonpath='{.spec.containers[1].name}')"
fi

# Baseline restart count for the app container
BASE_RESTARTS="$(kubectl -n "$NAMESPACE" get pod "$POD" \
  -o jsonpath="{.status.containerStatuses[?(@.name=='$APP_CONTAINER')].restartCount}")"

echo "Measuring MTTR for pod=$POD container=$APP_CONTAINER (baseline restarts=$BASE_RESTARTS)"

# Trigger a real failure inside the pod (app exits -> kubelet restarts)
START_EPOCH_MS="$(date +%s%3N || date +%s000)"
if ! kubectl -n "$NAMESPACE" exec "$POD" -c "$APP_CONTAINER" -- sh -lc 'curl -fsS 127.0.0.1:3000/crash || true'; then
  echo "Crash endpoint returned non-zero (expected)."
fi

# Wait until restartCount increases AND the app container is Ready again
TIMEOUT_SEC="${TIMEOUT_SEC:-180}"
DEADLINE=$(( $(date +%s) + TIMEOUT_SEC ))

while true; do
  # If the original pod got replaced entirely, pick the newest pod again
  if ! kubectl -n "$NAMESPACE" get pod "$POD" >/dev/null 2>&1; then
    POD="$(kubectl -n "$NAMESPACE" get pod -l "$LABEL_SELECTOR" -o jsonpath='{.items[0].metadata.name}')"
  fi

  CURRENT_RESTARTS="$(kubectl -n "$NAMESPACE" get pod "$POD" \
    -o jsonpath="{.status.containerStatuses[?(@.name=='$APP_CONTAINER')].restartCount}" 2>/dev/null || echo "")"
  READY_FLAG="$(kubectl -n "$NAMESPACE" get pod "$POD" \
    -o jsonpath="{.status.containerStatuses[?(@.name=='$APP_CONTAINER')].ready}" 2>/dev/null || echo "")"

  if [[ -n "$CURRENT_RESTARTS" && -n "$READY_FLAG" ]]; then
    if [[ "$CURRENT_RESTARTS" -gt "$BASE_RESTARTS" && "$READY_FLAG" == "true" ]]; then
      break
    fi
  fi

  if [[ $(date +%s) -ge $DEADLINE ]]; then
    echo "ERROR: Timed out waiting for restart+ready within ${TIMEOUT_SEC}s"
    exit 1
  fi
  sleep 0.5
done

END_EPOCH_MS="$(date +%s%3N || date +%s000)"
DELTA_MS=$(( END_EPOCH_MS - START_EPOCH_MS ))

printf "MTTR: %d ms (%.3f s)\n" "$DELTA_MS" "$(awk "BEGIN {printf \"%.3f\", $DELTA_MS/1000}")"
