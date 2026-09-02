@echo off
echo ==========================================
echo [SflTrade] Running update and deployment
echo ==========================================

echo 1. Staging files...
git add .

echo 2. Committing changes...
git commit -m "feat(sfltrade): implementa painel completo de inventario, custos e dados da api oficial na aba info"

echo 3. Pushing develop branch to origin...
git push origin develop

echo 4. Building production bundle...
call npm run build

echo 5. Copying docs to dist...
xcopy /E /I /Y docs dist\docs

echo 6. Deploying dist to gh-pages...
call npx gh-pages -d dist

echo ==========================================
echo [SflTrade] Process completed successfully!
echo ==========================================
