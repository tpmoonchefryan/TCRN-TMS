#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# Database initialization and health check script for TCRN TMS
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== TCRN TMS Database Initialization ===${NC}"
echo ""

# Configuration
MAIN_CONTAINER="tcrn-postgres"
PII_CONTAINER="tcrn-pii-postgres"
MAIN_DB="tcrn_tms"
PII_DB="pii_vault"
MAIN_USER="${POSTGRES_USER:-tcrn}"
PII_USER="${PII_POSTGRES_USER:-pii_user}"

# Function to check if a container is running
check_container() {
    local container=$1
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        return 0
    else
        return 1
    fi
}

# Function to wait for database to be ready
wait_for_db() {
    local container=$1
    local user=$2
    local max_attempts=30
    local attempt=1
    
    echo -n "  Waiting for database to be ready"
    while [ $attempt -le $max_attempts ]; do
        if docker exec "$container" pg_isready -U "$user" &>/dev/null; then
            echo -e " ${GREEN}Ready!${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
        ((attempt++))
    done
    echo -e " ${RED}Timeout!${NC}"
    return 1
}

# Step 1: Check Docker daemon
echo -e "${YELLOW}1. Checking Docker...${NC}"
if ! docker info &>/dev/null; then
    echo -e "   ${RED}Error: Docker is not running!${NC}"
    echo "   Please start Docker Desktop or the Docker daemon first."
    exit 1
fi
echo -e "   ${GREEN}Docker is running${NC}"

# Step 2: Check main PostgreSQL container
echo ""
echo -e "${YELLOW}2. Checking main PostgreSQL container (${MAIN_CONTAINER})...${NC}"
if check_container "$MAIN_CONTAINER"; then
    echo -e "   ${GREEN}Container is running${NC}"
else
    echo -e "   ${RED}Container not running!${NC}"
    echo "   Starting containers with: docker-compose up -d postgres"
    
    # Check if docker-compose.yml exists
    if [ -f "docker-compose.yml" ]; then
        docker-compose up -d postgres
        sleep 3
        if check_container "$MAIN_CONTAINER"; then
            echo -e "   ${GREEN}Container started successfully${NC}"
        else
            echo -e "   ${RED}Failed to start container${NC}"
            exit 1
        fi
    else
        echo -e "   ${RED}docker-compose.yml not found!${NC}"
        echo "   Please run this script from the project root directory."
        exit 1
    fi
fi

# Wait for main database to be ready
wait_for_db "$MAIN_CONTAINER" "$MAIN_USER"

# Step 3: Check main database exists
echo ""
echo -e "${YELLOW}3. Checking main database (${MAIN_DB})...${NC}"
if docker exec "$MAIN_CONTAINER" psql -U "$MAIN_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$MAIN_DB"; then
    echo -e "   ${GREEN}Database ${MAIN_DB} exists${NC}"
else
    echo -e "   ${RED}Database ${MAIN_DB} not found!${NC}"
    echo "   This usually means the POSTGRES_DB environment variable is not set correctly."
    echo "   Check your .env.local file and docker-compose.yml"
    echo ""
    echo "   Attempting to create database..."
    if docker exec "$MAIN_CONTAINER" psql -U "$MAIN_USER" -c "CREATE DATABASE ${MAIN_DB};" 2>/dev/null; then
        echo -e "   ${GREEN}Database created successfully${NC}"
    else
        echo -e "   ${RED}Failed to create database${NC}"
        exit 1
    fi
fi

# Step 4: Check tenant_template schema
echo ""
echo -e "${YELLOW}4. Checking tenant_template schema...${NC}"
SCHEMA_EXISTS=$(docker exec "$MAIN_CONTAINER" psql -U "$MAIN_USER" -d "$MAIN_DB" -tAc \
    "SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name='tenant_template')" 2>/dev/null || echo "f")

if [ "$SCHEMA_EXISTS" = "t" ]; then
    echo -e "   ${GREEN}tenant_template schema exists${NC}"
    
    # Check if tables exist
    TABLE_COUNT=$(docker exec "$MAIN_CONTAINER" psql -U "$MAIN_USER" -d "$MAIN_DB" -tAc \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='tenant_template'" 2>/dev/null || echo "0")
    echo -e "   Found ${TABLE_COUNT} tables in tenant_template"
else
    echo -e "   ${YELLOW}tenant_template schema not found${NC}"
    echo "   This is expected for a fresh installation."
    echo "   Run database initialization to create schemas and seed data."
fi

# Step 5: Check tenant_ac schema (AC tenant)
echo ""
echo -e "${YELLOW}5. Checking AC tenant schema (tenant_ac)...${NC}"
AC_SCHEMA_EXISTS=$(docker exec "$MAIN_CONTAINER" psql -U "$MAIN_USER" -d "$MAIN_DB" -tAc \
    "SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name='tenant_ac')" 2>/dev/null || echo "f")

if [ "$AC_SCHEMA_EXISTS" = "t" ]; then
    echo -e "   ${GREEN}tenant_ac schema exists${NC}"
else
    echo -e "   ${YELLOW}tenant_ac schema not found${NC}"
    echo "   Run database initialization to create the AC tenant."
fi

# Step 6: Check PII PostgreSQL container (optional)
echo ""
echo -e "${YELLOW}6. Checking PII PostgreSQL container (${PII_CONTAINER})...${NC}"
if check_container "$PII_CONTAINER"; then
    echo -e "   ${GREEN}Container is running${NC}"
    
    # Check PII database
    if docker exec "$PII_CONTAINER" psql -U "$PII_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$PII_DB"; then
        echo -e "   ${GREEN}Database ${PII_DB} exists${NC}"
    else
        echo -e "   ${YELLOW}Database ${PII_DB} not found${NC}"
    fi
else
    echo -e "   ${YELLOW}Container not running (optional for local development)${NC}"
    echo "   To start: docker-compose up -d pii-postgres"
fi

# Step 7: Check Redis
echo ""
echo -e "${YELLOW}7. Checking Redis container (tcrn-redis)...${NC}"
if check_container "tcrn-redis"; then
    echo -e "   ${GREEN}Container is running${NC}"
    
    # Check Redis connection
    if docker exec tcrn-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        echo -e "   ${GREEN}Redis is responding${NC}"
    else
        echo -e "   ${RED}Redis is not responding${NC}"
    fi
else
    echo -e "   ${YELLOW}Container not running${NC}"
    echo "   To start: docker-compose up -d redis"
fi

# Summary
echo ""
echo -e "${BLUE}=== Summary ===${NC}"
echo ""

if [ "$SCHEMA_EXISTS" = "t" ] && [ "$AC_SCHEMA_EXISTS" = "t" ]; then
    echo -e "${GREEN}Database is fully initialized!${NC}"
    echo ""
    echo "You can now start the application with:"
    echo "  pnpm dev"
else
    echo -e "${YELLOW}Database needs initialization.${NC}"
    echo ""
    echo "Run the following commands to initialize:"
    echo ""
    echo "  # 1. Ensure containers are running"
    echo "  docker-compose up -d postgres redis"
    echo ""
    echo "  # 2. Initialize database (migrations + seed)"
    echo "  cd packages/database && pnpm db:init"
    echo ""
    echo "  # 3. (Optional) Start PII service database"
    echo "  docker-compose up -d pii-postgres"
    echo "  cd apps/pii-service && pnpm prisma:push"
fi

echo ""
