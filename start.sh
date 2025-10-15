#!/bin/bash

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

echo "Building and starting Water Boiler Control application..."
docker-compose up -d --build

echo "Application is starting..."
echo "Check logs with: docker-compose logs -f"
echo "Stop with: docker-compose down"
echo "Access the application at: http://localhost:5000"