// src/embed-i18n.js
// Traduit en anglais, sur les pages EN uniquement, les textes que Webflow
// Localization ne peut pas traduire :
// - le contenu des blocs de code intégré (HTML Embed) : tableau de la politique
//   de confidentialité, carte des bureaux, maquette de l'app sur « Devenir partner » ;
// - les textes alternatifs des images issues de la bibliothèque d'assets.
//
// Remplacement par correspondance exacte (texte complet d'un nœud ou d'un attribut) :
// rien d'autre n'est modifié. Pour ajouter une traduction : une ligne dans DICT.
import { getLang } from "./utils/i18n.js";

const DICT = {
  // Politique de confidentialité, annexe 1
  "Tableau des traitements de données personnelles": "Table of personal data processing",
  "Finalité du traitement": "Purpose of processing",
  "Catégories de Données à Caractère Personnel": "Categories of Personal Data",
  "Qualité de RockFi": "RockFi's role",
  "Base légale": "Legal basis",
  "Durée de conservation": "Retention period",
  "Gestion du site internet": "Website management",
  "Données d'identification et de contact (nom, prénom, adresse e-mail, téléphone), contenu de votre demande": "Identification and contact data (last name, first name, email address, phone), content of your request",
  "Responsable de traitement": "Data controller",
  "Responsable de traitement*": "Data controller*",
  "Intérêt légitime": "Legitimate interest",
  "3 ans à compter du dernier contact.": "3 years from the last contact.",
  "Gestion de la relation avec les prospects (réponse aux demandes d'information, prise de rendez-vous, newsletters, invitations à des événements et communications commerciales etc)": "Prospect relationship management (responding to information requests, booking appointments, newsletters, event invitations, marketing communications, etc.)",
  "Données d'identification et de contact, préférences de communication, inscriptions à des événements, formulaires complétés": "Identification and contact data, communication preferences, event registrations, completed forms",
  "Intérêt légitime/Consentement (lorsque requis)": "Legitimate interest/Consent (where required)",
  "3 ans à compter du dernier contact ou jusqu'au retrait du consentement.": "3 years from the last contact or until consent is withdrawn.",
  "Gestion de la relation avec les clients (entrée en relation, contractualisation, mise à jour des conditions générales, newsletters, etc.)": "Client relationship management (onboarding, contracting, updates to the terms and conditions, newsletters, etc.)",
  "Données d'identification et de contact, données relatives à la situation personnelle, familiale, patrimoniale, financière et fiscale, documents justificatifs.": "Identification and contact data, data on personal, family, wealth, financial and tax situation, supporting documents.",
  "Exécution du contrat, mesures précontractuelles et obligations légales": "Performance of the contract, pre-contractual measures and legal obligations",
  "Pendant la durée du contrat ou de la relation d'affaires, puis archivage pendant 5 ans à compter de sa cessation.": "For the duration of the contract or business relationship, then archived for 5 years from its termination.",
  "Gestion des recrutements": "Recruitment management",
  "Données d'identification, coordonnées, CV, lettre de motivation, diplômes, expériences professionnelles": "Identification data, contact details, CV, cover letter, qualifications, professional experience",
  "Mesures précontractuelles et intérêt légitime": "Pre-contractual measures and legitimate interest",
  "2 ans après le dernier contact avec le candidat, sauf opposition ou accord pour une durée différente.": "2 years after the last contact with the candidate, unless the candidate objects or agrees to a different period.",
  "Gestion des demandes d'exercice des droits RGPD": "Handling of GDPR rights requests",
  "Données d'identification, coordonnées, justificatif d'identité (le cas échéant), contenu de la demande": "Identification data, contact details, proof of identity (where applicable), content of the request",
  "Obligation légale": "Legal obligation",
  "5 ans à compter du traitement de la demande.": "5 years from the handling of the request.",
  "Gestion des contentieux, précontentieux et demandes des autorités compétentes": "Management of disputes, pre-litigation and requests from competent authorities",
  "Données d'identification, données contractuelles, correspondances, documents utiles au traitement du dossier": "Identification data, contractual data, correspondence, documents relevant to the case",
  "Obligation légale et intérêt légitime": "Legal obligation and legitimate interest",
  "Pendant la durée du contentieux puis conformément aux délais de prescription applicables.": "For the duration of the dispute, then in accordance with the applicable limitation periods.",
  "Gestion de la relation avec les fournisseurs": "Supplier relationship management",
  "Données d'identification et de contact (nom, prénom, adresse e-mail, numéro de téléphone), coordonnées professionnelles.": "Identification and contact data (last name, first name, email address, phone number), professional contact details.",
  "Exécution du contrat ou mesures précontractuelles": "Performance of the contract or pre-contractual measures",
  "Pendant la durée de la relation contractuelle.": "For the duration of the contractual relationship.",
  "Respect des obligations de lutte contre le blanchiment de capitaux et le financement du terrorisme (LCB-FT)": "Compliance with anti-money laundering and counter-terrorist financing obligations (AML/CFT)",
  "Données d'identification, justificatifs d'identité et de domicile, informations relatives à l'origine des fonds, situation patrimoniale.": "Identification data, proof of identity and address, information on the source of funds, wealth situation.",
  "5 ans à compter de la cessation de la relation d'affaires, conformément au Code monétaire et financier.": "5 years from the end of the business relationship, in accordance with the French Monetary and Financial Code.",
  "Transmission des informations nécessaires aux établissements financiers (dépositaires, sociétés de gestion, assureurs, etc.)": "Transmission of the necessary information to financial institutions (custodians, asset managers, insurers, etc.)",
  "Données d'identification, informations patrimoniales, financières et fiscales, documents nécessaires à l'ouverture ou à la gestion des produits souscrits": "Identification data, wealth, financial and tax information, documents required to open or manage the products subscribed",
  "Exécution du contrat": "Performance of the contract",
  "Pendant la durée nécessaire à l'exécution de l'opération.": "For the time needed to carry out the transaction.",
  "Gestion de notre application et de la sécurité des systèmes d'information": "Management of our app and information system security",
  "Données d'identification, identifiants de connexion, journaux de connexion, données techniques et de navigation": "Identification data, login credentials, connection logs, technical and browsing data",
  "Pendant la durée de la relation puis archivage lorsque nécessaire à des fins de sécurité.": "For the duration of the relationship, then archived where necessary for security purposes.",
  "Mesure d'audience, amélioration des services, statistiques et analyses d'utilisation": "Audience measurement, service improvement, usage statistics and analysis",
  "Données de navigation, cookies, adresse IP, données d'utilisation des services, enquêtes de satisfaction, statistiques agrégées": "Browsing data, cookies, IP address, service usage data, satisfaction surveys, aggregated statistics",
  "Intérêt légitime ou consentement lorsque requis (cookies)": "Legitimate interest or consent where required (cookies)",
  "Voir la Politique relative aux cookies.": "See the Cookie Policy.",

  // Carte des bureaux
  "Voir tous les bureaux": "View all offices",
  "Afficher tous les bureaux RockFi": "Show all RockFi offices",

  // Maquette de l'application (page « Devenir partner »)
  "L'application Desk": "The Desk app",
  "à votre service.": "at your service.",
  "L’Advisor App vous accompagne dans la gestion de votre portefeuille client, vous permet d’anticiper vos rendez-vous et de vous concentrez sur votre métier : le conseil.": "The Advisor App supports you in managing your client portfolio, helps you prepare your meetings and lets you focus on your job: advice.",
  "Collecte": "Inflows",
  "Revenus": "Revenue",
  "Factures": "Invoices",
  "Produits structurés": "Structured products",
  "Autres": "Other",
  "Outils": "Tools",
  "Voir les documents": "View documents",
  "Brochure commerciale": "Sales brochure",
  "Reporting trimestriel": "Quarterly report",
  "Valorisation actuelle": "Current valuation",
  "Valeur liquidative": "Net asset value",
  "Estim. coupons versés": "Est. coupons paid",
  "Estim. coupons mémorisés": "Est. memorised coupons",
  "Cours du sous-jacent(s)": "Underlying price(s)",
  "Et barrières du produit": "And product barriers",
  "Nom du produit": "Product name",
  "Cours de ref.": "Ref. price",
  "Prix courant": "Current price",
  "Évolution": "Change",
  "Prochains évènements prévus": "Upcoming scheduled events",
  "Prévu": "Scheduled",
  "Voir tous les évènements": "View all events",
  "Caractéristiques": "Features",
  "Maturité": "Maturity",
  "Emetteur": "Issuer",
  "Remboursement anticipé": "Early redemption",
  "Montant": "Amount",
  "Niveau de barrière": "Barrier level",
  "Trimestrielle": "Quarterly",
  "Autocall barrière dégressive": "Autocall with step-down barrier",
  "Coupons non versés, conservés en mémoire": "Unpaid coupons, kept in memory",
  "Détail des coupons mémorisés": "Memorised coupons breakdown",
  "Détail du calcul de la valorisation": "Valuation calculation breakdown",
  "Période affichée": "Period shown",
  "Revenir à la liste des produits": "Back to the product list",
  "Précédent": "Previous",

  // Textes alternatifs (images de la bibliothèque d'assets)
  "Conférence RockFi": "RockFi conference",
  "Conseillère RockFi au téléphone": "RockFi advisor on the phone",
  "Vue du patrimoine dans l'application RockFi": "Wealth overview in the RockFi app",
  "Logo de BlackRock": "BlackRock logo",
  "Logo de Neuflize OBC": "Neuflize OBC logo",
  "Logo de Nortia": "Nortia logo",
  "Logo de Wealins": "Wealins logo",
  "Logo Snowflake avec un symbole géométrique en forme de flocon de neige à gauche et le mot « snowflake » en lettres minuscules à droite.": "Snowflake logo with a geometric snowflake symbol on the left and the word “snowflake” in lowercase on the right.",
  "Texte 'RockFi' en gris clair sur un fond gris uni, suggérant un logo ou un élément de marque minimaliste.": "The word 'RockFi' in light grey on a plain grey background, a minimalist logo.",
  "Deux hommes en costume sombre posant dehors devant des plantes vertes, l'un plus âgé avec les cheveux blancs, l'autre plus jeune avec une cravate bleue, souriant et debout à côté d'une chaise en bois claire.": "Two men in dark suits posing outdoors in front of green plants, one older with white hair, the other younger with a blue tie, smiling and standing next to a light wooden chair.",
  "Entrée principale d'un bâtiment en pierre beige avec un grand auvent en verre noir au-dessus de la porte, plusieurs fenêtres avec balustrades, et un escalier menant à la porte entrouverte où une personne est visible.": "Main entrance of a beige stone building with a large black glass canopy above the door, several windows with balustrades, and steps leading to a half-open door where a person is visible.",
  "Femme aux cheveux blonds portant une veste bleu marine et une blouse blanche à motifs floraux, regardant légèrement vers la droite avec une expression attentive, dans un environnement où des personnes floues sont en arrière-plan.": "Blonde woman wearing a navy jacket and a white floral blouse, looking slightly to the right with an attentive expression, with blurred people in the background.",
  "Femme aux cheveux blonds portant une veste bleue et une chemise à rayures, parlant au téléphone avec un fond flou de feuillage vert.": "Blonde woman wearing a blue jacket and a striped shirt, talking on the phone against a blurred background of green foliage.",
  "Femme en veste bleu foncé parlant au téléphone avec un fond naturel flou, affichant une carte de profil indiquant Delphine Colin, conseillère en patrimoine RockFi disponible, un rendez-vous suivant fixé au 20 janvier à 18h00, et la performance cumulative de patrimoine à 1 483 269 € avec une augmentation de 62 % soit +568 000 €.": "Woman in a dark blue jacket talking on the phone against a blurred natural background, with a profile card showing Delphine Colin, available RockFi wealth advisor, a next appointment on 20 January at 6pm, and cumulative wealth performance of €1,483,269, up 62% or +€568,000.",
  "Femme portant des lunettes regardant attentivement l'écran d'un ordinateur portable Apple sur une table en bois, avec des plantes en arrière-plan.": "Woman wearing glasses looking closely at an Apple laptop screen on a wooden table, with plants in the background.",
  "Gros plan abstrait de la surface d'un tissu éclairé par une lumière chaude orange et ombres marquées, soulignant la texture douce et les plis.": "Abstract close-up of a fabric surface lit by warm orange light with strong shadows, highlighting its soft texture and folds.",
  "Homme aux cheveux attachés en chignon et barbe, portant une chemise blanche et un blazer sombre, regardant vers la gauche devant un mur en bois.": "Man with his hair in a bun and a beard, wearing a white shirt and a dark blazer, looking to the left in front of a wooden wall.",
  "Homme d'âge moyen avec cheveux gris courts et barbe légère, portant un costume et une chemise blanche, en conversation lors d'un événement intérieur avec d'autres personnes floues en arrière-plan.": "Middle-aged man with short grey hair and a light beard, wearing a suit and a white shirt, in conversation at an indoor event with other blurred people in the background.",
  "Homme portant un micro serre-tête parlant en public, tenant un objet dans ses mains, en tenue noire à manches longues, sur un fond sombre.": "Man wearing a headset microphone speaking in public, holding an object in his hands, dressed in black long sleeves, against a dark background.",
  "Illustration de logos d'entreprises disposés en cercle sur un fond texturé vert et gris, avec un logo central marqué d'un R blanc sur fond vert foncé. Autour, on voit des logos circulaires rouges et blancs, un logo de Generali rouge, un logo avec le texte CNP, un logo composé de formes géométriques, un logo avec un blason à quatre parties, et un cercle noir avec le mot TRAIL blanc.": "Illustration of company logos arranged in a circle on a textured green and grey background, with a central logo showing a white R on a dark green background. Around it are red and white circular logos, a red Generali logo, a logo with the text CNP, a logo made of geometric shapes, a logo with a four-part coat of arms, and a black circle with the word TRAIL in white.",
  "Interface utilisateur d'un tableau de bord d'application affichant un message de bienvenue personnalisé à Christophe avec une barre de recherche pour aider. La section Rendez-vous montre deux réunions programmées pour vendredi 2 octobre : Melchior Liam de 10h00 à 10h45 avec option de préparation, et Catherine Murat de 14h00 à 14h30. Une section actualités marchés présente trois articles avec icônes et titres liés à la géopolitique et l'énergie. Le menu de navigation latéral à gauche liste des sections : Home, AuM (Clients, Liquidity, Structured products), Business (Operations, Meeting notes, Tools), et Conversations (Portfolio analysis, Meeting preparation, See all).": "App dashboard interface showing a personalised welcome message for Christophe with a search bar. The Meetings section shows two meetings scheduled for Friday 2 October: Melchior Liam from 10:00 to 10:45 with a preparation option, and Catherine Murat from 14:00 to 14:30. A market news section shows three articles on geopolitics and energy. The left-hand navigation lists: Home, AuM (Clients, Liquidity, Structured products), Business (Operations, Meeting notes, Tools) and Conversations (Portfolio analysis, Meeting preparation, See all).",
  "La lumière éclaire partiellement les coussins en tissu beige d'un canapé, créant un contraste marqué avec l'obscurité environnante.": "Light partly illuminates the beige fabric cushions of a sofa, creating a strong contrast with the surrounding darkness.",
  "Lumière chaude éclairant partiellement un canapé en tissu beige avec un angle formé par deux coussins.": "Warm light partly illuminating a beige fabric sofa, with a corner formed by two cushions.",
  "Pierre Marin, Directeur Général, parle en gesticulant dans un bureau moderne avec une lampe à ampoules allumées à gauche et une grande fenêtre avec un balcon et des plantes à droite.": "Pierre Marin, CEO, speaking and gesturing in a modern office, with a lit bulb lamp on the left and a large window with a balcony and plants on the right.",
  "Plante en pot blanc à côté de grandes fenêtres dans une pièce avec des fauteuils noirs et un tapis vert, avec des bâtiments en verre reflétés à l'extérieur.": "White potted plant next to large windows in a room with black armchairs and a green rug, with glass buildings reflected outside.",
  "Portrait d'un homme blanc avec une barbe, cheveux bouclés bruns foncés, portant une chemise rayée claire et une veste noire, regardant vers la droite.": "Portrait of a man with a beard and dark brown curly hair, wearing a light striped shirt and a black jacket, looking to the right.",
  "Portrait d'un homme d'âge moyen avec des cheveux châtains, une barbe légère, portant un costume sombre, une chemise blanche et une cravate, avec un fond bleu uni.": "Portrait of a middle-aged man with brown hair and a light beard, wearing a dark suit, a white shirt and a tie, against a plain blue background.",
  "Portrait d'un homme d'âge moyen avec une barbe grise et des yeux bleus portant un costume bleu et une chemise blanche, souriant légèrement devant un fond intérieur flou.": "Portrait of a middle-aged man with a grey beard and blue eyes, wearing a blue suit and a white shirt, smiling slightly against a blurred indoor background.",
  "Profil d'une femme aux cheveux bouclés noirs regardant vers la gauche, avec un homme flou au premier plan à droite sur fond beige.": "Profile of a woman with black curly hair looking to the left, with a blurred man in the foreground on the right against a beige background.",
  "Profil de Fabien C., propriétaire d'entreprise de 52 ans, planifiant la vente de son entreprise dans deux ans avec pour objectif principal de sécuriser les recettes de la vente et secondaire de transmettre la richesse à ses enfants. Options envisagées : assurance-vie luxembourgeoise, private equity, apport-cession 150-0 B ter, et démembrement de propriété et donation.": "Profile of Fabien C., a 52-year-old business owner planning to sell his company in two years, with the main goal of securing the sale proceeds and the secondary goal of passing on wealth to his children. Options considered: Luxembourg life insurance, private equity, 150-0 B ter contribution-sale and split ownership with gifting.",
  "Smartphone posé sur une surface marron texturée affichant une application de portefeuille financier en français, montrant une valeur totale de 1 483 269 € au 21 avril 2026 avec une augmentation de 62 %, un graphique en barres et courbe de janvier 2022 à avril 2026, et une section de répartition des actifs indiquant 48 % en immobilier.": "Smartphone on a textured brown surface showing a portfolio app with a total value of €1,483,269 on 21 April 2026, up 62%, a bar and line chart from January 2022 to April 2026, and an asset allocation section showing 48% in real estate.",
  "Trois personnes regardant vers la droite, un homme au centre avec des lunettes et une veste sombre, une femme blonde à l'avant avec une veste bleue, et une autre personne partiellement visible à gauche.": "Three people looking to the right: a man in the centre with glasses and a dark jacket, a blonde woman in front with a blue jacket, and another person partly visible on the left.",
  "Un cadenas noir transparent suspendu au centre devant un graphique de données flou avec des barres blanches croissantes sur un fond vert dégradé, symbolisant la sécurité des données.": "A transparent black padlock in the centre in front of a blurred data chart with rising white bars on a green gradient background, symbolising data security.",
  "Un couple souriant pose avec des verres de vin sur un bateau avec la Tour Eiffel illuminée en arrière-plan au crépuscule, au bord de la Seine à Paris.": "A smiling couple posing with glasses of wine on a boat, with the illuminated Eiffel Tower in the background at dusk, on the Seine in Paris.",
  "Un groupe de personnes discutant et socialisant lors d'un événement extérieur en journée dans un jardin entouré de palmiers, avec un ballon blanc marqué \"RockFi\" flottant au centre.": "A group of people chatting at a daytime outdoor event in a garden surrounded by palm trees, with a white \"RockFi\" balloon floating in the centre.",
  "Un homme de dos sur un terrain de golf, portant un polo blanc, un pantalon noir à motifs blancs, des chaussures blanches, tenant un club de golf sur son épaule gauche, avec un paysage d'arbres et un ciel nuageux en arrière-plan.": "A man seen from behind on a golf course, wearing a white polo shirt, black trousers with white patterns and white shoes, holding a golf club on his left shoulder, with trees and a cloudy sky in the background.",
  "Un homme et une femme assis sur un canapé dans un environnement intérieur moderne avec de grandes fenêtres, souriant et semblant engagés dans une conversation agréable.": "A man and a woman sitting on a sofa in a modern interior with large windows, smiling and enjoying a pleasant conversation.",
  "Un homme et une femme souriants assis sur un canapé dans une pièce bien éclairée, avec des fenêtres en arrière-plan.": "A smiling man and woman sitting on a sofa in a bright room, with windows in the background.",
  "Un homme portant un micro à boucle arrière, habillé d'un pull noir, donnant une présentation ou un discours sur scène, avec une expression concentrée et tenant un objet dans ses mains.": "A man wearing a headset microphone and a black jumper, giving a presentation on stage with a focused expression and holding an object in his hands.",
  "Un smartphone posé sur une surface en bois contre un mur texturé, affichant une application de portefeuille d'investissement en français, montrant la valeur totale 1 483 269 € au 21 avril 2026 avec un graphique de performance en hausse et une répartition des actifs indiquant 48% en immobilier (1 450 280 €).": "A smartphone on a wooden surface against a textured wall, showing an investment portfolio app with a total value of €1,483,269 on 21 April 2026, a rising performance chart and an asset allocation showing 48% in real estate (€1,450,280).",
  "Un smartphone posé sur une surface marron affiche une application de portefeuille financier en mode sombre, montrant un solde total de 1 483 269 € au 21 avril 2026 avec une augmentation de 62 % (+568 000 €). Un graphique linéaire et à barres illustre l'évolution patrimoniale de janvier 2022 à avril 2026. La répartition des actifs indique 48 % en immobilier avec une valeur de 1 450 280 € et une hausse de 1,3 %.": "A smartphone on a brown surface showing a portfolio app in dark mode, with a total balance of €1,483,269 on 21 April 2026, up 62% (+€568,000). A line and bar chart shows wealth growth from January 2022 to April 2026. The asset allocation shows 48% in real estate worth €1,450,280, up 1.3%.",
  "Une femme en robe claire prend la parole devant un groupe de personnes habillées formellement sur les marches d'un grand bâtiment en pierre, avec fenêtres et balustrades classiques, ensoleillé.": "A woman in a light dress speaking to a group of formally dressed people on the steps of a large stone building with classic windows and balustrades, in the sunshine.",
  "Une femme souriante aux longs cheveux bruns, assise avec les bras croisés, regardant vers la droite, à côté d'un homme souriant en chemise bleue.": "A smiling woman with long brown hair, sitting with her arms crossed and looking to the right, next to a smiling man in a blue shirt.",
  "Une foule de personnes en costumes dans une salle élégante avec un grand ballon éclairé affichant le texte 'RockFi'.": "A crowd of people in suits in an elegant room with a large illuminated balloon showing the word 'RockFi'.",
  "Une main tenant un crayon qui repose sur un livre ouvert sur une table en bois, avec une personne en chemise vert olive en arrière-plan.": "A hand holding a pencil resting on an open book on a wooden table, with a person in an olive green shirt in the background.",
  "Une main tenant un petit tournevis et manipulant les composants internes d'une montre mécanique pour des réparations ou un assemblage précis.": "A hand holding a small screwdriver and working on the internal components of a mechanical watch for precise repair or assembly.",
  "Une salle élégante avec une grande bibliothèque en bois remplie de livres, une table de billard au centre avec des boules disposées dessus et une personne floue en mouvement près de la table.": "An elegant room with a large wooden bookcase full of books, a billiard table in the centre with balls on it and a blurred person moving near the table.",
  "Écran de smartphone affichant une application de portefeuille financier en mode sombre, montrant une valeur de 1 483 269 euros au 21 avril 2026 avec une hausse de 62% (+568 000 €), un graphique de performance croissante de janvier 2022 à avril 2026, et des onglets pour patrimoine total et capital investi.": "Smartphone screen showing a portfolio app in dark mode, with a value of €1,483,269 on 21 April 2026, up 62% (+€568,000), a rising performance chart from January 2022 to April 2026, and tabs for total wealth and invested capital.",
};

const ATTRS = ["alt", "aria-label", "title", "placeholder"];
const SKIP = /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE|NOSCRIPT)$/;

function translate(root) {
  // Textes : on garde les espaces autour du texte d'origine
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentNode && SKIP.test(node.parentNode.nodeName)) return NodeFilter.FILTER_REJECT;
      return DICT[node.nodeValue.trim()] ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  let node;
  while ((node = walker.nextNode())) {
    const raw = node.nodeValue;
    const key = raw.trim();
    node.nodeValue = raw.replace(key, DICT[key]);
  }

  // Attributs
  const selector = ATTRS.map((attr) => `[${attr}]`).join(",");
  root.querySelectorAll(selector).forEach((el) => {
    ATTRS.forEach((attr) => {
      const value = el.getAttribute(attr);
      if (value && DICT[value.trim()]) el.setAttribute(attr, DICT[value.trim()]);
    });
  });
}

export function initEmbedI18n() {
  if (getLang() !== "en") return;
  translate(document.body);

  // Carte et maquette génèrent une partie de leur contenu après le chargement
  let timer;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => translate(document.body), 150);
  }).observe(document.body, { childList: true, subtree: true });
}
