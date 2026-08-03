const NOM_ETABLISSEMENT = import.meta.env.VITE_NOM_ETABLISSEMENT || "Yakpéhi";

const ORDRE_CATEGORIES = ["biere", "vin", "cocktail", "spiritueux", "energisante", "soft", "plat"];
const LIBELLES_CATEGORIES = {
  biere: "Bières",
  vin: "Vins",
  spiritueux: "Spiritueux",
  cocktail: "Cocktails",
  energisante: "Boissons énergisantes",
  soft: "Softs / Sans alcool",
  plat: "Plats",
};

function grouperParCategorie(produits) {
  const groupes = ORDRE_CATEGORIES.map((cle) => ({
    cle,
    libelle: LIBELLES_CATEGORIES[cle],
    produits: produits.filter((p) => p.categorie === cle),
  })).filter((groupe) => groupe.produits.length > 0);

  // Sécurité : si une catégorie inconnue apparaît (pas dans ORDRE_CATEGORIES), on l'affiche quand même à la fin.
  const categoriesConnues = new Set(ORDRE_CATEGORIES);
  const restants = produits.filter((p) => !categoriesConnues.has(p.categorie));
  if (restants.length > 0) {
    groupes.push({ cle: "autre", libelle: "Autres", produits: restants });
  }

  return groupes;
}

export default function EcranMenu({
  table,
  produits,
  panier,
  onAjouter,
  onRetirer,
  nombreArticles,
  totalPanier,
  onVoirPanier,
}) {
  const groupes = grouperParCategorie(produits);

  return (
    <div className="ecran">
      <header className="entete-menu">
        <span className="eyebrow">Table {table.numero}</span>
        <h1 className="titre-marque" style={{ fontSize: 30 }}>Bienvenue au {NOM_ETABLISSEMENT}</h1>
        <p className="sous-titre-secondaire">Compose ta tournée</p>
      </header>

      {groupes.map((groupe) => (
        <div key={groupe.cle} style={{ marginBottom: 22 }}>
          <h2 className="titre-categorie">{groupe.libelle}</h2>
          <ul className="liste-produits">
            {groupe.produits.map((produit) => {
              const quantite = panier[produit.id] || 0;
              return (
                <li key={produit.id} className="carte-produit">
                  {produit.photo && (
                    <img
                      src={produit.photo}
                      alt={produit.nom}
                      className="carte-produit__photo"
                    />
                  )}
                  <div className="carte-produit__info">
                    <span className="carte-produit__nom">{produit.nom}</span>
                    <span className="carte-produit__meta">
                      {produit.format ? `${produit.format} · ` : ""}
                      {produit.prix} FCFA
                    </span>
                  </div>

                  {quantite === 0 ? (
                    <button className="bouton-ajouter" onClick={() => onAjouter(produit.id)}>
                      Ajouter
                    </button>
                  ) : (
                    <div className="selecteur-quantite">
                      <button
                        className="selecteur-quantite__bouton"
                        onClick={() => onRetirer(produit.id)}
                        aria-label={`Retirer un ${produit.nom}`}
                      >
                        −
                      </button>
                      <span className="selecteur-quantite__valeur">{quantite}</span>
                      <button
                        className="selecteur-quantite__bouton"
                        onClick={() => onAjouter(produit.id)}
                        aria-label={`Ajouter un ${produit.nom}`}
                      >
                        +
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {nombreArticles > 0 && (
        <button className="barre-panier" onClick={onVoirPanier}>
          <span className="barre-panier__badge">{nombreArticles}</span>
          <span>Voir ma commande</span>
          <span className="barre-panier__total">{totalPanier} FCFA</span>
        </button>
      )}

      <p className="pied-copyright">© Alain Botinhi</p>
    </div>
  );
}
