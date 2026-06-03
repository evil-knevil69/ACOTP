#!/usr/bin/env bash
# Downloads 113 Category-1 country flags from Wikimedia Commons into flags/
# Run this once from the repo root: bash download_flags.sh
# Then: git add flags/ && git commit -m "Add country flag SVGs" && git push

set -euo pipefail
UA="Mozilla/5.0 (compatible; ACOTP-mod/1.0; +https://github.com/evil-knevil69/ACOTP)"
DEST="$(dirname "$0")/flags"
mkdir -p "$DEST"

fetch() {
  local code="$1" url="$2"
  local out="$DEST/${code}.svg"
  if [[ -f "$out" ]]; then echo "skip $code (exists)"; return; fi
  echo -n "  $code ... "
  local status
  status=$(curl -s -o "$out" -w "%{http_code}" -L \
    -H "User-Agent: $UA" \
    -H "Referer: https://en.wikipedia.org/" \
    "$url")
  if [[ "$status" == "200" ]]; then
    echo "ok"
  else
    echo "FAILED ($status)"
    rm -f "$out"
  fi
}

echo "Downloading flags..."
fetch AD 'https://upload.wikimedia.org/wikipedia/commons/1/19/Flag_of_Andorra.svg'
fetch AE 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Flag_of_the_United_Arab_Emirates.svg'
fetch AR 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag_of_Argentina.svg'
fetch AT 'https://upload.wikimedia.org/wikipedia/commons/4/41/Flag_of_Austria.svg'
fetch AU 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Flag_of_Australia.svg'
fetch BB 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Flag_of_Barbados.svg'
fetch BD 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Flag_of_Bangladesh.svg'
fetch BE 'https://upload.wikimedia.org/wikipedia/commons/9/92/Flag_of_Belgium_(civil).svg'
fetch BI 'https://upload.wikimedia.org/wikipedia/commons/5/50/Flag_of_Burundi.svg'
fetch BO 'https://upload.wikimedia.org/wikipedia/commons/d/de/Flag_of_Bolivia_(state).svg'
fetch BR 'https://upload.wikimedia.org/wikipedia/commons/0/05/Flag_of_Brazil.svg'
fetch BS 'https://upload.wikimedia.org/wikipedia/commons/9/93/Flag_of_the_Bahamas.svg'
fetch BT 'https://upload.wikimedia.org/wikipedia/commons/9/91/Flag_of_Bhutan.svg'
fetch BW 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Flag_of_Botswana.svg'
fetch CA 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Flag_of_Canada_(Pantone).svg'
fetch CE 'https://upload.wikimedia.org/wikipedia/commons/1/11/Flag_of_Sri_Lanka.svg'
fetch CF 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Flag_of_the_Central_African_Republic.svg'
fetch CH 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Flag_of_Switzerland.svg'
fetch CI 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Flag_of_C%C3%B4te_d%27Ivoire.svg'
fetch CL 'https://upload.wikimedia.org/wikipedia/commons/7/78/Flag_of_Chile.svg'
fetch CN 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Flag_of_the_People%27s_Republic_of_China.svg'
fetch CO 'https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Colombia.svg'
fetch CR 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Flag_of_Costa_Rica.svg'
fetch CU 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Flag_of_Cuba.svg'
fetch CY 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Flag_of_Cyprus.svg'
fetch DE 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Flag_of_Germany.svg'
fetch DK 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Flag_of_Denmark.svg'
fetch DO 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Flag_of_the_Dominican_Republic.svg'
fetch DZ 'https://upload.wikimedia.org/wikipedia/commons/7/77/Flag_of_Algeria.svg'
fetch EC 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Flag_of_Ecuador.svg'
fetch FI 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_Finland.svg'
fetch FJ 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Flag_of_Fiji.svg'
fetch FR 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg'
fetch GA 'https://upload.wikimedia.org/wikipedia/commons/0/04/Flag_of_Gabon.svg'
fetch GB 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Flag_of_the_United_Kingdom.svg'
fetch GD 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_Grenada.svg'
fetch GH 'https://upload.wikimedia.org/wikipedia/commons/1/19/Flag_of_Ghana.svg'
fetch GM 'https://upload.wikimedia.org/wikipedia/commons/9/99/Flag_of_the_Gambia.svg'
fetch GN 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Flag_of_Guinea.svg'
fetch GQ 'https://upload.wikimedia.org/wikipedia/commons/3/31/Flag_of_Equatorial_Guinea.svg'
fetch GR 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Greece.svg'
fetch GT 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Flag_of_Guatemala.svg'
fetch GY 'https://upload.wikimedia.org/wikipedia/commons/9/99/Flag_of_Guyana.svg'
fetch HN 'https://upload.wikimedia.org/wikipedia/commons/8/82/Flag_of_Honduras.svg'
fetch ID 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Flag_of_Indonesia.svg'
fetch IE 'https://upload.wikimedia.org/wikipedia/commons/4/45/Flag_of_Ireland.svg'
fetch IL 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Flag_of_Israel.svg'
fetch IN 'https://upload.wikimedia.org/wikipedia/commons/4/41/Flag_of_India.svg'
fetch IS 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Flag_of_Iceland.svg'
fetch IT 'https://upload.wikimedia.org/wikipedia/commons/0/03/Flag_of_Italy.svg'
fetch JM 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Flag_of_Jamaica.svg'
fetch JO 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Flag_of_Jordan.svg'
fetch JP 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Flag_of_Japan.svg'
fetch KE 'https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_Kenya.svg'
fetch KP 'https://upload.wikimedia.org/wikipedia/commons/5/51/Flag_of_North_Korea.svg'
fetch KR 'https://upload.wikimedia.org/wikipedia/commons/0/09/Flag_of_South_Korea.svg'
fetch KW 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Flag_of_Kuwait.svg'
fetch LB 'https://upload.wikimedia.org/wikipedia/commons/5/59/Flag_of_Lebanon.svg'
fetch LI 'https://upload.wikimedia.org/wikipedia/commons/4/47/Flag_of_Liechtenstein.svg'
fetch LR 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Flag_of_Liberia.svg'
fetch LU 'https://upload.wikimedia.org/wikipedia/commons/d/da/Flag_of_Luxembourg.svg'
fetch MA 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Flag_of_Morocco.svg'
fetch MC 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Flag_of_Monaco.svg'
fetch MG 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_Madagascar.svg'
fetch ML 'https://upload.wikimedia.org/wikipedia/commons/9/92/Flag_of_Mali.svg'
fetch MT 'https://upload.wikimedia.org/wikipedia/commons/7/73/Flag_of_Malta.svg'
fetch MU 'https://upload.wikimedia.org/wikipedia/commons/7/77/Flag_of_Mauritius.svg'
fetch MV 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Flag_of_Maldives.svg'
fetch MW 'https://upload.wikimedia.org/wikipedia/commons/d/d1/Flag_of_Malawi.svg'
fetch MX 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Flag_of_Mexico.svg'
fetch MY 'https://upload.wikimedia.org/wikipedia/commons/6/66/Flag_of_Malaysia.svg'
fetch NE 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Flag_of_Niger.svg'
fetch NG 'https://upload.wikimedia.org/wikipedia/commons/7/79/Flag_of_Nigeria.svg'
fetch NI 'https://upload.wikimedia.org/wikipedia/commons/1/19/Flag_of_Nicaragua.svg'
fetch NL 'https://upload.wikimedia.org/wikipedia/commons/2/20/Flag_of_the_Netherlands.svg'
fetch NO 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Flag_of_Norway.svg'
fetch NP 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Flag_of_Nepal.svg'
fetch NR 'https://upload.wikimedia.org/wikipedia/commons/3/30/Flag_of_Nauru.svg'
fetch NZ 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Flag_of_New_Zealand.svg'
fetch OM 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Flag_of_Oman.svg'
fetch PA 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Flag_of_Panama.svg'
fetch PE 'https://upload.wikimedia.org/wikipedia/commons/c/cf/Flag_of_Peru.svg'
fetch PH 'https://upload.wikimedia.org/wikipedia/commons/9/99/Flag_of_the_Philippines.svg'
fetch PK 'https://upload.wikimedia.org/wikipedia/commons/3/32/Flag_of_Pakistan.svg'
fetch PT 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Portugal.svg'
fetch PY 'https://upload.wikimedia.org/wikipedia/commons/2/27/Flag_of_Paraguay.svg'
fetch QA 'https://upload.wikimedia.org/wikipedia/commons/6/65/Flag_of_Qatar.svg'
fetch SA 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Flag_of_Saudi_Arabia.svg'
fetch SD 'https://upload.wikimedia.org/wikipedia/commons/0/01/Flag_of_Sudan.svg'
fetch SE 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Flag_of_Sweden.svg'
fetch SG 'https://upload.wikimedia.org/wikipedia/commons/4/48/Flag_of_Singapore.svg'
fetch SL 'https://upload.wikimedia.org/wikipedia/commons/1/17/Flag_of_Sierra_Leone.svg'
fetch SM 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Flag_of_San_Marino.svg'
fetch SN 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Flag_of_Senegal.svg'
fetch SO 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Flag_of_Somalia.svg'
fetch SV 'https://upload.wikimedia.org/wikipedia/commons/3/34/Flag_of_El_Salvador.svg'
fetch SZ 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Flag_of_Eswatini.svg'
fetch TD 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Flag_of_Chad.svg'
fetch TG 'https://upload.wikimedia.org/wikipedia/commons/6/68/Flag_of_Togo.svg'
fetch TH 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Flag_of_Thailand.svg'
fetch TN 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Flag_of_Tunisia.svg'
fetch TO 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Tonga.svg'
fetch TR 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Flag_of_Turkey.svg'
fetch TT 'https://upload.wikimedia.org/wikipedia/commons/6/64/Flag_of_Trinidad_and_Tobago.svg'
fetch TW 'https://upload.wikimedia.org/wikipedia/commons/7/72/Flag_of_the_Republic_of_China.svg'
fetch TZ 'https://upload.wikimedia.org/wikipedia/commons/3/38/Flag_of_Tanzania.svg'
fetch UG 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Flag_of_Uganda.svg'
fetch US 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Flag_of_the_United_States.svg'
fetch UY 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Flag_of_Uruguay.svg'
fetch VA 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Flag_of_Vatican_City.svg'
fetch WS 'https://upload.wikimedia.org/wikipedia/commons/3/31/Flag_of_Samoa.svg'
fetch YE 'https://upload.wikimedia.org/wikipedia/commons/8/89/Flag_of_Yemen.svg'
fetch ZM 'https://upload.wikimedia.org/wikipedia/commons/0/06/Flag_of_Zambia.svg'

downloaded=$(ls "$DEST"/*.svg 2>/dev/null | wc -l)
echo ""
echo "Done. $downloaded / 113 flags saved to flags/"
echo ""
echo "Next steps:"
echo "  git add flags/"
echo "  git commit -m 'Add 113 country flag SVGs'"
echo "  git push"
