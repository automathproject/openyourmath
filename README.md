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
- [ ] Affiner les possibilités d'affichage de question et réponses
