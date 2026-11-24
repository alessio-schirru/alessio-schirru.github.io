/* =========================================================
   ciel.js : dessine le fond (ciel de nuit + gros nuage blanc)
   Si ce fichier est retiré, le site marche toujours avec un fond noir.
   ========================================================= */

(function () {
  var canvas = document.getElementById("ciel");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  // Si l'utilisateur a demandé moins d'animations, on dessine une seule image fixe
  var sansAnimation = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Petit générateur aléatoire "à graine" : le nuage a la même forme à chaque visite
  var graine = 97;
  function hasard() {
    graine = (graine * 16807) % 2147483647;
    return graine / 2147483647;
  }
  // Valeur entre -1 et 1, plus souvent proche de 0 (pour regrouper le nuage au centre)
  function hasardCentre() {
    return (hasard() + hasard() + hasard() - 1.5) / 1.5;
  }

  // ---- Le nuage : 70 "bouffées" rondes et floues regroupées ----
  var bouffees = [];
  for (var i = 0; i < 70; i++) {
    var dx = hasardCentre() * 0.26;
    var dy = hasardCentre() * 0.1 - Math.abs(dx) * 0.15;
    bouffees.push({
      x: 0.6 + dx,                                   // position (0 à 1)
      y: 0.3 + dy,
      rayon: 0.05 + hasard() * 0.11 * (1 - Math.abs(dx) * 1.6),
      opacite: 0.18 + hasard() * 0.22,
      phase: hasard() * 6.28,                        // décalage de l'ondulation
      vitesse: 0.3 + hasard() * 0.7
    });
  }

  // ---- Les étoiles ----
  var etoiles = [];
  for (var j = 0; j < 160; j++) {
    etoiles.push({
      x: hasard(),
      y: hasard(),
      taille: hasard() < 0.9 ? 0.6 + hasard() * 0.8 : 1.6 + hasard(),
      phase: hasard() * 6.28
    });
  }

  // Le nuage est dessiné en petit puis agrandi : ça le rend naturellement flou
  var petit = document.createElement("canvas");
  var petitCtx = petit.getContext("2d");
  var largeur, hauteur, ratio;

  function redimensionner() {
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    largeur = canvas.width = window.innerWidth * ratio;
    hauteur = canvas.height = window.innerHeight * ratio;
    petit.width = Math.max(1, Math.floor(largeur / 4));
    petit.height = Math.max(1, Math.floor(hauteur / 4));
  }

  function dessinerNuage(temps, decalageY) {
    var w = petit.width, h = petit.height;
    var echelle = Math.max(w, h * 1.4);
    petitCtx.clearRect(0, 0, w, h);
    petitCtx.globalCompositeOperation = "source-over";

    bouffees.forEach(function (b) {
      // chaque bouffée ondule doucement, et tout le nuage dérive vers la droite
      var x = b.x + Math.sin(temps * 0.04 * b.vitesse + b.phase) * 0.012 + temps * 0.0016;
      x = ((x + 0.2) % 1.4) - 0.2;
      var y = b.y + Math.cos(temps * 0.05 * b.vitesse + b.phase) * 0.008 - decalageY;
      var r = b.rayon * (1 + 0.06 * Math.sin(temps * 0.09 * b.vitesse + b.phase)) * echelle;

      var degrade = petitCtx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r);
      degrade.addColorStop(0, "rgba(255,255,255," + b.opacite + ")");
      degrade.addColorStop(0.55, "rgba(240,242,248," + b.opacite * 0.45 + ")");
      degrade.addColorStop(1, "rgba(255,255,255,0)");
      petitCtx.fillStyle = degrade;
      petitCtx.beginPath();
      petitCtx.arc(x * w, y * h, r, 0, Math.PI * 2);
      petitCtx.fill();
    });

    // ombre sous le nuage pour lui donner du volume
    petitCtx.globalCompositeOperation = "source-atop";
    var ombre = petitCtx.createLinearGradient(0, h * (0.15 - decalageY), 0, h * (0.65 - decalageY));
    ombre.addColorStop(0, "rgba(0,0,0,0)");
    ombre.addColorStop(1, "rgba(10,12,20,0.6)");
    petitCtx.fillStyle = ombre;
    petitCtx.fillRect(0, 0, w, h);
  }

  function dessiner(temps) {
    // quand on descend dans la page, le nuage remonte un peu (effet de profondeur)
    var defilement = Math.min(window.scrollY / window.innerHeight, 3);
    var decalageY = defilement * 0.08;

    // fond : noir avec une légère lueur derrière le nuage
    ctx.globalCompositeOperation = "source-over";
    var fond = ctx.createRadialGradient(largeur * 0.6, hauteur * 0.3, 0, largeur * 0.6, hauteur * 0.3, Math.max(largeur, hauteur) * 0.9);
    fond.addColorStop(0, "#16171c");
    fond.addColorStop(0.5, "#060608");
    fond.addColorStop(1, "#000000");
    ctx.fillStyle = fond;
    ctx.fillRect(0, 0, largeur, hauteur);

    // étoiles qui scintillent
    etoiles.forEach(function (e) {
      var scintille = sansAnimation ? 0.7 : 0.55 + 0.45 * Math.sin(temps * 0.8 + e.phase);
      ctx.fillStyle = "rgba(255,255,255," + scintille * (e.taille > 1 ? 0.9 : 0.5) + ")";
      ctx.beginPath();
      ctx.arc(e.x * largeur, e.y * hauteur, e.taille * ratio * 0.7, 0, Math.PI * 2);
      ctx.fill();
    });

    dessinerNuage(temps, decalageY);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(petit, 0, 0, largeur, hauteur);
  }

  redimensionner();
  window.addEventListener("resize", function () {
    redimensionner();
    dessiner(tempsTotal);
  });

  var tempsTotal = 0;
  dessiner(0);

  if (sansAnimation) {
    window.addEventListener("scroll", function () { dessiner(0); });
    return;
  }

  // Boucle d'animation : environ 60 images par seconde
  var dernier = performance.now();
  function boucle(maintenant) {
    tempsTotal += Math.min(50, maintenant - dernier) / 1000;
    dernier = maintenant;
    if (!document.hidden) dessiner(tempsTotal);
    requestAnimationFrame(boucle);
  }
  requestAnimationFrame(boucle);
})();
