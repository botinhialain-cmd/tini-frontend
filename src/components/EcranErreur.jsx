export default function EcranErreur() {
  return (
    <div className="ecran-plein centre">
      <div className="carte-confirmation">
        <span className="eyebrow">Oups</span>
        <h1 className="titre-section">Ce lien ne fonctionne pas</h1>
        <p className="texte-attenue">
          Re-scanne le QR code sur ta table, ou appelle quelqu'un pour t'aider.
        </p>
      </div>
    </div>
  );
}
