# openyourmath

Cette application a pour but de partager une base d'exercices de mathématiques sous différents formats. 

Pour tester l'application, voir ici : https://openyourmath.org

Pour tester l'application en local, vérifier que node est bien installé sur votre machine puis : 
```
git clone https://github.com/automathproject/openyourmath.git
cd openyourmath
npm install
npm run dev -- --open
```

Les exercices en LaTeX sont issus de : 
https://github.com/smaxx73/Exercices

Ils sont formatés de manière à être utilisés automatiquement par l'application.

To do :
- [x] Faire un moteur de recherche
- [x] Gérer automatiquement les images depuis le LaTeX
- [ ] Gérer l'export d'une fiche en LaTeX et en PDF
- [x] Importer la base d'exercices d'exo7
- [ ] Améliorer les listes d'exercices
- [ ] Affiner les possibilités d'affichage de question et réponse.

---

OpenYourMath V2 – README d’intention

🎯 Objectif

Refondre l’application web SvelteKit pour servir des exercices LaTeX convertis en HTML/KaTeX et TikZ/SVG, avec recherche rapide via SQLite FTS5 (et éventuellement recherche vectorielle).
La production des artefacts lourds (LaTeX, TikZ) est effectuée hors production, afin que le déploiement soit léger, rapide et reproductible avec Docker.


---

🛠 Architecture globale

1. Pipeline de build (hors VPS)

Scripts Node.js :

Parsing LaTeX : extraction métadonnées et contenu.

Conversion mathématiques → HTML via KaTeX.

Compilation TikZ → SVG.

Génération de la base SQLite avec index FTS5 pour la recherche texte (option : index vectoriel embeddings LLM).


Artefacts générés :

data/exercises.sqlite        # Base indexée (read-only)
static/artifacts/**          # SVG, HTML précompilés

Build SvelteKit (adapter-node) → bundle prêt à exécuter.

Création d’une image Docker runtime :

Contient le code Node + build SvelteKit.

Ne contient pas TeX ni outils lourds.

Image pushée vers un Docker registry (ex. GitHub Container Registry).



---

2. Architecture en production (VPS)

Nginx (conteneur front) :

Sert /artifacts/* directement (cache long, immutable).

Reverse-proxy le reste vers l’application Node.


Application Node (conteneur web) :

Sert l’UI et l’API (/api/search, /api/exercise/:uuid).

Lit exercises.sqlite en read-only.


Stockage sur VPS :

/srv/app/data/exercises.sqlite
/srv/app/static/artifacts/**

Montés en read-only dans le conteneur Node.


---

3. Déploiement

VPS : docker compose pull && docker compose up -d pour mise à jour de l’image.

Artefacts et DB uploadés séparément via rsync.

Rollback instantané : relancer un tag d’image précédent.



---

4. Recherche

Texte intégral : SQLite FTS5.

Optionnel : recherche vectorielle (embedding LLM) → index pré-calculé dans exercises.sqlite.



---

✅ Avantages

Zéro compilation lourde en prod (TeX, TikZ).

Déploiement atomique et reproductible.

Temps de réponse rapide (statique + SQLite local).

Rollback instantané en cas de problème.



---

📦 Choix techniques

Framework : SvelteKit + @sveltejs/adapter-node.

CSS : Tailwind.

DB : SQLite (FTS5 + éventuellement index vectoriel).

Gestionnaire de paquets : pnpm (via Corepack).

Conteneurisation : Docker multi-stage build.

Reverse proxy : Nginx.

Hébergement : VPS OVH.



---

📂 Organisation du dépôt

content/                    # Sources LaTeX et JSON
scripts/                    # Conversion & indexation
data/                       # SQLite généré (non versionné)
static/artifacts/           # SVG + HTML générés
src/
  lib/                      # UI, utils, accès DB
  routes/                   # Pages + API
  app.css                   # Tailwind entry
docker/
  nginx.conf
  docker-compose.yml
Dockerfile


---

🔒 Sécurité & performance

Artefacts et DB montés en read-only.

Cache long pour assets immuables.

Headers de sécurité via Nginx.

Variables d’environnement privées injectées au runtime.

Aucun accès écriture sur VPS pour le code en prod.



---

Veux-tu que je te fasse maintenant la version étendue de ce README avec tous les détails techniques (Dockerfile multi-stage, docker-compose, nginx.conf minimal) pour que ce soit directement exécutable ?
Ce serait la suite logique après cette intention.

