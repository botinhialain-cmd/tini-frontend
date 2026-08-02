import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  recupererCommandesActives,
  recupererHistoriqueCommandes,
  recupererStatsVentes,
  changerStatutCommande,
  changerPaiementCommande,
  lireSession,
  effacerToken,
} from "../api";
import EcranConnexion from "./EcranConnexion";

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

function formaterDateHeure(dateIso) {
  const date = new Date(dateIso);
  const jour = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  const heure = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${jour} · ${heure}`;
}

function formaterJourLong(dateIso) {
  const date = new Date(dateIso);
  const texte = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

// Regroupe une liste de commandes par jour (basé sur date_creation), en conservant
// l'ordre déjà trié (plus récent en premier) renvoyé par le backend.
function grouperParJour(commandes) {
  const groupes = [];
  const index = new Map();

  commandes.forEach((commande) => {
    const cle = new Date(commande.date_creation).toDateString();
    if (!index.has(cle)) {
      const groupe = { cle, libelle: formaterJourLong(commande.date_creation), commandes: [] };
      index.set(cle, groupe);
      groupes.push(groupe);
    }
    index.get(cle).commandes.push(commande);
  });

  return groupes.map((groupe) => ({
    ...groupe,
    totalJour: groupe.commandes
      .filter((c) => c.statut === "servie")
      .reduce((somme, c) => somme + c.total, 0),
  }));
}

// Joue une petite mélodie de 3 notes générée à la volée, sans fichier audio externe.
function jouerBip() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const contexte = new AudioCtx();
    const notes = [659, 784, 988, 1175]; // mi, sol, si, ré — petit motif ascendant, facile à reconnaître
    const dureeNote = 0.16;
    const espacement = 0.18;

    notes.forEach((frequence, index) => {
      const debut = contexte.currentTime + index * espacement;
      const oscillateur = contexte.createOscillator();
      const volume = contexte.createGain();
      oscillateur.type = "sine";
      oscillateur.frequency.value = frequence;
      volume.gain.setValueAtTime(0.18, debut);
      volume.gain.exponentialRampToValueAtTime(0.001, debut + dureeNote);
      oscillateur.connect(volume);
      volume.connect(contexte.destination);
      oscillateur.start(debut);
      oscillateur.stop(debut + dureeNote);
    });
  } catch {
    // Navigateur ne supportant pas l'API audio : on ignore silencieusement.
  }
}

function notifierNouvelleCommande(commande) {
  jouerBip();
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    const produits = commande.lignes.map((l) => `${l.quantite}x ${l.produit.nom}`).join(", ");
    new Notification(`Nouvelle commande - Table ${commande.table_numero}`, {
      body: produits,
    });
  }
}

export default function EcranDashboard() {
  const [session, setSession] = useState(() => lireSession());

  const [commandes, setCommandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [enAttente, setEnAttente] = useState({}); // { [commandeId]: true } pendant une action
  const [permissionNotif, setPermissionNotif] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  const idsConnus = useRef(null); // null = premier chargement, pas encore initialisé

  const [onglet, setOnglet] = useState("encours"); // encours | historique
  const [historique, setHistorique] = useState([]);
  const [chargementHistorique, setChargementHistorique] = useState(false);
  const [stats, setStats] = useState(null);


  function chargerHistorique() {
    setChargementHistorique(true);
    Promise.all([recupererHistoriqueCommandes(), recupererStatsVentes()])
      .then(([donneesHistorique, donneesStats]) => {
        setHistorique(donneesHistorique);
        setStats(donneesStats);
        setChargementHistorique(false);
      })
      .catch(() => {
        setErreur("Impossible de charger l'historique.");
        setChargementHistorique(false);
      });
  }

  function exporterExcel() {
    const lignesCommandes = historique.map((commande) => {
      const date = new Date(commande.date_creation);
      return {
        Date: date.toLocaleDateString("fr-FR"),
        Heure: formaterHeure(commande.date_creation),
        Table: commande.table_numero,
        Produits: commande.lignes.map((l) => `${l.quantite} × ${l.produit.nom}`).join(", "),
        Statut: LIBELLES_STATUT[commande.statut] || commande.statut,
        État: commande.paye ? "Payé" : "",
        "Servi par": commande.servi_par_nom || "",
        "Total (FCFA)": commande.total,
      };
    });

    const lignesRecap = (stats?.produits || []).map((p) => ({
      Produit: p.nom,
      Quantité: p.quantite,
      "Montant (FCFA)": p.montant,
    }));
    lignesRecap.push({ Produit: "TOTAL GÉNÉRAL", Quantité: "", "Montant (FCFA)": stats?.total_general || 0 });

    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(classeur, XLSX.utils.json_to_sheet(lignesCommandes), "Commandes");
    XLSX.utils.book_append_sheet(classeur, XLSX.utils.json_to_sheet(lignesRecap), "Récapitulatif");

    const aujourdhui = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(classeur, `tini_historique_${aujourdhui}.xlsx`);
  }

  useEffect(() => {
    if (session && session.role !== "gerant" && onglet === "historique") {
      setOnglet("encours");
    }
  }, [session, onglet]);

  function deconnexion() {
    effacerToken();
    setSession(null);
  }

  useEffect(() => {
    if (session && onglet === "historique") chargerHistorique();
  }, [onglet, session]);

  useEffect(() => {
    if (!session) return;

    let annule = false;

    function charger() {
      recupererCommandesActives()
        .then((donnees) => {
          if (annule) return;

          if (idsConnus.current !== null) {
            const nouvelles = donnees.filter((c) => !idsConnus.current.has(c.id));
            nouvelles.forEach(notifierNouvelleCommande);
          }
          idsConnus.current = new Set(donnees.map((c) => c.id));

          setCommandes(donnees);
          setChargement(false);
          setErreur(null);
        })
        .catch((err) => {
          if (annule) return;
          if (err.status === 401) {
            deconnexion();
            return;
          }
          setErreur("Impossible de charger les commandes. Nouvelle tentative dans quelques secondes...");
        });
    }

    charger();
    const interval = setInterval(charger, 5000);
    return () => {
      annule = true;
      clearInterval(interval);
    };
  }, [session]);

  function demanderPermissionNotif() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(setPermissionNotif);
  }

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

  async function basculerPaiement(commande) {
    const nouvelEtat = !commande.paye;
    setEnAttente((e) => ({ ...e, [`paye-${commande.id}`]: true }));
    try {
      await changerPaiementCommande(commande.id, nouvelEtat);
      setCommandes((liste) => liste.map((c) => (c.id === commande.id ? { ...c, paye: nouvelEtat } : c)));
      setHistorique((liste) => liste.map((c) => (c.id === commande.id ? { ...c, paye: nouvelEtat } : c)));
    } catch {
      setErreur("Une action a échoué. Réessaie.");
    } finally {
      setEnAttente((e) => {
        const copie = { ...e };
        delete copie[`paye-${commande.id}`];
        return copie;
      });
    }
  }

  if (!session) {
    return <EcranConnexion onConnecte={setSession} />;
  }

  if (chargement) {
    return <div className="ecran-plein centre texte-attenue">Chargement des commandes…</div>;
  }

  return (
    <div className="ecran">
      <header className="entete-menu">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="eyebrow">Tableau de bord</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="texte-attenue" style={{ fontSize: 13 }}>{session.username}</span>
            <button className="lien-deconnexion" onClick={deconnexion}>Déconnexion</button>
          </div>
        </div>
        <h1 className="titre-marque" style={{ fontSize: 32 }}>
          Commandes en cours
        </h1>
      </header>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button
          className="bouton-ajouter"
          style={{ opacity: onglet === "encours" ? 1 : 0.5 }}
          onClick={() => setOnglet("encours")}
        >
          En cours
        </button>
        {session.role === "gerant" && (
          <button
            className="bouton-ajouter"
            style={{ opacity: onglet === "historique" ? 1 : 0.5 }}
            onClick={() => setOnglet("historique")}
          >
            Historique
          </button>
        )}
      </div>

      {permissionNotif === "default" && (
        <button className="bouton-ajouter" style={{ marginBottom: 16 }} onClick={demanderPermissionNotif}>
          🔔 Activer les notifications
        </button>
      )}
      {permissionNotif === "denied" && (
        <p className="message-erreur" style={{ marginBottom: 16 }}>
          Notifications bloquées par le navigateur. Autorise-les dans les réglages du site pour être alertée des nouvelles commandes.
        </p>
      )}

      {erreur && <p className="message-erreur">{erreur}</p>}

      {onglet === "encours" ? (
        commandes.length === 0 ? (
          <p className="texte-attenue" style={{ padding: "0 20px" }}>
            Aucune commande en attente pour l'instant.
          </p>
        ) : (
          <ul className="liste-produits">
            {commandes.map((commande) => (
              <li key={commande.id} className="carte-produit" style={{ alignItems: "flex-start", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                  <span className="carte-produit__nom">Table {commande.table_numero}</span>
                  <span className="carte-produit__meta">{formaterDateHeure(commande.date_creation)}</span>
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

                <button
                  className="lien-deconnexion"
                  style={{ alignSelf: "flex-end" }}
                  onClick={() => basculerPaiement(commande)}
                  disabled={!!enAttente[`paye-${commande.id}`]}
                >
                  {enAttente[`paye-${commande.id}`] ? "…" : commande.paye ? "✅ Payé" : "◻︎ Marquer payé"}
                </button>
              </li>
            ))}
          </ul>
        )
      ) : chargementHistorique ? (
        <p className="texte-attenue" style={{ padding: "0 20px" }}>Chargement de l'historique…</p>
      ) : (
        <>
          {historique.length > 0 && (
            <button className="bouton-ajouter" style={{ marginBottom: 16 }} onClick={exporterExcel}>
              📊 Exporter en Excel
            </button>
          )}

          {stats && stats.produits.length > 0 && (
            <div className="carte-produit" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8, marginBottom: 16 }}>
              <span className="carte-produit__nom">Récapitulatif des ventes</span>
              <ul className="liste-recap" style={{ width: "100%" }}>
                {stats.produits.map((p) => (
                  <li key={p.nom}>
                    {p.quantite} × {p.nom}
                    <span className="liste-recap__prix">{p.montant} FCFA</span>
                  </li>
                ))}
              </ul>
              <div className="pied-panier__total" style={{ width: "100%", margin: 0 }}>
                <span>Total vendu</span>
                <span className="pied-panier__montant">{stats.total_general} FCFA</span>
              </div>
            </div>
          )}

          {historique.length === 0 ? (
            <p className="texte-attenue" style={{ padding: "0 20px" }}>
              Aucune commande dans l'historique pour l'instant.
            </p>
          ) : (
            grouperParJour(historique).map((groupe) => (
              <div key={groupe.cle} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 4px", marginBottom: 10 }}>
                  <span className="eyebrow">{groupe.libelle}</span>
                  <span className="carte-produit__meta">{groupe.totalJour} FCFA vendus</span>
                </div>

                <ul className="liste-produits">
                  {groupe.commandes.map((commande) => (
                    <li key={commande.id} className="carte-produit" style={{ alignItems: "flex-start", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                        <span className="carte-produit__nom">Table {commande.table_numero}</span>
                        <span className="carte-produit__meta">{formaterHeure(commande.date_creation)}</span>
                      </div>

                      <ul className="liste-recap" style={{ width: "100%" }}>
                        {commande.lignes.map((ligne) => (
                          <li key={ligne.id}>
                            {ligne.quantite} × {ligne.produit.nom}
                            <span className="liste-recap__prix">{ligne.sous_total} FCFA</span>
                          </li>
                        ))}
                      </ul>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                        <span className={`badge-statut badge-statut--${commande.statut}`}>
                          {LIBELLES_STATUT[commande.statut]}
                          {commande.servi_par_nom && ` · ${commande.servi_par_nom}`}
                        </span>
                        <span className="carte-produit__meta">{commande.total} FCFA</span>
                      </div>

                      <button
                        className="lien-deconnexion"
                        style={{ alignSelf: "flex-end" }}
                        onClick={() => basculerPaiement(commande)}
                        disabled={!!enAttente[`paye-${commande.id}`]}
                      >
                        {enAttente[`paye-${commande.id}`] ? "…" : commande.paye ? "✅ Payé" : "◻︎ Marquer payé"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
