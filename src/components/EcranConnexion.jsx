import { useState } from "react";
import { connexion, enregistrerSession } from "../api";

export default function EcranConnexion({ onConnecte }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      const donnees = await connexion(username, password);
      enregistrerSession(donnees);
      onConnecte({ role: donnees.role, username: donnees.username });
    } catch {
      setErreur("Identifiant ou mot de passe incorrect.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="ecran-plein centre">
      <form onSubmit={soumettre} className="carte-confirmation" style={{ width: "100%", maxWidth: 340 }}>
        <span className="eyebrow">Tini</span>
        <h1 className="titre-section">Connexion personnel</h1>

        <input
          type="text"
          placeholder="Identifiant"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="champ-connexion"
          autoCapitalize="none"
          autoCorrect="off"
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="champ-connexion"
        />

        {erreur && <p className="message-erreur">{erreur}</p>}

        <button type="submit" className="bouton-principal" disabled={enCours} style={{ width: "100%" }}>
          {enCours ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
