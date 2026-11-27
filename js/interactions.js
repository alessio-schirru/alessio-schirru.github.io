/* =========================================================
   interactions.js
   1. Apparition des blocs au défilement
   2. Menu : souligne la section où l'on se trouve
   3. Carte en vedette : fait défiler les 3 projets
   4. Animation des réalisations (détails, un seul ouvert à la fois)
   5. Filtres des réalisations
   6. Formulaire de contact
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
var menuSection = document.getElementById("menu-section"); // libellé du bouton mobile

var observateurSections = new IntersectionObserver(function (entrees) {
  entrees.forEach(function (entree) {
    if (entree.isIntersecting) {
      liensMenu.forEach(function (lien) {
        var actif = lien.getAttribute("href") === "#" + entree.target.id;
        lien.classList.toggle("actif", actif);
        if (actif && menuSection) menuSection.textContent = lien.textContent;
      });
    }
  });
}, { rootMargin: "-45% 0px -50% 0px" }); // une section est "active" quand elle passe au milieu de l'écran

document.querySelectorAll("main section[id]").forEach(function (section) {
  observateurSections.observe(section);
});

// Menu mobile : le bouton affiche la section en cours et ouvre la liste des liens
var menu = document.getElementById("menu");
var menuBouton = document.getElementById("menu-bouton");

function ouvrirMenu(ouvrir) {
  menu.classList.toggle("ouvert", ouvrir);
  menuBouton.setAttribute("aria-expanded", ouvrir ? "true" : "false");
}

if (menuBouton) {
  menuBouton.addEventListener("click", function () {
    ouvrirMenu(!menu.classList.contains("ouvert"));
  });
  // un lien choisi, un clic ailleurs ou la touche Échap referment le menu
  liensMenu.forEach(function (lien) {
    lien.addEventListener("click", function () { ouvrirMenu(false); });
  });
  document.addEventListener("click", function (evenement) {
    if (!menu.contains(evenement.target)) ouvrirMenu(false);
  });
  document.addEventListener("keydown", function (evenement) {
    if (evenement.key === "Escape") ouvrirMenu(false);
  });
}


/* ---------- 3. Carte en vedette (page d'accueil seulement) ---------- */
var carteVedette = document.querySelector(".vedette");

if (carteVedette) {
  var diapos = document.querySelectorAll(".vedette-diapo");
  var points = document.querySelectorAll(".vedette-points .point");
  var progression = document.getElementById("vedette-progression");
  var dossier = document.getElementById("vedette-dossier");
  var numero = document.getElementById("vedette-num");
  var DUREE = 7000; // temps d'affichage d'un projet, en millisecondes
  var actuelle = 0;
  var debut = performance.now();
  var enPause = false;
  var pourcent = 0;

  var afficherDiapo = function (index) {
    actuelle = index;
    diapos.forEach(function (d, i) { d.classList.toggle("active", i === index); });
    points.forEach(function (p, i) { p.classList.toggle("actif", i === index); });
    dossier.textContent = diapos[index].dataset.dossier;
    numero.textContent = index + 1;
    debut = performance.now();
  };

  points.forEach(function (point, i) {
    point.addEventListener("click", function () { afficherDiapo(i); });
  });

  // Pause quand la souris est sur la carte
  carteVedette.addEventListener("mouseenter", function () { enPause = true; });
  carteVedette.addEventListener("mouseleave", function () { enPause = false; debut = performance.now() - pourcent * DUREE; });

  var avancer = function (maintenant) {
    if (!enPause) {
      pourcent = (maintenant - debut) / DUREE;
      if (pourcent >= 1) {
        afficherDiapo((actuelle + 1) % diapos.length);
        pourcent = 0;
      }
      progression.style.width = (pourcent * 100) + "%";
    }
    requestAnimationFrame(avancer);
  };

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    requestAnimationFrame(avancer);
  }
}


/* ---------- 4. Animation des réalisations façon Liquid Glass ---------- */
// Une seule fonction gère toutes les animations des cartes de projets :
// ouvrir un détail, en fermer un, ou changer de filtre.
// Principe (technique "FLIP") : on mesure les cartes AVANT le changement,
// on fait le changement, on mesure APRÈS, puis on anime visuellement l'écart.
// Sans ce code, tout fonctionne quand même, juste sans animation.

