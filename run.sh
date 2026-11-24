#!/bin/sh
cd "$(dirname "$0")"
echo "Ouvre http://localhost:8000 dans ton navigateur"
python3 -m http.server 8000
