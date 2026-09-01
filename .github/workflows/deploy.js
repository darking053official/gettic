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
        run: npm install

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
              echo "✅ $wat_file → $wasm_file ($(stat -c%s "$wasm_file") bytes)"
            else
              echo "❌ $wat_file dönüştürülemedi!"
            fi
          done
          ls -la *.wasm

      - name: Start server
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          JWT_REFRESH_SECRET: ${{ secrets.JWT_REFRESH_SECRET }}
          GMAIL_CLIENT_ID: ${{ secrets.GMAIL_CLIENT_ID }}
          GMAIL_CLIENT_SECRET: ${{ secrets.GMAIL_CLIENT_SECRET }}
          GMAIL_REFRESH_TOKEN: ${{ secrets.GMAIL_REFRESH_TOKEN }}
          GMAIL_USER: ${{ secrets.GMAIL_USER }}
          PORT: "3000"
        run: |
          node server.js &
          sleep 5
          echo "=== SERVER READY ==="
          curl -s http://localhost:3000/api/health || echo "Health check failed"

      - name: Start Cloudflare Tunnel
        id: tunnel
        run: |
          curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
          chmod +x cloudflared
          ./cloudflared tunnel --url http://localhost:3000 2>&1 | tee tunnel.log &
          sleep 10
          TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' tunnel.log | head -1)
          echo "TUNNEL_URL=$TUNNEL_URL"
          echo "TUNNEL_URL=$TUNNEL_URL" >> $GITHUB_ENV
          echo "tunnel_url=$TUNNEL_URL" >> $GITHUB_OUTPUT

      - name: Update config.js
        if: env.TUNNEL_URL != ''
        run: |
          sed -i "s|const API = .*|const API = '${{ env.TUNNEL_URL }}';|" app/js/config.js
          echo "Updated API to: ${{ env.TUNNEL_URL }}"

      - name: Commit & Push
        if: env.TUNNEL_URL != ''
        run: |
          git config user.email "actions@github.com"
          git config user.name "GitHub Actions"
          git add app/js/config.js app/wasm/*.wasm
          git diff --cached --quiet && echo "No changes" || git commit -m "🔗 API + WASM: ${{ env.TUNNEL_URL }}"
          git push || echo "Push failed"

      - name: Show URL
        run: |
          echo "=========================================="
          echo "🌐 CANLI URL (60 dakika geçerli):"
          echo "${{ env.TUNNEL_URL }}"
          echo "=========================================="

      - name: Keep alive
        run: |
         sleep infinity
