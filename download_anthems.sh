#!/usr/bin/env bash
# Downloads 1974-era national anthems from Wikimedia Commons.
# Historical versions are used where a country's anthem changed after 1974.
#
# Usage: save this file anywhere on your Mac, then run:
#   bash download_anthems.sh
#
# Creates an "anthems" folder next to this script containing CC.ogg files.
# Upload those files to the repo at:
#   https://github.com/evil-knevil69/ACOTP/upload/main/anthems
# (drag-and-drop all OGG files at once, then commit directly to main)
#
# Files marked [UNCERTAIN] are best-guess filenames — failures will be reported.
# Files marked [HISTORICAL] use the 1974-era version, not the current anthem.
# EP (East Pakistan) is omitted — country ceased to exist in 1971.

set -uo pipefail
UA="Mozilla/5.0 (compatible; ACOTP-mod/1.0; +https://github.com/evil-knevil69/ACOTP)"
DEST="$(cd "$(dirname "$0")" && pwd)/anthems"
mkdir -p "$DEST"

fetch() {
  local code="$1" url="$2"
  local out="$DEST/${code}.ogg"
  if [[ -f "$out" ]]; then echo "skip $code (exists)"; return; fi
  echo -n "  $code ... "
  local status attempts=0
  while [[ $attempts -lt 5 ]]; do
    status=$(curl -s -o "$out" -w "%{http_code}" -L \
      -H "User-Agent: $UA" \
      -H "Referer: https://en.wikipedia.org/" \
      "$url")
    if [[ "$status" == "200" ]]; then
      echo "ok"
      sleep 0.5
      return
    elif [[ "$status" == "429" ]]; then
      attempts=$((attempts + 1))
      local wait=$((attempts * 3))
      echo -n "(429, retrying in ${wait}s) "
      rm -f "$out"
      sleep "$wait"
    else
      echo "FAILED ($status)"
      rm -f "$out"
      return
    fi
  done
  echo "FAILED (gave up after repeated 429s)"
  rm -f "$out"
}

echo "Downloading national anthems (1974-era)..."

# ── High-confidence filenames ─────────────────────────────────────────────────

