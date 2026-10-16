#!/usr/bin/env bash
# 문명탐험가 홈페이지 배포 헬퍼 — git push 한 번으로 Vercel 자동 배포.
# 저장소 kyvikosgit/civilization-explorer, 브랜치 main. 푸시 계정만 보장하고 끝나면 복구.
#   ./deploy.sh "커밋 메시지"   # add -A → commit(변경시) → push → 배포
#   ./deploy.sh                 # 커밋 없이 현재 브랜치 푸시만
set -euo pipefail
cd "$(dirname "$0")"

PUSH_ACCT="kyvikosgit"   # 이 저장소 푸시 권한 계정
RESTORE_ACCT="hareha"    # 끝나면 복구할 평소 계정
REFSPEC="main"           # 로컬:원격 (main→origin/main)
REPO_URL="https://github.com/kyvikosgit/civilization-explorer.git"   # 배포 저장소(Vercel 프로젝트 civilization-explorer 연결)

msg="${*:-}"
if [ -n "$msg" ] && ! git diff --quiet HEAD 2>/dev/null; then
  git add -A && git commit -m "$msg"
fi

# origin 이 옛 저장소 주소면 새 주소로 맞춘다
if [ "$(git remote get-url origin 2>/dev/null)" != "$REPO_URL" ]; then git remote set-url origin "$REPO_URL"; fi

switched=0
if command -v gh >/dev/null 2>&1; then
  cur="$(gh auth status --active 2>/dev/null | sed -n 's/.*account \([^ ]*\) .*/\1/p' | head -1 || true)"
  if [ "$cur" != "$PUSH_ACCT" ]; then gh auth switch --user "$PUSH_ACCT" >/dev/null 2>&1 && switched=1 || true; fi
fi

git push origin "$REFSPEC"; rc=$?

if [ "$switched" = 1 ]; then gh auth switch --user "$RESTORE_ACCT" >/dev/null 2>&1 || true; fi
[ $rc -eq 0 ] && echo "✓ 푸시 완료 → Vercel 자동 배포" || echo "✗ 푸시 실패"
exit $rc
