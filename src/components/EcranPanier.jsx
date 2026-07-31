import { useState } from "react";

export default function EcranPanier({
  table,
  lignes,
  total,
  onAjouter,
  onRetirer,
  onRetour,
  onValider,
  envoiEnCours,
  erreur,
}) {
  const [confirmationOuverte, setConfirmationOuverte] = useState(false);

  function confirmerValidation() {
    setConfirmationOuverte(false);
    onValider();
  }

  return (
    <div className="ecran">
      <header className="entete-panier">
        <button className="lien-retour" onClick={onRetour}>
          ← Retour au menu
        </button>
        <h1 className="titre-section">Ta commande</h1>
        <span className="texte-attenue">Table {table.numero}</span>
      </header>

      {lignes.length === 0 ? (
        <p className="texte-attenue" style={{ padding: "0 20px" }}>
          Ton panier est vide pour l'instant.
        </p>
      ) : (
        <ul className="liste-produits">
          {lignes.map((ligne) => (
            <li key={ligne.produitId} className="carte-produit">
              <div className="carte-produit__info">
                <span className="carte-produit__nom">{ligne.produit.nom}</span>
                <span className="carte-produit__meta">
                  {ligne.quantite} × {ligne.produit.prix} FCFA
                </span>
              </div>
              <div className="selecteur-quantite">
                <button
                  className="selecteur-quantite__bouton"
                  onClick={() => onRetirer(ligne.produitId)}
                  aria-label={`Retirer un ${ligne.produit.nom}`}
                >
                  −
                </button>
                <span className="selecteur-quantite__valeur">{ligne.quantite}</span>
                <button
                  className="selecteur-quantite__bouton"
                  onClick={() => onAjouter(ligne.produitId)}
                  aria-label={`Ajouter un ${ligne.produit.nom}`}
                >
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {erreur && <p className="message-erreur">{erreur}</p>}

      <div className="pied-panier">
        <div className="pied-panier__total">
          <span>Total</span>
          <span className="pied-panier__montant">{total} FCFA</span>
        </div>
        <button
          className="bouton-principal"
          onClick={() => setConfirmationOuverte(true)}
          disabled={lignes.length === 0 || envoiEnCours}
        >
          {envoiEnCours ? "Envoi en cours…" : "Valider ma commande"}
        </button>
      </div>

      {confirmationOuverte && (
        <div className="fond-popup" onClick={() => setConfirmationOuverte(false)}>
          <div className="carte-popup" onClick={(e) => e.stopPropagation()}>
            <h2 className="titre-popup">Confirmer la commande ?</h2>
            <p className="texte-attenue" style={{ textAlign: "center", margin: "8px 0 20px" }}>
              Une fois validée, la commande ne pourra plus être modifiée.
            </p>
            <div className="pied-panier__total" style={{ margin: "0 0 20px" }}>
              <span>Total</span>
              <span className="pied-panier__montant">{total} FCFA</span>
            </div>
            <button className="bouton-principal" onClick={confirmerValidation}>
              Confirmer la commande
            </button>
            <button
              className="lien-retour"
              style={{ width: "100%", textAlign: "center", marginTop: 14 }}
              onClick={() => setConfirmationOuverte(false)}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
