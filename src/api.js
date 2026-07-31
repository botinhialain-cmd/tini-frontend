// Centralise tous les appels réseau vers le backend Django.
// En dev, Vite tourne sur un port différent de Django (proxy configuré dans vite.config.js).

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function requeteJSON(url, options) {
  const reponse = await fetch(`${BASE_URL}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!reponse.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await reponse.json());
    } catch {
      // pas de corps JSON, on ignore
    }
    throw new Error(`Erreur ${reponse.status} sur ${url} ${detail}`);
  }

  return reponse.json();
}

export function recupererTable(codeQr) {
  return requeteJSON(`/api/tables/${codeQr}/`);
}

export function recupererProduits() {
  return requeteJSON(`/api/produits/`);
}

export function creerCommande(tableCodeQr, lignes) {
  return requeteJSON(`/api/commandes/`, {
    method: "POST",
    body: JSON.stringify({
      table_code_qr: tableCodeQr,
      lignes: lignes.map((l) => ({ produit_id: l.produitId, quantite: l.quantite })),
    }),
  });
}

export function recupererCommande(id) {
  return requeteJSON(`/api/commandes/${id}/`);
}

export function recupererCommandesActives() {
  return requeteJSON(`/api/commandes/`);
}

export function recupererHistoriqueCommandes() {
  return requeteJSON(`/api/commandes/?vue=historique`);
}

export function changerStatutCommande(id, statut) {
  return requeteJSON(`/api/commandes/${id}/statut/`, {
    method: "PATCH",
    body: JSON.stringify({ statut }),
  });
}
