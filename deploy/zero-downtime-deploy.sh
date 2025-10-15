#!/bin/bash
set -e

SERVICE_NAME="app"
COMPOSE_FILE="/opt/unjam/docker-compose.yml"

echo "Starting zero-downtime deployment..."

# Get the current container ID
OLD_CONTAINER_ID=$(docker ps -f name=${SERVICE_NAME} -q | tail -n1)
echo "Old container ID: ${OLD_CONTAINER_ID}"

# Bring up new container alongside existing
echo "Starting new container..."
docker-compose -f ${COMPOSE_FILE} up -d --no-deps --scale ${SERVICE_NAME}=2 --no-recreate ${SERVICE_NAME}

# Wait a moment for the new container to start
sleep 2

# Get new container ID and IP
NEW_CONTAINER_ID=$(docker ps -f name=${SERVICE_NAME} -q | head -n1)
echo "New container ID: ${NEW_CONTAINER_ID}"

# Verify new container is responding
echo "Verifying new container is healthy..."
NEW_CONTAINER_IP=$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${NEW_CONTAINER_ID})
echo "New container IP: ${NEW_CONTAINER_IP}"

# Health check with retries
curl --silent --include --retry-connrefused --retry 30 --retry-delay 1 --fail http://${NEW_CONTAINER_IP}:80/ || {
    echo "New container failed health check"
    docker logs ${NEW_CONTAINER_ID}
    docker stop ${NEW_CONTAINER_ID}
    docker rm ${NEW_CONTAINER_ID}
    exit 1
}

echo "New container is healthy, reloading nginx..."
# Reload nginx to route to new container (nginx picks up new container automatically)
NGINX_CONTAINER=$(docker ps -f name=nginx -q)
docker exec ${NGINX_CONTAINER} nginx -s reload

# Give nginx a moment to reload
sleep 2

echo "Stopping old container..."
# Remove old container
if [ ! -z "${OLD_CONTAINER_ID}" ]; then
    docker stop ${OLD_CONTAINER_ID}
    docker rm ${OLD_CONTAINER_ID}
fi

echo "Scaling back to single container..."
# Scale back to single container
docker-compose -f ${COMPOSE_FILE} up -d --no-deps --scale ${SERVICE_NAME}=1 --no-recreate ${SERVICE_NAME}

# Final nginx reload
echo "Final nginx reload..."
docker exec ${NGINX_CONTAINER} nginx -s reload

echo "Zero-downtime deployment complete!"
