#!/bin/bash
# Laddar upp appens programfiler till one.com med SFTP.
#
#   ./deploy.sh              filer som ändrats sedan förra lyckade uppladdningen (alla första gången)
#   ./deploy.sh --alla       alla programfiler
#   ./deploy.sh FIL...       bara angivna filer, till exempel public/assets/intraday.js
#   ./deploy.sh -n ...       visa vad som skulle laddas upp, utan att ansluta
#   ./deploy.sh --kolla      anslut och visa var sftp hamnar och vilka mappar som finns där
#
# Server och användare läses från .deploy.env (hålls utanför Git), till exempel:
#   SFTP_HOST=ssh.example.service.one
#   SFTP_USER=example_ssh
#   REMOTE_ROOT=webroots/www
# Uppgifterna finns under SFTP/SSH i one.com:s kontrollpanel. Lösenordet skrivs in när sftp frågar.
# REMOTE_ROOT är webbrotens mapp räknat från där sftp hamnar (den med aktier/ och _private/);
# utelämnas den används startmappen. Kör --kolla för att hitta den.
#
# public/X laddas upp till aktier/X och private/X till _private/aktier/X. Datafiler, config.php,
# sessioner, tester och lokala verktyg laddas aldrig upp. Uppladdade filer får rättigheterna 644,
# nya mappar 755 och config.php på servern 600, så att andra konton på servern inte kan ändra dem.
set -euo pipefail

cd "$(dirname "$0")"
STAMP=.deploy-stamp
DRY_RUN=0
ALL=0
CHECK=0
FILES=()
EXPLICIT=0

while [ $# -gt 0 ]; do
  case "$1" in
    -n) DRY_RUN=1 ;;
    --alla) ALL=1 ;;
    --kolla) CHECK=1 ;;
    -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "Okänd flagga: $1" >&2; exit 2 ;;
    *) FILES+=("${1#./}"); EXPLICIT=1 ;;
  esac
  shift
done

# Alla programfiler, utan data, hemligheter och lokala filer.
program_files() {
  find public private -type f \
    ! -path 'private/data/*' ! -path 'private/sessions/*' ! -path 'private/tests/*' ! -path 'private/bin/*' \
    ! -name config.php ! -name '.DS_Store' ! -name '*~' ! -name '*.lock' "$@" | sort
}

# Fjärrsökväg för en lokal fil, eller fel om filen inte får laddas upp.
remote_path() {
  case "$1" in
    private/data/*|private/sessions/*|private/tests/*|private/bin/*|*/config.php|config.php)
      echo "Laddas aldrig upp: $1" >&2; return 1 ;;
    public/*) echo "aktier/${1#public/}" ;;
    private/*) echo "_private/aktier/${1#private/}" ;;
    *) echo "Ligger inte i public/ eller private/: $1" >&2; return 1 ;;
  esac
}

load_env() {
  if [ ! -f .deploy.env ]; then
    echo "Saknar .deploy.env med SFTP_HOST och SFTP_USER (se början av $0)." >&2
    exit 1
  fi
  # shellcheck disable=SC1091
  . ./.deploy.env
  : "${SFTP_HOST:?SFTP_HOST saknas i .deploy.env}"
  : "${SFTP_USER:?SFTP_USER saknas i .deploy.env}"
}

if [ $CHECK -eq 1 ]; then
  load_env
  # '-' före kommandona: fortsätt även om en mapp saknas, så att allt visas.
  {
    echo 'pwd'
    echo '-ls -la'
    echo '-ls -la webroots/'
    echo '-ls -la webroots/*/'
    if [ -n "${REMOTE_ROOT:-}" ]; then
      echo "-cd \"$REMOTE_ROOT\""
      echo 'pwd'
      echo '-ls -la'
    fi
    echo '-ls -la aktier'
    echo '-ls -la _private/aktier'
    echo '-ls -la _private/aktier/src'
  } | sftp -o BatchMode=no -b - "$SFTP_USER@$SFTP_HOST"
  exit $?
fi

if [ ${#FILES[@]} -eq 0 ]; then
  if [ $ALL -eq 1 ] || [ ! -f "$STAMP" ]; then
    while IFS= read -r file; do FILES+=("$file"); done < <(program_files)
  else
    while IFS= read -r file; do FILES+=("$file"); done < <(program_files -newer "$STAMP")
  fi
fi

if [ ${#FILES[@]} -eq 0 ]; then
  echo "Inga ändrade filer sedan förra uppladdningen ($(date -r "$STAMP" '+%Y-%m-%d %H:%M'))."
  exit 0
fi

BATCH=$(mktemp)
trap 'rm -f "$BATCH"' EXIT
# Gå till webbroten och avbryt om appens mappar inte finns där, i stället för att skapa dem på fel ställe.
[ -f .deploy.env ] && . ./.deploy.env
[ -n "${REMOTE_ROOT:-}" ] && echo "cd \"$REMOTE_ROOT\"" >> "$BATCH"
echo 'ls aktier/paths.php' >> "$BATCH"
echo 'ls _private/aktier/src/bootstrap.php' >> "$BATCH"
DIRS="aktier|_private|_private/aktier"
echo "Laddar upp ${#FILES[@]} fil(er):"
for file in "${FILES[@]}"; do
  [ -f "$file" ] || { echo "Filen finns inte: $file" >&2; exit 1; }
  target=$(remote_path "$file")
  echo "  $file -> $target"
  # Skapa mappar som saknas; '-' gör att ett fel (mappen finns redan) inte avbryter.
  dir=$(dirname "$target")
  path=""
  for part in ${dir//\// }; do
    path="${path:+$path/}$part"
    case "|$DIRS|" in *"|$path|"*) ;; *) DIRS="$DIRS|$path"; echo "-mkdir \"$path\"" >> "$BATCH"; echo "chmod 755 \"$path\"" >> "$BATCH" ;; esac
  done
  echo "put \"$file\" \"$target\"" >> "$BATCH"
  echo "chmod 644 \"$target\"" >> "$BATCH"
done
# Lösenordshashen ska bara kunna läsas av webbhotellets eget konto (PHP körs som samma användare).
echo "-chmod 600 \"_private/aktier/config.php\"" >> "$BATCH"

if [ $DRY_RUN -eq 1 ]; then
  echo "(-n: ingen uppladdning gjordes)"
  exit 0
fi

load_env

# BatchMode=no före -b så att sftp får fråga efter lösenordet; -b avbryter vid första fel.
# mkdir för mappar som redan finns misslyckas avsiktligt; dölj de raderna men visa allt annat.
if sftp -o BatchMode=no -b "$BATCH" "$SFTP_USER@$SFTP_HOST" \
    > >(grep -v '^sftp> -mkdir ') 2> >(grep -v '^mkdir .*: Failure$' >&2); then
  # Angivna enskilda filer flyttar inte fram tidsstämpeln; andra ändrade filer är ju inte uppladdade.
  [ $EXPLICIT -eq 1 ] || touch "$STAMP"
  echo "Klart. Ladda om sidan med Cmd+Shift+R."
else
  echo "Uppladdningen avbröts; se felet ovan. Inget markerades som uppladdat." >&2
  exit 1
fi