// Courbe "ressort" : dépasse très légèrement la cible puis se stabilise
var ressort = "linear(0, 0.25 8%, 0.7 20%, 0.95 32%, 1.015 42%, 1.01 52%, 1)";
if (!CSS.supports("animation-timing-function", ressort)) {
  ressort = "cubic-bezier(0.25, 1.1, 0.5, 1)"; // navigateur plus ancien
}
var DUREE_CARTE = 850;   // durée de la déformation (ms)
var DUREE_FLOU = 1100;   // durée du flou du texte (ms), un peu plus longue
var sansAnimation = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var toutesLesCartes = Array.from(document.querySelectorAll(".projet"));

// Le texte d'une carte passe par un flou fondu, pour cacher sa réorganisation
function flouter(carte) {
  Array.from(carte.children).forEach(function (enfant) {
    enfant.animate([
      { filter: "blur(14px)", opacity: 0.15 },
      { filter: "blur(9px)", opacity: 0.35, offset: 0.45 },
      { filter: "blur(3px)", opacity: 0.75, offset: 0.75 },
      { filter: "blur(0)", opacity: 1 }
    ], { duration: DUREE_FLOU, easing: "ease-out" });
  });
}

// changement : la fonction qui modifie la page (ouvrir, fermer, filtrer)
// carteSuivie : la carte qu'on garde à la même place à l'écran (celle qu'on a cliquée)
function animerCartes(changement, carteSuivie) {
  if (sansAnimation) { changement(); return; }

  // 0. Si une animation tourne encore (clics rapides), on l'arrête
  toutesLesCartes.forEach(function (c) {
    c.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); });
  });

  // 1. AVANT : position, taille, et état de chaque carte
  var avant = new Map();
  toutesLesCartes.forEach(function (c) {
    avant.set(c, {
      rect: c.getBoundingClientRect(),
      visible: !c.hidden,
      ouvert: !!c.querySelector(".detail[open]")
    });
  });

  // 2. Le changement
  changement();

  // 2 bis. Si on ferme une carte au-dessus, la page remonte :
  // on compense le défilement pour que la carte cliquée ne saute pas
  if (carteSuivie) {
    var ecart = carteSuivie.getBoundingClientRect().top - avant.get(carteSuivie).rect.top;
    if (ecart) window.scrollBy({ top: ecart, behavior: "instant" });
  }

  // 3. APRÈS : on compare et on anime chaque carte
  toutesLesCartes.forEach(function (c) {
    if (c.hidden) return; // carte masquée par le filtre : rien à animer
    var a = avant.get(c);
    var b = c.getBoundingClientRect();
    var ouvert = !!c.querySelector(".detail[open]");

    // Carte qui apparaît (filtre) : elle sort du flou en grandissant légèrement
    if (!a.visible) {
      c.animate([
        { opacity: 0, filter: "blur(12px)", transform: "scale(0.94)" },
        { opacity: 1, filter: "blur(0)", transform: "none" }
      ], { duration: DUREE_CARTE, easing: ressort });
      return;
    }

    var dx = a.rect.left - b.left;
    var dy = a.rect.top - b.top;

    if (ouvert && !a.ouvert) {
      // La vitre s'agrandit : découpée à son ancienne taille, puis libérée
      var droite = Math.max(0, b.width - a.rect.width);
      var bas = Math.max(0, b.height - a.rect.height);
      c.animate([
        { transform: "translate(" + dx + "px, " + dy + "px)", clipPath: "inset(0 " + droite + "px " + bas + "px 0 round 26px)" },
        { transform: "none", clipPath: "inset(0 0 0 0 round 26px)" }
      ], { duration: DUREE_CARTE, easing: ressort });
      flouter(c);
      c.classList.add("verre-actif");
    } else if (!ouvert && a.ouvert) {
      // La vitre se rétracte : on part de l'ancienne taille, réduite par l'échelle
      c.animate([
        { transformOrigin: "top left", transform: "translate(" + dx + "px, " + dy + "px) scale(" + (a.rect.width / b.width) + ", " + (a.rect.height / b.height) + ")" },
        { transformOrigin: "top left", transform: "none" }
      ], { duration: DUREE_CARTE, easing: ressort });
      flouter(c);
      c.classList.add("verre-actif");
    } else if (dx || dy) {
      // Les autres cartes glissent vers leur nouvelle place
      c.animate([
        { transform: "translate(" + dx + "px, " + dy + "px)" },
        { transform: "none" }
      ], { duration: DUREE_CARTE, easing: ressort });
    }
  });

  setTimeout(function () {
    toutesLesCartes.forEach(function (c) { c.classList.remove("verre-actif"); });
    // si la carte ouverte dépasse de l'écran, on la ramène doucement
    if (carteSuivie && carteSuivie.querySelector(".detail[open]")) {
      carteSuivie.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, DUREE_CARTE);
}

// Ferme tous les détails ouverts, sauf celui qu'on garde
function fermerDetails(sauf) {
  document.querySelectorAll(".detail[open]").forEach(function (d) {
    if (d !== sauf) d.open = false;
  });
}

// Clic sur "voir le détail" : un seul détail ouvert à la fois
document.querySelectorAll(".detail summary").forEach(function (titre) {
  titre.addEventListener("click", function (evenement) {
    evenement.preventDefault();
    var details = titre.parentElement;
    animerCartes(function () {
      var ouvrir = !details.open;
      fermerDetails(details);     // ferme celui d'avant
      details.open = ouvrir;
    }, details.closest(".projet"));
  });
});


/* ---------- 5. Filtres des réalisations ---------- */
// Changer de catégorie ferme les détails ouverts, avec la même animation
var filtres = document.querySelectorAll(".filtre");
var pastille = document.querySelector(".filtre-pastille");

// Place la pastille blanche exactement sous le bouton choisi
function placerPastille(bouton) {
  if (!pastille) return;
  pastille.style.width = bouton.offsetWidth + "px";
  pastille.style.transform = "translateX(" + bouton.offsetLeft + "px)";
}

if (pastille) {
  var filtreActif = document.querySelector(".filtre.actif");
  // première position sans animation
  pastille.style.transition = "none";
  placerPastille(filtreActif);
  pastille.offsetWidth; // force le navigateur à appliquer la position avant de réactiver l'animation
  pastille.style.transition = "";
  // si la largeur change (rotation du téléphone, polices chargées), on recale
  window.addEventListener("resize", function () { placerPastille(document.querySelector(".filtre.actif")); });
  document.fonts && document.fonts.ready.then(function () { placerPastille(document.querySelector(".filtre.actif")); });
}

filtres.forEach(function (bouton) {
  bouton.addEventListener("click", function () {
    var choix = bouton.dataset.filtre;
    filtres.forEach(function (b) { b.classList.toggle("actif", b === bouton); });
    placerPastille(bouton);

    animerCartes(function () {
      fermerDetails(null);
      toutesLesCartes.forEach(function (projet) {
        var categories = projet.dataset.categorie.split(" ");
        projet.hidden = !(choix === "tout" || categories.indexOf(choix) !== -1);
      });
    }, null);
  });
});


/* ---------- 6. Formulaire de contact ---------- */
// Envoie le message à Web3Forms sans quitter la page, puis affiche le résultat.
// Sans ce code, le formulaire marche quand même (redirection vers Web3Forms).
var formulaire = document.getElementById("formulaire");

if (formulaire) {
  var etat = document.getElementById("formulaire-etat");
  var boutonEnvoyer = document.getElementById("envoyer");

  formulaire.addEventListener("submit", function (evenement) {
    evenement.preventDefault();

    // Clé pas encore renseignée : on prévient au lieu d'envoyer dans le vide
    if (formulaire.access_key.value === "A-COMPLETER") {
      etat.textContent = "Le formulaire n'est pas encore activé. Passe par GitHub en attendant.";
      return;
    }

    var donnees = new FormData(formulaire);
    donnees.set("subject", "Portfolio : " + formulaire.objet.value);
    donnees.set("name", formulaire.prenom.value + " " + formulaire.nom.value);

    boutonEnvoyer.disabled = true;
    etat.textContent = "Envoi en cours…";

    fetch(formulaire.action, { method: "POST", body: donnees, headers: { Accept: "application/json" } })
      .then(function (reponse) { return reponse.json(); })
      .then(function (resultat) {
        if (resultat.success) {
          etat.textContent = "Message envoyé. Je te réponds dès que possible.";
          formulaire.reset();
        } else {
          etat.textContent = "L'envoi a échoué : " + resultat.message + ". Réessaie dans quelques minutes.";
        }
      })
      .catch(function () {
        etat.textContent = "Pas de connexion au service d'envoi. Vérifie ta connexion et réessaie.";
      })
      .finally(function () { boutonEnvoyer.disabled = false; });
  });
}
