const LIBELLES_STATUT = {
  recue: "Commande reçue",
  en_preparation: "En préparation",
  servie: "Servie, bonne dégustation !",
  annulee: "Commande annulée",
};

export default function EcranConfirmation({ commande, onNouvelleCommande }) {
  const libelle = LIBELLES_STATUT[commande.statut] || commande.statut;

  return (
    <div className="ecran centre">
      <div className="carte-confirmation">
        <span className="eyebrow">Commande #{commande.id}</span>
        <h1 className="titre-section">Merci !</h1>
        <p className="texte-attenue">Table {commande.table_numero}</p>

        <div className={`badge-statut badge-statut--${commande.statut}`}>{libelle}</div>

        <ul className="liste-recap">
          {commande.lignes.map((ligne) => (
            <li key={ligne.id}>
              {ligne.quantite} × {ligne.produit.nom}
              <span className="liste-recap__prix">{ligne.sous_total} FCFA</span>
            </li>
          ))}
        </ul>

        <div className="pied-panier__total">
          <span>Total</span>
          <span className="pied-panier__montant">{commande.total} FCFA</span>
        </div>

        {commande.statut === "servie" && (
          <button className="bouton-principal" onClick={onNouvelleCommande}>
            Commander à nouveau
          </button>
        )}
      </div>
    </div>
  );
}
