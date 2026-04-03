#!/bin/bash
BASE="http://localhost:3001"
PASS=0; FAIL=0

check() {
  local name=$1 code=$2 expected=$3
  if [ "$code" = "$expected" ] || [ "$expected" = "ANY" ]; then
    echo "  PASS  $name ($code)"
    PASS=$((PASS+1))
  else
    echo "  FAIL  $name (got $code, expected $expected)"
    FAIL=$((FAIL+1))
  fi
}

echo "============================================"
echo "  SECOND BRAIN - API TEST SUITE"
echo "============================================"

# Register
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/auth/register" -H "Content-Type: application/json" -d '{"email":"apirun@test.com","password":"testpass123"}')
check "Register" "$CODE" "ANY"

# Login
CSRF=$(curl -s -c /tmp/apirun.txt "$BASE/api/v1/auth/csrf" | sed -n 's/.*"csrfToken":"\([^"]*\)".*/\1/p')
curl -s -b /tmp/apirun.txt -c /tmp/apirun.txt -X POST "$BASE/api/v1/auth/callback/credentials" -d "email=apirun@test.com&password=testpass123&csrfToken=$CSRF&redirect=false" -L > /dev/null 2>&1
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt "$BASE/api/v1/auth/session")
check "Login+Session" "$CODE" "200"

# Unauthed
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/notes")
check "Unauthed rejection" "$CODE" "401"

# Create note
NOTE=$(curl -s -b /tmp/apirun.txt -X POST "$BASE/api/v1/notes" -H "Content-Type: application/json" -d '{"title":"API Test","content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello world"}]}]}}')
NID=$(echo "$NOTE" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
if [ -n "$NID" ]; then check "Create note" "201" "201"; else check "Create note" "FAIL" "201"; fi

# Get note
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt "$BASE/api/v1/notes/$NID")
check "Get note" "$CODE" "200"

# Update note
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt -X PUT "$BASE/api/v1/notes/$NID" -H "Content-Type: application/json" -d '{"title":"Updated","isPinned":true,"isSensitive":true}')
check "Update note" "$CODE" "200"

# List notes
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt "$BASE/api/v1/notes?limit=5")
check "List notes" "$CODE" "200"

# Create tag
TAG=$(curl -s -b /tmp/apirun.txt -X POST "$BASE/api/v1/tags" -H "Content-Type: application/json" -d '{"name":"apirun-tag","color":"#16a34a"}')
TID=$(echo "$TAG" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
if [ -n "$TID" ]; then check "Create tag" "201" "201"; else check "Create tag" "FAIL" "201"; fi

# Assign tag
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt -X PUT "$BASE/api/v1/notes/$NID" -H "Content-Type: application/json" -d "{\"tagIds\":[\"$TID\"]}")
check "Assign tag" "$CODE" "200"

# Create journal
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt -X POST "$BASE/api/v1/journal" -H "Content-Type: application/json" -d '{"date":"2025-06-15","content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Journal test"}]}]},"mood":4,"energy":3}')
check "Create journal" "$CODE" "ANY"

# Get journal
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt "$BASE/api/v1/journal/2025-06-15")
check "Get journal" "$CODE" "200"

# Streaks
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt "$BASE/api/v1/journal/streaks")
check "Streaks" "$CODE" "200"

# Search
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt "$BASE/api/v1/search?q=Hello&mode=fulltext")
check "Fulltext search" "$CODE" "200"

# Search special chars
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt "$BASE/api/v1/search?q=foo+%26+bar&mode=fulltext")
check "Special chars search" "$CODE" "200"

# Templates
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt -X POST "$BASE/api/v1/templates" -H "Content-Type: application/json" -d '{"name":"Tmpl","content":{"type":"doc","content":[]}}')
check "Create template" "$CODE" "201"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt "$BASE/api/v1/templates")
check "List templates" "$CODE" "200"

# Conversations
CONV=$(curl -s -b /tmp/apirun.txt -X POST "$BASE/api/v1/ai/conversations" -H "Content-Type: application/json" -d '{}')
CID=$(echo "$CONV" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
if [ -n "$CID" ]; then check "Create conversation" "201" "201"; else check "Create conversation" "FAIL" "201"; fi

CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt -X POST "$BASE/api/v1/ai/conversations/$CID/messages" -H "Content-Type: application/json" -d '{"role":"user","content":"Test"}')
check "Add message" "$CODE" "201"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt "$BASE/api/v1/ai/conversations/$CID")
check "Get conversation" "$CODE" "200"

# Settings
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt "$BASE/api/v1/settings")
check "Get settings" "$CODE" "200"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt -X PUT "$BASE/api/v1/settings" -H "Content-Type: application/json" -d '{"aiRoutingMode":"hybrid"}')
check "Update settings" "$CODE" "200"

# Profile
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt "$BASE/api/v1/auth/profile")
check "Get profile" "$CODE" "200"

# Export
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt "$BASE/api/v1/export")
check "Export data" "$CODE" "200"

# AI Status
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt "$BASE/api/v1/ai/status")
check "AI status" "$CODE" "200"

# Soft delete
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt -X DELETE "$BASE/api/v1/notes/$NID")
check "Soft delete" "$CODE" "200"

# Trash
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt "$BASE/api/v1/notes/trash")
check "View trash" "$CODE" "200"

# Restore
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt -X PUT "$BASE/api/v1/notes/$NID/restore")
check "Restore" "$CODE" "200"

# Permanent delete
curl -s -o /dev/null -b /tmp/apirun.txt -X DELETE "$BASE/api/v1/notes/$NID"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt -X DELETE "$BASE/api/v1/notes/$NID/permanent")
check "Permanent delete" "$CODE" "200"

# Delete tag
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/apirun.txt -X DELETE "$BASE/api/v1/tags/$TID")
check "Delete tag" "$CODE" "200"

# Security: sidecar not exposed
CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://localhost:8000/health 2>/dev/null || echo "000")
if [ "$CODE" != "200" ]; then check "Sidecar not exposed" "PASS" "PASS"; else check "Sidecar not exposed" "FAIL" "PASS"; fi

# 404
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/nonexistent")
check "404 page" "$CODE" "404"

echo ""
echo "============================================"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "  Total: $((PASS + FAIL)) tests"
echo "============================================"

rm -f /tmp/apirun.txt
