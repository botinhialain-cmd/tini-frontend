// Centralise tous les appels réseau vers le backend Django.
// En dev, Vite tourne sur un port différent de Django (proxy configuré dans vite.config.js).

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const CLE_TOKEN = "tini_token";
const CLE_ROLE = "tini_role";
const CLE_USERNAME = "tini_username";

export function tokenStocke() {
  return localStorage.getItem(CLE_TOKEN);
}

export function lireSession() {
  const token = localStorage.getItem(CLE_TOKEN);
  if (!token) return null;
  return {
    token,
    role: localStorage.getItem(CLE_ROLE),
    username: localStorage.getItem(CLE_USERNAME),
  };
}

export function enregistrerSession({ token, role, username }) {
  localStorage.setItem(CLE_TOKEN, token);
  localStorage.setItem(CLE_ROLE, role || "");
  localStorage.setItem(CLE_USERNAME, username || "");
}

export function effacerToken() {
  localStorage.removeItem(CLE_TOKEN);
  localStorage.removeItem(CLE_ROLE);
  localStorage.removeItem(CLE_USERNAME);
}

async function requeteJSON(url, options) {
  const token = tokenStocke();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Token ${token}`;

  const reponse = await fetch(`${BASE_URL}${url}`, {
    headers,
    ...options,
  });

  if (!reponse.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await reponse.json());
    } catch {
      // pas de corps JSON, on ignore
    }
    const erreur = new Error(`Erreur ${reponse.status} sur ${url} ${detail}`);
    erreur.status = reponse.status;
    throw erreur;
  }

  return reponse.json();
}

export function connexion(username, password) {
  return requeteJSON(`/api/comptes/connexion/`, {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
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

export function recupererStatsVentes() {
  return requeteJSON(`/api/commandes/stats/`);
}

export function changerStatutCommande(id, statut) {
  return requeteJSON(`/api/commandes/${id}/statut/`, {
    method: "PATCH",
    body: JSON.stringify({ statut }),
  });
}

export function changerPaiementCommande(id, paye) {
  return requeteJSON(`/api/commandes/${id}/paiement/`, {
    method: "PATCH",
    body: JSON.stringify({ paye }),
  });
}
