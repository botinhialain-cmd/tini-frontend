import { useEffect, useState } from "react";
import { recupererCommandesActives, changerStatutCommande } from "../api";

const LIBELLES_STATUT = {
  recue: "Reçue",
  en_preparation: "En préparation",
  servie: "Servie",
  annulee: "Annulée",
};

const PROCHAIN_STATUT = {
  recue: "en_preparation",
  en_preparation: "servie",
};

const LIBELLE_ACTION = {
  recue: "Démarrer",
  en_preparation: "Marquer servie",
};

function formaterHeure(dateIso) {
  const date = new Date(dateIso);
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function EcranDashboard() {
  const [commandes, setCommandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [enAttente, setEnAttente] = useState({}); // { [commandeId]: true } pendant une action

  useEffect(() => {
    let annule = false;

    function charger() {
      recupererCommandesActives()
        .then((donnees) => {
          if (!annule) {
            setCommandes(donnees);
            setChargement(false);
            setErreur(null);
          }
        })
        .catch(() => {
          if (!annule) setErreur("Impossible de charger les commandes. Nouvelle tentative dans quelques secondes...");
        });
    }

    charger();
    const interval = setInterval(charger, 5000);
    return () => {
      annule = true;
      clearInterval(interval);
    };
  }, []);

  async function avancerStatut(commande) {
    const nouveauStatut = PROCHAIN_STATUT[commande.statut];
    if (!nouveauStatut) return;

    setEnAttente((e) => ({ ...e, [commande.id]: true }));
    try {
      await changerStatutCommande(commande.id, nouveauStatut);
      setCommandes((liste) =>
        nouveauStatut === "servie"
          ? liste.filter((c) => c.id !== commande.id)
          : liste.map((c) => (c.id === commande.id ? { ...c, statut: nouveauStatut } : c))
      );
    } catch {
      setErreur("Une action a échoué. Réessaie.");
    } finally {
      setEnAttente((e) => {
        const copie = { ...e };
        delete copie[commande.id];
        return copie;
      });
    }
  }

  if (chargement) {
    return <div className="ecran-plein centre texte-attenue">Chargement des commandes…</div>;
  }

  return (
    <div className="ecran">
      <header className="entete-menu">
        <span className="eyebrow">Tableau de bord</span>
        <h1 className="titre-marque" style={{ fontSize: 32 }}>
          Commandes en cours
        </h1>
      </header>

      {erreur && <p className="message-erreur">{erreur}</p>}

      {commandes.length === 0 ? (
        <p className="texte-attenue" style={{ padding: "0 20px" }}>
          Aucune commande en attente pour l'instant.
        </p>
      ) : (
        <ul className="liste-produits">
          {commandes.map((commande) => (
            <li key={commande.id} className="carte-produit" style={{ alignItems: "flex-start", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <span className="carte-produit__nom">Table {commande.table_numero}</span>
                <span className="carte-produit__meta">{formaterHeure(commande.date_creation)}</span>
              </div>

              <ul className="liste-recap" style={{ width: "100%" }}>
                {commande.lignes.map((ligne) => (
                  <li key={ligne.id}>
                    {ligne.quantite} × {ligne.produit.nom}
                  </li>
                ))}
              </ul>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span className={`badge-statut badge-statut--${commande.statut}`}>
                  {LIBELLES_STATUT[commande.statut]}
                </span>

                {PROCHAIN_STATUT[commande.statut] && (
                  <button
                    className="bouton-ajouter"
                    onClick={() => avancerStatut(commande)}
                    disabled={!!enAttente[commande.id]}
                  >
                    {enAttente[commande.id] ? "…" : LIBELLE_ACTION[commande.statut]}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
