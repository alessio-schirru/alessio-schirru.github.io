/* =========================================================
   interactions.js
   1. Apparition des blocs au défilement
   2. Menu : souligne la section où l'on se trouve
   3. Carte en vedette : fait défiler les 3 projets
   4. Filtres des réalisations
   Si ce fichier est retiré, tout le contenu reste visible.
   ========================================================= */

// Signale au CSS que le JS fonctionne (voir ".js .apparition" dans style.css)
document.documentElement.classList.add("js");


/* ---------- 1. Apparition au défilement ---------- */
var observateur = new IntersectionObserver(function (entrees) {
  entrees.forEach(function (entree) {
    if (entree.isIntersecting) {
      entree.target.classList.add("visible");
      observateur.unobserve(entree.target); // une seule fois
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".apparition").forEach(function (el) {
  observateur.observe(el);
});


/* ---------- 2. Menu actif ---------- */
var liensMenu = document.querySelectorAll(".menu-pilule a");

var observateurSections = new IntersectionObserver(function (entrees) {
  entrees.forEach(function (entree) {
    if (entree.isIntersecting) {
      liensMenu.forEach(function (lien) {
        lien.classList.toggle("actif", lien.getAttribute("href") === "#" + entree.target.id);
      });
    }
  });
}, { rootMargin: "-45% 0px -50% 0px" }); // une section est "active" quand elle passe au milieu de l'écran

document.querySelectorAll("main section[id]").forEach(function (section) {
  observateurSections.observe(section);
});


/* ---------- 3. Carte en vedette ---------- */
var diapos = document.querySelectorAll(".vedette-diapo");
var points = document.querySelectorAll(".vedette-points .point");
var progression = document.getElementById("vedette-progression");
var dossier = document.getElementById("vedette-dossier");
var numero = document.getElementById("vedette-num");
var DUREE = 7000; // temps d'affichage d'un projet, en millisecondes
var actuelle = 0;
var debut = performance.now();
var enPause = false;

function afficherDiapo(index) {
  actuelle = index;
  diapos.forEach(function (d, i) { d.classList.toggle("active", i === index); });
  points.forEach(function (p, i) { p.classList.toggle("actif", i === index); });
  dossier.textContent = diapos[index].dataset.dossier;
  numero.textContent = index + 1;
  debut = performance.now();
}

points.forEach(function (point, i) {
  point.addEventListener("click", function () { afficherDiapo(i); });
});

// Pause quand la souris est sur la carte
var carte = document.querySelector(".vedette");
carte.addEventListener("mouseenter", function () { enPause = true; });
carte.addEventListener("mouseleave", function () { enPause = false; debut = performance.now() - pourcent * DUREE; });

var pourcent = 0;
function avancer(maintenant) {
  if (!enPause) {
    pourcent = (maintenant - debut) / DUREE;
    if (pourcent >= 1) {
      afficherDiapo((actuelle + 1) % diapos.length);
      pourcent = 0;
    }
    progression.style.width = (pourcent * 100) + "%";
  }
  requestAnimationFrame(avancer);
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  requestAnimationFrame(avancer);
}


/* ---------- 4. Filtres des réalisations ---------- */
var filtres = document.querySelectorAll(".filtre");
var projets = document.querySelectorAll(".projet");

filtres.forEach(function (bouton) {
  bouton.addEventListener("click", function () {
    var choix = bouton.dataset.filtre;

    filtres.forEach(function (b) { b.classList.toggle("actif", b === bouton); });

    projets.forEach(function (projet) {
      var categories = projet.dataset.categorie.split(" ");
      projet.hidden = !(choix === "tout" || categories.indexOf(choix) !== -1);
    });
  });
});


/* ---------- 5. Ouverture des détails façon Liquid Glass ---------- */
// Au clic sur "voir le détail", la carte se déforme comme une bulle de verre.
// Principe (technique "FLIP") : on mesure les cartes avant, on ouvre, on mesure
// après, puis on anime visuellement de l'ancienne position vers la nouvelle.
// Sans ce code, les détails s'ouvrent quand même, juste sans animation.

// Courbe "ressort" : dépasse très légèrement la cible puis se stabilise
var ressort = "linear(0, 0.25 8%, 0.7 20%, 0.95 32%, 1.015 42%, 1.01 52%, 1)";
if (!CSS.supports("animation-timing-function", ressort)) {
  ressort = "cubic-bezier(0.25, 1.1, 0.5, 1)"; // navigateur plus ancien
}
var DUREE_CARTE = 850;   // durée de la déformation (ms)
var DUREE_FLOU = 1100;   // durée du flou du texte (ms), un peu plus longue
var sansAnimation = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll(".detail summary").forEach(function (titre) {
  titre.addEventListener("click", function (evenement) {
    if (sansAnimation) return; // ouverture normale

    evenement.preventDefault();
    var details = titre.parentElement;
    var carte = details.closest(".projet");
    var cartes = Array.from(document.querySelectorAll(".projet:not([hidden])"));

    // 0. Si une animation tourne encore (double clic), on l'arrête
    cartes.forEach(function (c) {
      c.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); });
    });

    // 1. Position et taille de chaque carte AVANT
    var avant = new Map();
    cartes.forEach(function (c) { avant.set(c, c.getBoundingClientRect()); });

    // 2. On ouvre ou on ferme
    var ouverture = !details.open;
    details.open = ouverture;

    // 3. On compare avec APRÈS et on anime l'écart
    cartes.forEach(function (c) {
      var a = avant.get(c);
      var b = c.getBoundingClientRect();
      var dx = a.left - b.left;
      var dy = a.top - b.top;

      if (c !== carte) {
        // les autres cartes glissent vers leur nouvelle place
        if (dx || dy) {
          c.animate([
            { transform: "translate(" + dx + "px, " + dy + "px)" },
            { transform: "none" }
          ], { duration: DUREE_CARTE, easing: ressort });
        }
        return;
      }

      if (ouverture) {
        // la vitre s'agrandit : on la "découpe" à son ancienne taille puis on libère
        var droite = Math.max(0, b.width - a.width);
        var bas = Math.max(0, b.height - a.height);
        c.animate([
          { transform: "translate(" + dx + "px, " + dy + "px)", clipPath: "inset(0 " + droite + "px " + bas + "px 0 round 26px)" },
          { transform: "none", clipPath: "inset(0 0 0 0 round 26px)" }
        ], { duration: DUREE_CARTE, easing: ressort });
      } else {
        // la vitre se rétracte : on part de l'ancienne taille, réduite par l'échelle
        c.animate([
          { transformOrigin: "top left", transform: "translate(" + dx + "px, " + dy + "px) scale(" + (a.width / b.width) + ", " + (a.height / b.height) + ")" },
          { transformOrigin: "top left", transform: "none" }
        ], { duration: DUREE_CARTE, easing: ressort });
      }
    });

    // 4. Le texte de la carte passe par un flou fondu pour cacher sa réorganisation
    Array.from(carte.children).forEach(function (enfant) {
      enfant.animate([
        { filter: "blur(14px)", opacity: 0.15 },
        { filter: "blur(9px)", opacity: 0.35, offset: 0.45 },
        { filter: "blur(3px)", opacity: 0.75, offset: 0.75 },
        { filter: "blur(0)", opacity: 1 }
      ], { duration: DUREE_FLOU, easing: "ease-out" });
    });

    // 5. Reflet du verre qui s'illumine pendant la déformation
    carte.classList.add("verre-actif");
    setTimeout(function () {
      carte.classList.remove("verre-actif");
      if (ouverture) carte.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, DUREE_CARTE);
  });
});


/* ---------- 6. Mail caché aux robots ---------- */
// L'adresse n'est jamais écrite en entier dans le HTML : les robots qui
// lisent le code de la page ne la trouvent pas. Le script la reconstitue
// pour les vrais visiteurs.
var lienMail = document.getElementById("lien-mail");
if (lienMail) {
  var adresse = lienMail.dataset.nom + "@" + lienMail.dataset.domaine;
  lienMail.textContent = adresse;
  lienMail.href = "mailto:" + adresse;
}
