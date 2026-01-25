#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# TCRN TMS mTLS Certificate Generation Script
# PRD §4.4: PII 数据分离架构 - mTLS 双向认证

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CERT_DIR="${CERT_DIR:-./certs}"
CA_VALIDITY_DAYS="${CA_VALIDITY_DAYS:-3650}"       # 10 years
CERT_VALIDITY_DAYS="${CERT_VALIDITY_DAYS:-365}"    # 1 year
KEY_SIZE="${KEY_SIZE:-4096}"
SERVER_KEY_SIZE="${SERVER_KEY_SIZE:-2048}"

# Subject fields
CA_CN="${CA_CN:-TCRN-TMS-CA}"
CA_O="${CA_O:-TCRN}"
CA_C="${CA_C:-CN}"

PII_SERVER_CN="${PII_SERVER_CN:-pii-service}"
API_CLIENT_CN="${API_CLIENT_CN:-tcrn-api}"

# SAN (Subject Alternative Names) for PII server
PII_SERVER_SAN="${PII_SERVER_SAN:-DNS:pii-service,DNS:localhost,DNS:tcrn-pii-service,IP:127.0.0.1}"

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  TCRN TMS mTLS Certificate Generation Script${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Create certificate directory
mkdir -p "$CERT_DIR"
echo -e "${YELLOW}Certificate directory: ${CERT_DIR}${NC}"

# Function to generate OpenSSL config for SAN
generate_san_config() {
    local config_file="$1"
    local san="$2"
    cat > "$config_file" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = ${PII_SERVER_CN}
O = ${CA_O}
C = ${CA_C}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = ${san}
EOF
}

# =============================================================================
# Step 1: Generate Root CA
# =============================================================================
echo ""
echo -e "${GREEN}[1/3] Generating Root CA...${NC}"

if [ -f "$CERT_DIR/ca.key" ] && [ -f "$CERT_DIR/ca.crt" ]; then
    echo -e "${YELLOW}  Root CA already exists. Skipping...${NC}"
    echo -e "${YELLOW}  Delete ${CERT_DIR}/ca.key and ${CERT_DIR}/ca.crt to regenerate.${NC}"
else
    # Generate CA private key
    openssl genrsa -out "$CERT_DIR/ca.key" "$KEY_SIZE" 2>/dev/null
    
    # Generate CA certificate
    openssl req -new -x509 -days "$CA_VALIDITY_DAYS" \
        -key "$CERT_DIR/ca.key" \
        -out "$CERT_DIR/ca.crt" \
        -subj "/CN=${CA_CN}/O=${CA_O}/C=${CA_C}"
    
    echo -e "${GREEN}  ✓ Root CA generated${NC}"
    echo "    - Private Key: $CERT_DIR/ca.key"
    echo "    - Certificate: $CERT_DIR/ca.crt"
    echo "    - Validity: $CA_VALIDITY_DAYS days"
fi

# =============================================================================
# Step 2: Generate PII Server Certificate
# =============================================================================
echo ""
echo -e "${GREEN}[2/3] Generating PII Server Certificate...${NC}"

if [ -f "$CERT_DIR/pii-server.key" ] && [ -f "$CERT_DIR/pii-server.crt" ]; then
    echo -e "${YELLOW}  PII Server certificate already exists. Skipping...${NC}"
    echo -e "${YELLOW}  Delete ${CERT_DIR}/pii-server.key and ${CERT_DIR}/pii-server.crt to regenerate.${NC}"
else
    # Generate server private key
    openssl genrsa -out "$CERT_DIR/pii-server.key" "$SERVER_KEY_SIZE" 2>/dev/null
    
    # Create SAN config file
    SAN_CONFIG="$CERT_DIR/pii-server-san.cnf"
    generate_san_config "$SAN_CONFIG" "$PII_SERVER_SAN"
    
    # Generate server CSR
    openssl req -new \
        -key "$CERT_DIR/pii-server.key" \
        -out "$CERT_DIR/pii-server.csr" \
        -config "$SAN_CONFIG"
    
    # Sign server certificate with CA
    openssl x509 -req -days "$CERT_VALIDITY_DAYS" \
        -in "$CERT_DIR/pii-server.csr" \
        -CA "$CERT_DIR/ca.crt" \
        -CAkey "$CERT_DIR/ca.key" \
        -CAcreateserial \
        -out "$CERT_DIR/pii-server.crt" \
        -extensions v3_req \
        -extfile "$SAN_CONFIG" 2>/dev/null
    
    # Clean up CSR and config
    rm -f "$CERT_DIR/pii-server.csr" "$SAN_CONFIG"
    
    echo -e "${GREEN}  ✓ PII Server certificate generated${NC}"
    echo "    - Private Key: $CERT_DIR/pii-server.key"
    echo "    - Certificate: $CERT_DIR/pii-server.crt"
    echo "    - CN: $PII_SERVER_CN"
    echo "    - SAN: $PII_SERVER_SAN"
    echo "    - Validity: $CERT_VALIDITY_DAYS days"
fi

# =============================================================================
# Step 3: Generate API Client Certificate
# =============================================================================
echo ""
echo -e "${GREEN}[3/3] Generating API Client Certificate...${NC}"

if [ -f "$CERT_DIR/api-client.key" ] && [ -f "$CERT_DIR/api-client.crt" ]; then
    echo -e "${YELLOW}  API Client certificate already exists. Skipping...${NC}"
    echo -e "${YELLOW}  Delete ${CERT_DIR}/api-client.key and ${CERT_DIR}/api-client.crt to regenerate.${NC}"
else
    # Generate client private key
    openssl genrsa -out "$CERT_DIR/api-client.key" "$SERVER_KEY_SIZE" 2>/dev/null
    
    # Generate client CSR
    openssl req -new \
        -key "$CERT_DIR/api-client.key" \
        -out "$CERT_DIR/api-client.csr" \
        -subj "/CN=${API_CLIENT_CN}/O=${CA_O}/C=${CA_C}"
    
    # Sign client certificate with CA
    openssl x509 -req -days "$CERT_VALIDITY_DAYS" \
        -in "$CERT_DIR/api-client.csr" \
        -CA "$CERT_DIR/ca.crt" \
        -CAkey "$CERT_DIR/ca.key" \
        -CAcreateserial \
        -out "$CERT_DIR/api-client.crt" 2>/dev/null
    
    # Clean up CSR
    rm -f "$CERT_DIR/api-client.csr"
    
    echo -e "${GREEN}  ✓ API Client certificate generated${NC}"
    echo "    - Private Key: $CERT_DIR/api-client.key"
    echo "    - Certificate: $CERT_DIR/api-client.crt"
    echo "    - CN: $API_CLIENT_CN"
    echo "    - Validity: $CERT_VALIDITY_DAYS days"
fi

# =============================================================================
# Step 4: Set Permissions
# =============================================================================
echo ""
echo -e "${GREEN}Setting file permissions...${NC}"

# Private keys: owner read only
chmod 600 "$CERT_DIR"/*.key 2>/dev/null || true

# Certificates: owner read, group read
chmod 644 "$CERT_DIR"/*.crt 2>/dev/null || true

# Clean up CA serial file if exists
rm -f "$CERT_DIR/ca.srl"

echo -e "${GREEN}  ✓ Permissions set${NC}"

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Certificate Generation Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Generated certificates in: $CERT_DIR"
echo ""
echo "Files:"
echo "  - ca.key          : Root CA private key (KEEP SECURE!)"
echo "  - ca.crt          : Root CA certificate"
echo "  - pii-server.key  : PII service private key"
echo "  - pii-server.crt  : PII service certificate"
echo "  - api-client.key  : API client private key"
echo "  - api-client.crt  : API client certificate"
echo ""
echo -e "${YELLOW}Environment Variables (add to .env.local):${NC}"
echo ""
echo "# PII Service (runs the PII transit service)"
echo "TLS_KEY_PATH=$CERT_DIR/pii-server.key"
echo "TLS_CERT_PATH=$CERT_DIR/pii-server.crt"
echo "TLS_CA_PATH=$CERT_DIR/ca.crt"
echo ""
echo "# API Service (connects to PII service)"
echo "PII_CLIENT_CERT_PATH=$CERT_DIR/api-client.crt"
echo "PII_CLIENT_KEY_PATH=$CERT_DIR/api-client.key"
echo "PII_CA_CERT_PATH=$CERT_DIR/ca.crt"
echo ""
echo -e "${RED}WARNING: These certificates are for development/testing only.${NC}"
echo -e "${RED}For production, use a proper CA or certificate management service.${NC}"
echo ""

# =============================================================================
# Verification (optional)
# =============================================================================
if [ "$1" == "--verify" ]; then
    echo ""
    echo -e "${GREEN}Verifying certificates...${NC}"
    echo ""
    
    echo "CA Certificate:"
    openssl x509 -in "$CERT_DIR/ca.crt" -noout -subject -issuer -dates
    echo ""
    
    echo "PII Server Certificate:"
    openssl x509 -in "$CERT_DIR/pii-server.crt" -noout -subject -issuer -dates
    echo ""
    
    echo "API Client Certificate:"
    openssl x509 -in "$CERT_DIR/api-client.crt" -noout -subject -issuer -dates
    echo ""
    
    echo "Verifying certificate chain..."
    openssl verify -CAfile "$CERT_DIR/ca.crt" "$CERT_DIR/pii-server.crt"
    openssl verify -CAfile "$CERT_DIR/ca.crt" "$CERT_DIR/api-client.crt"
fi