fetch AD 'https://upload.wikimedia.org/wikipedia/commons/5/5b/El_Gran_Carlemany.ogg'
fetch AF 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Former_Afghan_national_anthem%2C_1973-1978.oga'  # [HISTORICAL] Republic 1973-78
fetch AL 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Himni_i_Flamurit_instrumental.ogg'
fetch AR 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Himno_Nacional_Argentino_instrumental.ogg'
fetch AT 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Land_der_Berge_Land_am_Strome_instrumental.ogg'
fetch AU 'https://upload.wikimedia.org/wikipedia/commons/a/a6/U.S._Navy_Band%2C_Advance_Australia_Fair_%28instrumental%29.ogg'
fetch BB 'https://upload.wikimedia.org/wikipedia/commons/9/95/United_States_Navy_Band_-_In_Plenty_and_In_Time_of_Need.ogg'
fetch BD 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Amar_Shonar_Bangla_instrumental.ogg'
fetch BE 'https://upload.wikimedia.org/wikipedia/commons/e/e8/La_Braban%C3%A7onne.oga'
fetch BG 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Mila_Rodino_instrumental.ogg'
fetch BO 'https://upload.wikimedia.org/wikipedia/commons/5/54/Himno_Nacional_de_Bolivia_instrumental.ogg'
fetch BR 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Hino_Nacional_Brasileiro_instrumental.ogg'
fetch BT 'https://upload.wikimedia.org/wikipedia/commons/f/fb/National_Anthem_of_the_Kingdom_of_Bhutan.ogg'
fetch BU 'https://upload.wikimedia.org/wikipedia/commons/d/db/U.S._Navy_Band_-_Kaba_Ma_Kyei.oga'                # Burma/Myanmar
fetch CA 'https://upload.wikimedia.org/wikipedia/commons/b/b4/United_States_Navy_Band_-_O_Canada.ogg'
fetch CE 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Sri_Lankan_national_anthem%2C_performed_by_the_United_States_Navy_Band.oga'
fetch CH 'https://upload.wikimedia.org/wikipedia/commons/9/91/Schweizerpsalm%2C_Lausanne_2014.ogg'
fetch CI 'https://upload.wikimedia.org/wikipedia/commons/b/bd/L%27Abidjanaise.ogg'
fetch CN 'https://upload.wikimedia.org/wikipedia/commons/b/b9/March_of_the_Volunteers_instrumental.ogg'
fetch CU 'https://upload.wikimedia.org/wikipedia/commons/4/41/Cuban_national_anthem_%28abridged_version%29%2C_performed_by_the_U.S._Navy_Band.oga'
fetch CY 'https://upload.wikimedia.org/wikipedia/commons/d/db/Hymn_to_liberty_instrumental.oga'
fetch DD 'https://upload.wikimedia.org/wikipedia/commons/a/a2/National-Anthem-of-East-Germany-_1949-1990_-Auferstanden-Aus-Ruinen-_Risen-from-Ruins.ogg'  # [HISTORICAL]
fetch DE 'https://upload.wikimedia.org/wikipedia/commons/a/a6/German_national_anthem_performed_by_the_US_Navy_Band.ogg'
fetch DZ 'https://upload.wikimedia.org/wikipedia/commons/7/79/National_anthem_of_Algeria%2C_by_the_U.S._Navy_Band.oga'
fetch EG 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Bilady%2C_Bilady%2C_Bilady.ogg'
fetch ES 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Marcha_Real-Royal_March_by_US_Navy_Band.ogg'
fetch ET 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Ityopp%27ya_Hoy_dess_yibelish.ogg'               # [HISTORICAL] Imperial anthem pre-Sep 1974
fetch FI 'https://upload.wikimedia.org/wikipedia/commons/e/ee/Maamme.ogg'
fetch FR 'https://upload.wikimedia.org/wikipedia/commons/3/30/La_Marseillaise.ogg'
fetch GB 'https://upload.wikimedia.org/wikipedia/commons/0/03/United_States_Navy_Band_-_God_Save_the_Queen.oga'
fetch GQ 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Equatorial_Guinea%27s_national_anthem%2C_performed_by_the_United_States_Navy_Band.oga'
fetch GR 'https://upload.wikimedia.org/wikipedia/commons/d/db/Hymn_to_liberty_instrumental.oga'
fetch GT 'https://upload.wikimedia.org/wikipedia/commons/8/8f/National_anthem_of_Guatemala%2C_by_the_U.S._Navy_Band.oga'
fetch HU 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Hungarian_national_anthem%2C_performed_by_the_United_States_Navy_Band_%28May_1997_arrangement%29.oga'
fetch ID 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Indonesia_Raya_instrumental.ogg'
fetch IL 'https://upload.wikimedia.org/wikipedia/commons/2/26/Hatikvah_instrumental.ogg'
fetch IN 'https://upload.wikimedia.org/wikipedia/commons/9/94/Jana_Gana_Mana_instrumental.ogg'
fetch IR 'https://upload.wikimedia.org/wikipedia/commons/7/70/Former_imperial_Iranian_national_anthem%2C_performed_by_the_United_States_Navy_Band.oga'  # [HISTORICAL] pre-1979
fetch IT 'https://upload.wikimedia.org/wikipedia/commons/c/c0/National_anthem_of_Italy_-_U.S._Navy_Band_%28long_version%29.ogg'
fetch JM 'https://upload.wikimedia.org/wikipedia/commons/a/a2/%27Jamaica%2C_Land_We_Love%27%2C_performed_by_the_United_States_Navy_Band.oga'
fetch JP 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Kimi_ga_Yo_instrumental.ogg'
fetch KH 'https://upload.wikimedia.org/wikipedia/commons/a/af/United_States_Navy_Band_-_Nokoreach.ogg'          # [HISTORICAL] pre-Khmer Rouge 1975
fetch KR 'https://upload.wikimedia.org/wikipedia/commons/7/71/National_Anthem_of_South_Korea_%28Instrumental%2C_One_Verse%29.ogg'
fetch LA 'https://upload.wikimedia.org/wikipedia/commons/e/ee/National_Anthem_of_Laos.ogg'
fetch ML 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Malian_national_anthem%2C_performed_by_the_United_States_Navy_Band.oga'
fetch MN 'https://upload.wikimedia.org/wikipedia/commons/1/12/Mongolian_National_Anthem_-_1962_instrumental.oga'
fetch MX 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Himno_Nacional_Mexicano_instrumental.ogg'
fetch MY 'https://upload.wikimedia.org/wikipedia/commons/e/ee/Negaraku_instrumental.ogg'
fetch NG 'https://upload.wikimedia.org/wikipedia/commons/2/26/Nigeria_We_Hail_Thee.ogg'                        # [HISTORICAL] 1960-1978 anthem
fetch NL 'https://upload.wikimedia.org/wikipedia/commons/1/1f/Het_Wilhelmus.ogg'
fetch NO 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Norway_%28National_Anthem%29.ogg'
fetch NP 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Former_national_anthem_of_Nepal%2C_1962%E2%80%932006.oga'  # [HISTORICAL] 1962-2006
fetch NR 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Nauru_Bwiema.ogg'
fetch NZ 'https://upload.wikimedia.org/wikipedia/commons/d/d6/God_Defend_New_Zealand_instrumental.ogg'
fetch PH 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Lupang_Hinirang_instrumental.ogg'
fetch PL 'https://upload.wikimedia.org/wikipedia/commons/5/52/Mazurek_D%C4%85browskiego_%28official_instrumental%29.oga'
fetch PT 'https://upload.wikimedia.org/wikipedia/commons/5/58/A_Portuguesa.ogg'
fetch RH 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Rise%2C_O_Voices_of_Rhodesia.ogg'               # [HISTORICAL]
fetch RO 'https://upload.wikimedia.org/wikipedia/commons/6/6b/National_Anthem_of_Romania_%281953-1975%29_%28Vocal%29.ogg'  # [HISTORICAL] communist-era
fetch RW 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Former_Rwandan_national_anthem%2C_1962%E2%80%932001.oga'     # [HISTORICAL] pre-1994
fetch SA 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Saudi_Arabian_national_anthem%2C_performed_by_the_United_States_Navy_Band.oga'
fetch SD 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Sudanese_national_anthem%2C_performed_by_the_U.S._Navy_Band.oga'
fetch SG 'https://upload.wikimedia.org/wikipedia/commons/7/74/Majulah_Singapura.ogg'
fetch SN 'https://upload.wikimedia.org/wikipedia/commons/8/8c/National_Anthem_of_Senegal.ogg'
fetch SU 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Soviet_Union_national_anthem_%28instrumental%29%2C_1977.oga'  # [HISTORICAL]
fetch SWA 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Die_Stem_van_Suid-Afrika_%28Sung%2C_1952%29.oga'  # [HISTORICAL] SA anthem applied to SWA
fetch SY 'https://upload.wikimedia.org/wikipedia/commons/f/fc/National_Anthem_of_Syria.ogg'
fetch TH 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Thai_National_Anthem_-_US_Navy_Band.ogg'
fetch TN 'https://upload.wikimedia.org/wikipedia/commons/2/23/Humat_al-Hima.ogg'
fetch TR 'https://upload.wikimedia.org/wikipedia/commons/9/99/Istikl%C3%A2l_Marsi_instrumetal.ogg'
fetch TW 'https://upload.wikimedia.org/wikipedia/commons/9/98/National_Anthem_of_the_Republic_of_China.ogg'
fetch TZ 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Tanzanian_national_anthem%2C_performed_by_the_United_States_Navy_Band.oga'
fetch UG 'https://upload.wikimedia.org/wikipedia/commons/6/64/Ugandan_national_anthem%2C_performed_by_the_U.S._Navy_Band.ogg'
fetch US 'https://upload.wikimedia.org/wikipedia/commons/6/65/Star_Spangled_Banner_instrumental.ogg'
fetch VA 'https://upload.wikimedia.org/wikipedia/commons/d/d1/United_States_Navy_Band_-_Inno_e_Marcia_Pontificale.ogg'
fetch VD 'https://upload.wikimedia.org/wikipedia/commons/8/8e/National_Anthem_of_Vietnam.ogg'                  # [HISTORICAL] North Vietnam — Tiến Quân Ca
fetch VN 'https://upload.wikimedia.org/wikipedia/commons/9/92/Call_to_the_Citizens-South_Vietnamese_Republic_of_Vietnam_National_Anthem.ogg'  # [HISTORICAL]
fetch YU 'https://upload.wikimedia.org/wikipedia/commons/7/75/United_States_Navy_Band_-_Hey%2C_Slavs.ogg'      # [HISTORICAL]
fetch ZA 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Die_Stem_van_Suid-Afrika_%28Sung%2C_1952%29.oga'  # [HISTORICAL] pre-1994
fetch ZR 'https://upload.wikimedia.org/wikipedia/commons/5/52/Zaire_National_Anthem.ogg'                        # [HISTORICAL]

