#!/usr/bin/env bash
# 皮卡丘工作台 · 一键推送部署（token 由你本地掩码输入）
#   不进聊天、不写进 .git/config、不落盘；用完即弃。
# 用法（在 git-bash 里）：  bash scripts/push-deploy.sh
set -euo pipefail
cd "C:/Users/Windows/projects/pikachu-points"

read -rsp "粘贴 GitHub PAT（需 wxc705/pikachu-points 与 pikachu-data 的 Contents 读写）: " PAT
echo
[ -n "${PAT:-}" ] || { echo "空输入，退出"; exit 2; }

# credential.helper= 清空本地存的失效凭据；token 只走本次进程的 header，不落任何文件
GIT=(git -c credential.helper= -c "http.extraHeader=Authorization: Bearer $PAT"
     -c http.version=HTTP/1.1 -c http.curloptResolve=github.com:443:140.82.112.3)

echo "== 0/3 构建 + 产物自检 =="
npm run build:cloud >/dev/null 2>&1
npm run preflight | tail -3
touch dist/.nojekyll

echo "== 1/3 手动推 gh-pages（立即上线，不触发 CI）=="
"${GIT[@]}" fetch origin gh-pages >/dev/null 2>&1 || true
IDX="C:/Users/Windows/AppData/Local/hermes/cache/scratch/ghpages-idx-$RANDOM"
rm -f "$IDX"
GIT_INDEX_FILE="$IDX" GIT_WORK_TREE=dist git add -f -A . 2>/dev/null
TREE=$(GIT_INDEX_FILE="$IDX" git write-tree)
COMMIT=$(git commit-tree "$TREE" -p origin/gh-pages -m "deploy: $(git rev-parse HEAD)")
"${GIT[@]}" push origin "$COMMIT:refs/heads/gh-pages"
rm -f "$IDX"

echo "== 2/3 推 main（新 workflow 会跑 build:cloud + 产物断言再部署）=="
"${GIT[@]}" push origin main

echo "== 3/3 复验远端指针 =="
"${GIT[@]}" ls-remote --heads origin main gh-pages

echo
echo "完成。iPad 请硬刷新（PWA service worker 会缓存旧版）。"
