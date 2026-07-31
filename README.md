# Tini Frontend - MVP

Application web (pas d'installation nécessaire côté client) que le client
voit en scannant le QR code de sa table.

## Installation

```bash
npm install
npm run dev
```

Le site est alors disponible sur `http://localhost:5173`.

## Configuration

Par défaut, le frontend appelle le backend sur `http://127.0.0.1:8000`.
Pour changer cette URL (par exemple en production), crée un fichier `.env` :

```
VITE_API_URL=https://ton-domaine-backend.com
```

## Comment ça fonctionne

Le QR code sur chaque table doit pointer vers une URL de ce type :

```
https://ton-domaine.com/?table=<code_qr_de_la_table>
```

Le `code_qr` de chaque table est visible dans l'admin Django du backend
(section Tables). C'est cet identifiant qui permet à l'app de savoir
pour quelle table la commande est passée.

## Parcours utilisateur

1. Le client scanne le QR code → arrive sur le menu
2. Il ajoute des bières à son panier (+/-)
3. Il valide sa commande → notif WhatsApp envoyée à la gérante (backend)
4. Il voit le statut de sa commande évoluer (reçue → en préparation → servie)

## Build pour la production

```bash
npm run build
```

Génère un dossier `dist/` prêt à être déployé sur n'importe quel hébergeur
de site statique (Netlify, Vercel, ou même servi par Django/nginx).

## Prochaines étapes possibles

- Génération des QR codes physiques (un script simple peut générer une image
  QR pour chaque URL de table)
- Écran dédié pour la gérante (actuellement elle reçoit tout par WhatsApp)
- Gestion de plusieurs catégories (softs, plats) quand le menu s'étoffera
