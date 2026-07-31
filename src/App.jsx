import { useEffect, useMemo, useState } from "react";
import { recupererTable, recupererProduits, creerCommande, recupererCommande } from "./api";
import EcranMenu from "./components/EcranMenu";
import EcranPanier from "./components/EcranPanier";
import EcranConfirmation from "./components/EcranConfirmation";
import EcranErreur from "./components/EcranErreur";
import EcranDashboard from "./components/EcranDashboard";
import "./index.css";

function lireCodeQrDepuisUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("table");
}

export default function App() {
  const estDashboard = window.location.pathname.replace(/\/$/, "") === "/dashboard";
  const codeQr = useMemo(lireCodeQrDepuisUrl, []);

  const [statutChargement, setStatutChargement] = useState("chargement"); // chargement | pret | erreur
  const [table, setTable] = useState(null);
  const [produits, setProduits] = useState([]);
  const [panier, setPanier] = useState({}); // { produitId: quantite }
  const [ecran, setEcran] = useState("menu"); // menu | panier | confirmation
  const [commande, setCommande] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState(null);

  useEffect(() => {
    if (estDashboard) return;
    if (!codeQr) {
      setStatutChargement("erreur");
      return;
    }
    Promise.all([recupererTable(codeQr), recupererProduits()])
      .then(([tableData, produitsData]) => {
        setTable(tableData);
        setProduits(produitsData);
        setStatutChargement("pret");
      })
      .catch(() => setStatutChargement("erreur"));
  }, [codeQr, estDashboard]);

  // Polling léger du statut de la commande une fois validée
  useEffect(() => {
    if (ecran !== "confirmation" || !commande) return;
    const interval = setInterval(() => {
      recupererCommande(commande.id)
        .then(setCommande)
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [ecran, commande]);

  function ajouterAuPanier(produitId) {
    setPanier((p) => ({ ...p, [produitId]: (p[produitId] || 0) + 1 }));
  }

  function retirerDuPanier(produitId) {
    setPanier((p) => {
      const quantite = (p[produitId] || 0) - 1;
      const copie = { ...p };
      if (quantite <= 0) delete copie[produitId];
      else copie[produitId] = quantite;
      return copie;
    });
  }

  const lignesPanier = Object.entries(panier)
    .map(([produitId, quantite]) => {
      const produit = produits.find((p) => p.id === Number(produitId));
      return produit ? { produitId: produit.id, produit, quantite } : null;
    })
    .filter(Boolean);

  const totalPanier = lignesPanier.reduce((somme, l) => somme + l.produit.prix * l.quantite, 0);
  const nombreArticles = lignesPanier.reduce((somme, l) => somme + l.quantite, 0);

  async function validerCommande() {
    setEnvoiEnCours(true);
    setErreurEnvoi(null);
    try {
      const nouvelleCommande = await creerCommande(codeQr, lignesPanier);
      setCommande(nouvelleCommande);
      setPanier({});
      setEcran("confirmation");
    } catch {
      setErreurEnvoi("La commande n'a pas pu être envoyée. Vérifie ta connexion et réessaie.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  if (estDashboard) {
    return (
      <div className="app-mobile">
        <EcranDashboard />
      </div>
    );
  }

  if (statutChargement === "chargement") {
    return <div className="ecran-plein centre texte-attenue">Chargement du menu…</div>;
  }

  if (statutChargement === "erreur") {
    return <EcranErreur />;
  }

  return (
    <div className="app-mobile">
      {ecran === "menu" && (
        <EcranMenu
          table={table}
          produits={produits}
          panier={panier}
          onAjouter={ajouterAuPanier}
          onRetirer={retirerDuPanier}
          nombreArticles={nombreArticles}
          totalPanier={totalPanier}
          onVoirPanier={() => setEcran("panier")}
        />
      )}

      {ecran === "panier" && (
        <EcranPanier
          table={table}
          lignes={lignesPanier}
          total={totalPanier}
          onAjouter={ajouterAuPanier}
          onRetirer={retirerDuPanier}
          onRetour={() => setEcran("menu")}
          onValider={validerCommande}
          envoiEnCours={envoiEnCours}
          erreur={erreurEnvoi}
        />
      )}

      {ecran === "confirmation" && commande && (
        <EcranConfirmation
          commande={commande}
          onNouvelleCommande={() => setEcran("menu")}
        />
      )}
    </div>
  );
}
