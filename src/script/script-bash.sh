#!/bin/bash
# Couleurs pour le terminal
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Scripts à exécuter
SCRIPTS=(
  "rsync -av ../exobase/src/bundles/ static/content/json2/"
  "node src/script/generate-exercises.js"
  "node generate-index.js"
)

SCRIPT_NAMES=(
  "Synchronisation des bundles"
  "Génération des exercices"
  "Génération de l'index"
)

# Fonction pour exécuter un script
execute_script() {
  local index=$1
  local cmd="${SCRIPTS[$index]}"
  local name="${SCRIPT_NAMES[$index]}"
  
  echo -e "\n${BLUE}${BOLD}=== Exécution: $name ===${NC}"
  echo -e "${YELLOW}$ $cmd${NC}\n"
  
  eval $cmd
  local status=$?
  
  if [ $status -eq 0 ]; then
    echo -e "\n${GREEN}${BOLD}✓ Script terminé avec succès${NC}"
  else
    echo -e "\n${RED}${BOLD}✗ Script terminé avec code d'erreur: $status${NC}"
  fi
  
  return $status
}

# Fonction pour exécuter tous les scripts
execute_all_scripts() {
  clear
  echo -e "${BLUE}${BOLD}===== EXÉCUTION DE TOUS LES SCRIPTS =====${NC}\n"
  
  local all_success=true
  
  for i in "${!SCRIPTS[@]}"; do
    execute_script $i
    if [ $? -ne 0 ]; then
      all_success=false
    fi
  done
  
  if $all_success; then
    echo -e "\n${GREEN}${BOLD}✓ Tous les scripts ont été exécutés avec succès${NC}"
  else
    echo -e "\n${YELLOW}${BOLD}⚠ Certains scripts ont échoué${NC}"
  fi
  
  echo -e "\nAppuyez sur Entrée pour revenir au menu..."
  read
}

# Afficher le menu
show_menu() {
  clear
  echo -e "${BLUE}${BOLD}===== GESTIONNAIRE DE SCRIPTS =====${NC}\n"
  
  for i in "${!SCRIPT_NAMES[@]}"; do
    echo -e "${BOLD}$((i+1)).${NC} ${SCRIPT_NAMES[$i]}"
    echo -e " ${YELLOW}${SCRIPTS[$i]}${NC}"
  done
  
  echo -e "\n${BOLD}A.${NC} Exécuter tous les scripts"
  echo -e "${BOLD}Q.${NC} Quitter"
  
  echo -e "\nChoisissez une option: "
  read -n 1 choice
  echo ""
  
  case $choice in
    [Qq])
      exit 0
      ;;
    [Aa])
      execute_all_scripts
      ;;
    [1-9])
      if [ $choice -le ${#SCRIPTS[@]} ]; then
        execute_script $((choice-1))
        echo -e "\nAppuyez sur Entrée pour revenir au menu..."
        read
      else
        echo -e "${RED}Option non valide!${NC}"
        sleep 1
      fi
      ;;
    *)
      echo -e "${RED}Option non valide!${NC}"
      sleep 1
      ;;
  esac
}

# Boucle principale
while true; do
  show_menu
done