# ── Lower-confidence filenames (best guesses — failures expected for some) ────

fetch AE  'https://upload.wikimedia.org/wikipedia/commons/9/92/UAE_national_anthem.ogg'
fetch BH  'https://upload.wikimedia.org/wikipedia/commons/2/21/Bahraini_Anthem.ogg'
fetch BI  'https://upload.wikimedia.org/wikipedia/commons/7/71/Burundi_Bwacu_instrumental.ogg'
fetch BS  'https://upload.wikimedia.org/wikipedia/commons/3/37/March_On_Bahamaland_instrumental.ogg'
fetch BW  'https://upload.wikimedia.org/wikipedia/commons/c/cb/United_States_Navy_Band_-_Fatshe_leno_la_rona.ogg'
fetch CF  'https://upload.wikimedia.org/wikipedia/commons/8/85/La_Renaissance.ogg'
fetch CG  'https://upload.wikimedia.org/wikipedia/commons/d/dc/National_anthem_of_the_Republic_of_the_Congo.oga'
fetch CL  'https://upload.wikimedia.org/wikipedia/commons/6/6e/United_States_Navy_Band_-_National_Anthem_of_Chile.ogg'
fetch CM  'https://upload.wikimedia.org/wikipedia/commons/5/5c/Chant_de_Ralliement.ogg'
fetch CO  'https://upload.wikimedia.org/wikipedia/commons/2/24/Himno_Nacional_de_Colombia.ogg'
fetch CR  'https://upload.wikimedia.org/wikipedia/commons/7/79/Costa_Rica_National_Anthem.ogg'
fetch CS  'https://upload.wikimedia.org/wikipedia/commons/b/b8/Czechoslovakia_anthem.ogg'                       # [HISTORICAL]
fetch DK  'https://upload.wikimedia.org/wikipedia/commons/0/06/United_States_Navy_Band_-_Der_er_et_yndigt_land.ogg'
fetch DO  'https://upload.wikimedia.org/wikipedia/commons/b/bb/Dominican_Republic_National_Anthem.ogg'
fetch DY  'https://upload.wikimedia.org/wikipedia/commons/7/74/L%27Aube_Nouvelle.ogg'                           # [HISTORICAL] Dahomey 1960-1975
fetch EC  'https://upload.wikimedia.org/wikipedia/commons/c/c5/Ecuadorian_national_anthem_%28abridged%29.ogg'
fetch FJ  'https://upload.wikimedia.org/wikipedia/commons/c/ca/Fiji_National_Anthem.ogg'
fetch GA  'https://upload.wikimedia.org/wikipedia/commons/f/fc/La_Concorde.ogg'
fetch GD  'https://upload.wikimedia.org/wikipedia/commons/7/76/HailGrenada.ogg'
fetch GH  'https://upload.wikimedia.org/wikipedia/commons/4/43/National_Anthem_of_Ghana.ogg'
fetch GM  'https://upload.wikimedia.org/wikipedia/commons/8/80/For_The_Gambia_Our_Homeland.ogg'
fetch GN  'https://upload.wikimedia.org/wikipedia/commons/6/65/National_Anthem_of_Guinea_by_US_Navy_Band.ogg'
fetch GY  'https://upload.wikimedia.org/wikipedia/commons/8/85/National_Anthem_of_Guyana.ogg'
fetch HN  'https://upload.wikimedia.org/wikipedia/commons/b/b3/Honduras_National_Anthem.ogg'
fetch HT  'https://upload.wikimedia.org/wikipedia/commons/4/4f/Haiti_National_Anthem.ogg'
fetch HV  'https://upload.wikimedia.org/wikipedia/commons/5/5f/Une_Seule_Nuit.ogg'                              # [HISTORICAL] Upper Volta 1960-1984
fetch IE  'https://upload.wikimedia.org/wikipedia/commons/a/a0/Amhr%C3%A1n_na_bhFiann.ogg'
fetch IQ  'https://upload.wikimedia.org/wikipedia/commons/0/0b/Ardulfurataini_Watan.oga'                        # [HISTORICAL] 1965-1981
fetch IS  'https://upload.wikimedia.org/wikipedia/commons/4/4b/Lofs%C3%B6ngur.ogg'
fetch JO  'https://upload.wikimedia.org/wikipedia/commons/e/ee/National_anthem_of_Jordan_instrumental.ogg'
fetch KE  'https://upload.wikimedia.org/wikipedia/commons/4/49/National_Anthem_of_Kenya.ogg'
fetch KP  'https://upload.wikimedia.org/wikipedia/commons/9/93/Egukka.ogg'
fetch KW  'https://upload.wikimedia.org/wikipedia/commons/d/d4/National_anthem_of_Kuwait_%28instrumental%29.ogg'
fetch LB  'https://upload.wikimedia.org/wikipedia/commons/9/97/Lebanese_national_anthem.ogg'
fetch LI  'https://upload.wikimedia.org/wikipedia/commons/6/61/Oben_am_jungen_Rhein%2C_by_the_U.S._Navy_Band.ogg'
fetch LR  'https://upload.wikimedia.org/wikipedia/commons/6/65/Liberia_National_Anthem.ogg'
fetch LS  'https://upload.wikimedia.org/wikipedia/commons/6/68/National_anthem_of_Lesotho%2C_performed_by_the_U.S._Navy_Band.oga'
fetch LU  'https://upload.wikimedia.org/wikipedia/commons/4/45/Luxembourg_National_Anthem.ogg'
fetch LY  'https://upload.wikimedia.org/wikipedia/commons/0/02/Allahu_Akbar_%28Gaddafi%27s_anthem%29.ogg'       # [HISTORICAL] Gaddafi-era
fetch MA  'https://upload.wikimedia.org/wikipedia/commons/3/3f/National_Anthem_of_Morocco.ogg'
fetch MC  'https://upload.wikimedia.org/wikipedia/commons/c/c2/Monaco_National_Anthem.ogg'
fetch MG  'https://upload.wikimedia.org/wikipedia/commons/d/dd/Ry_Tanindrazanay_malala_%C3%B4%21_%28instrumental%29.ogg'
fetch MR  'https://upload.wikimedia.org/wikipedia/commons/2/2a/Former_Mauritanian_national_anthem_%281960%E2%80%932017%29%2C_performed_by_the_U.S._Navy_Band.ogg'
fetch MT  'https://upload.wikimedia.org/wikipedia/commons/6/6d/Malta_National_Anthem.ogg'
fetch MU  'https://upload.wikimedia.org/wikipedia/commons/7/75/Motherland_%28instrumental%29.ogg'
fetch MV  'https://upload.wikimedia.org/wikipedia/commons/c/c4/Gaumii_salaam.ogg'
fetch MW  'https://upload.wikimedia.org/wikipedia/commons/d/dd/Malawian_national_anthem.oga'
fetch NE  'https://upload.wikimedia.org/wikipedia/commons/6/69/La_Nig%C3%A9rienne_melody.ogg'                   # [HISTORICAL] 1961-1983
fetch NI  'https://upload.wikimedia.org/wikipedia/commons/d/db/National_Anthem_of_Nicaragua_by_US_Navy_Band.ogg'
fetch OM  'https://upload.wikimedia.org/wikipedia/commons/a/a7/National_anthem_of_Oman.ogg'
fetch PA  'https://upload.wikimedia.org/wikipedia/commons/4/4a/Panama_National_Anthem.ogg'
fetch PE  'https://upload.wikimedia.org/wikipedia/commons/c/cc/United_States_Navy_Band_-_Marcha_Nacional_del_Per%C3%BA.ogg'
fetch PK  'https://upload.wikimedia.org/wikipedia/commons/3/3a/Pakistani_national_anthem_-_United_States_Navy_Band.ogg'
fetch PY  'https://upload.wikimedia.org/wikipedia/commons/a/a6/Paraguayan_National_Anthem.oga'
fetch QA  'https://upload.wikimedia.org/wikipedia/commons/e/ec/National_anthem_of_Qatar.ogg'
fetch SE  'https://upload.wikimedia.org/wikipedia/commons/0/02/United_States_Navy_Band_-_Sweden.ogg'
fetch SK  'https://upload.wikimedia.org/wikipedia/commons/6/69/Sierra_Leone%27s_national_anthem.ogg'
fetch SL  'https://upload.wikimedia.org/wikipedia/commons/6/69/Sierra_Leone%27s_national_anthem.ogg'
fetch SM  'https://upload.wikimedia.org/wikipedia/commons/d/d9/Inno_Nazionale_della_Repubblica.ogg'
fetch SO  'https://upload.wikimedia.org/wikipedia/commons/4/4e/Somali_national_anthem%2C_performed_by_the_United_States_Navy_Band.oga'
fetch SV  'https://upload.wikimedia.org/wikipedia/commons/4/4e/El_Salvador_National_Anthem.ogg'
fetch SZ  'https://upload.wikimedia.org/wikipedia/commons/2/22/Nkulunkulu_Mnikati_wetibusiso_temaSwati_%28instrumental%29.ogg'
fetch TD  'https://upload.wikimedia.org/wikipedia/commons/1/12/La_Tchadienne.ogg'
fetch TG  'https://upload.wikimedia.org/wikipedia/commons/0/03/Togo%27s_national_anthem_%28instrumental%29.ogg'
fetch TO  'https://upload.wikimedia.org/wikipedia/commons/1/18/Ko_e_fasi_%CA%BBo_e_tu%CA%BBi_%CA%BBo_e_%CA%BBOtu_Tonga.ogg'
fetch TT  'https://upload.wikimedia.org/wikipedia/commons/b/b6/Forged_from_the_Love_of_Liberty.ogg'
fetch UY  'https://upload.wikimedia.org/wikipedia/commons/2/2b/United_States_Navy_Band_-_National_Anthem_of_Uruguay_%28complete%29.ogg'
fetch VE  'https://upload.wikimedia.org/wikipedia/commons/f/f0/United_States_Navy_Band_-_Gloria_al_Bravo_Pueblo.ogg'
fetch VU  'https://upload.wikimedia.org/wikipedia/commons/7/7f/United_States_Navy_Band_-_Yumi%2C_Yumi%2C_Yumi.ogg'
fetch WS  'https://upload.wikimedia.org/wikipedia/commons/9/97/Samoa_National_anthem.ogg'
fetch YD  'https://upload.wikimedia.org/wikipedia/commons/f/fe/National_Anthem_of_the_Peoples_Democratic_Republic_of_Yemen.ogg'  # [HISTORICAL]
fetch YE  'https://upload.wikimedia.org/wikipedia/commons/4/40/National_anthem_of_the_Kingdom_of_Yemen.ogg'
fetch ZM  'https://upload.wikimedia.org/wikipedia/commons/f/f6/Zambian_national_anthem.oga'

# ── Summary ───────────────────────────────────────────────────────────────────
downloaded=$(ls "$DEST"/*.ogg 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "Done. $downloaded anthems saved to: $DEST"
echo ""
echo "Upload to GitHub:"
echo "  1. Go to https://github.com/evil-knevil69/ACOTP/upload/main/anthems"
echo "  2. Drag and drop all OGG files from $DEST"
echo "  3. Commit directly to main"
echo ""
echo "Note: any FAILED entries used uncertain filenames — check Wikimedia Commons"
echo "manually and re-run the script with corrected URLs."
