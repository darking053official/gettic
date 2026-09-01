name: Run Gettic with Cloudflare Tunnel

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  run:
    runs-on: ubuntu-latest
    timeout-minutes: 360

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd app
          npm install

      - name: Convert .wat to .wasm
        run: |
          echo "=== .wat → .wasm ==="
          cd app/wasm
          npm install -g wabt
          for wat_file in *.wat; do
            wasm_file="${wat_file%.wat}.wasm"
            rm -f "$wasm_file"
            wat2wasm "$wat_file" -o "$wasm_file"
            if [ -f "$wasm_file" ]; then
              echo "$wat_file → $wasm_file ($(stat -c%s "$wasm_file") bytes)"
            else
              echo "$wat_file dönüştürülemedi!"
            fi
          done
          ls -la *.wasm

      - name: Start server
        env:
          MYSQL_HOST: ${{ secrets.MYSQL_HOST }}
          MYSQL_USER: ${{ secrets.MYSQL_USER }}
          MYSQL_PASSWORD: ${{ secrets.MYSQL_PASSWORD }}
          MYSQL_DATABASE: ${{ secrets.MYSQL_DATABASE }}
          REDIS_HOST: ${{ secrets.REDIS_HOST }}
          REDIS_PORT: ${{ secrets.REDIS_PORT }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          JWT_REFRESH_SECRET: ${{ secrets.JWT_REFRESH_SECRET }}
          PORT: "8080"
        run: |
          cd app
          node server.js &
          sleep 5
          echo "=== SERVER READY ==="
          curl -s http://localhost:8080/api/health || echo "Health check failed"

      - name: Start Cloudflare Tunnel
        id: tunnel
        run: |
          curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
          chmod +x cloudflared
          ./cloudflared tunnel --url http://localhost:8080 2>&1 | tee tunnel.log &
          sleep 10
          TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' tunnel.log | head -1)
          echo "TUNNEL_URL=$TUNNEL_URL"
          echo "TUNNEL_URL=$TUNNEL_URL" >> $GITHUB_ENV
          echo "tunnel_url=$TUNNEL_URL" >> $GITHUB_OUTPUT

      - name: Update backendsite.ts
        if: env.TUNNEL_URL != ''
        run: |
          sed -i "s|backendUrl: ''|backendUrl: '${{ env.TUNNEL_URL }}'|" app/js/site/backendsite.ts
          echo "Updated backend URL to: ${{ env.TUNNEL_URL }}"

      - name: Commit & Push
        if: env.TUNNEL_URL != ''
        run: |
          git config user.email "actions@github.com"
          git config user.name "GitHub Actions"
          git add app/js/site/backendsite.ts app/wasm/*.wasm
          git diff --cached --quiet && echo "No changes" || git commit -m "Update API + WASM: ${{ env.TUNNEL_URL }}"
          git push || echo "Push failed"

      - name: Show URL
        run: |
          echo "=========================================="
          echo "CANLI URL (60 dakika geçerli):"
          echo "${{ env.TUNNEL_URL }}"
          echo "=========================================="

      - name: Keep alive
        run: |
          sleep infinity
