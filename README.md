# Dossier Location Facile 🏠📄

**Dossier Location Facile** est une application web moderne développée avec **Next.js**, **Supabase** et l'API **Google Drive**. Elle permet aux propriétaires particuliers de collecter, centraliser et gérer les dossiers de candidature de location immobilière de manière simple, sécurisée et professionnelle.

Les locataires déposent leurs pièces justificatives via un lien unique et dynamique sans avoir besoin de créer de compte, et tous les fichiers sont téléversés directement sur le **Google Drive** personnel du propriétaire.

---

## 🌟 Fonctionnalités Clés

### 👤 Côté Locataire (Formulaire de Candidature)
- **Zéro inscription** : Dépôt de dossier ultra-rapide pour maximiser le taux de complétion.
- **Formulaire intelligent et dynamique** : Les champs s'adaptent en temps réel selon la situation du candidat (étudiant, salarié, autre) et la présence ou non d'un garant (physique ou garantie Visale).
- **Sécurité et simplicité** : Téléversement direct des pièces requises (pièce d'identité, justificatif de domicile, justificatifs de ressources, avis d'imposition, etc.).

### 🏢 Côté Propriétaire (Tableau de Bord)
- **Gestion des biens immobiliers** : Ajout, modification et suppression de propriétés avec génération automatique de slugs pour les URL de candidature. Un bouton d'édition permet de modifier les détails du bien (titre, loyer, garant, etc.) directement depuis le tableau de bord.
- **Contrôle des formulaires** : Activation/désactivation en un clic des formulaires publics, et configuration des exigences en matière de garants (optionnel, obligatoire, ou sans garant).
- **Stockage structuré sur Google Drive** : Organisation automatique des fichiers dans votre Drive :
  ```text
  [Dossier Parent Google Drive]
    └── 📂 [Nom de la Propriété]
         └── 📂 [Candidat - Prénom Nom]
              ├── 📄 ID_tenant.pdf
              ├── 📄 Income_proof_1.pdf
              └── ...
  ```
- **Gestion des candidatures** : Suivi du statut des dossiers (*En attente*, *Accepté*, *Refusé*) avec liens directs vers les documents sur Google Drive. Il est possible de **supprimer une candidature**, ce qui efface ses données et supprime automatiquement tous les fichiers correspondants de Google Drive.
- **Nettoyage automatique (Cascade Delete)** : La suppression d'un bien supprime automatiquement sa configuration, ses candidatures en base de données, et **tous les fichiers/dossiers correspondants sur Google Drive**.


---

## 🛠️ Pile Technique

- **Framework** : [Next.js 16 (App Router)](https://nextjs.org/) & React 19
- **Base de données** : [Supabase (PostgreSQL)](https://supabase.com/)
- **Authentification** : [Better-Auth](https://www.better-auth.com/) (avec fournisseur de clés d'accès)
- **Stockage** : [Google Drive API](https://developers.google.com/drive) (via la bibliothèque officielle `googleapis`)
- **Design & UI** : Vanilla CSS moderne avec variables de style CSS et icônes [Lucide React](https://lucide.dev/)

---

## 🚀 Installation et Configuration Locale

### 1. Prérequis
Assurez-vous d'avoir installé [Node.js](https://nodejs.org/) (v18+) et d'avoir un compte [Supabase](https://supabase.com/) et une console [Google Cloud](https://console.cloud.google.com/).

### 2. Cloner le projet
```bash
git clone <url-du-depot>
cd DossierLocationFacile
npm install
```

### 3. Configuration de la Base de Données
1. Créez un nouveau projet sur **Supabase**.
2. Allez dans le **SQL Editor** de Supabase.
3. Copiez le contenu du fichier [supabase_schema.sql](file:///c:/Users/CSFL2120/dev/DossierLocationFacile/supabase_schema.sql) et exécutez-le pour créer les tables et configurer les index et les permissions.

### 4. Configuration des Variables d'Environnement
Copiez le fichier d'exemple `.env.example` pour créer votre fichier `.env.local` :
```bash
cp .env.example .env.local
```

Remplissez les variables d'environnement suivantes dans `.env.local` :

| Variable | Description | Exemple |
| :--- | :--- | :--- |
| `BETTER_AUTH_SECRET` | Clé secrète de sécurité pour Better-Auth (min. 32 caractères) | *Générez une clé aléatoire* |
| `BETTER_AUTH_URL` | URL de base de votre application | `http://localhost:3000` |
| `DATABASE_URL` | URL de connexion PostgreSQL (à récupérer sur Supabase) | `postgresql://postgres:[password]@db...` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de votre projet Supabase | `https://[project-id].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme publique de votre projet Supabase | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé de rôle de service (Service Role Key) de Supabase | `eyJhbGciOi...` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | E-mail du compte de service Google Cloud | `uploader-service-account@...` |
| `GOOGLE_PRIVATE_KEY` | Clé privée associée au compte de service | `"-----BEGIN PRIVATE KEY-----\nMIIEvg...-----END..."` |
| `GOOGLE_DRIVE_FOLDER_ID` | Identifiant du dossier parent sur votre Google Drive | `1a2b3c4d5e6f...` |

> 💡 **Alternative d'authentification Google** : Vous pouvez aussi configurer l'authentification via Refresh Token OAuth2 en renseignant `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` à la place du Compte de Service Google.

---

## 🔑 Création d'un Compte Propriétaire

Puisque l'application est destinée à un usage privé, il n'y a pas de formulaire d'inscription public. Pour créer votre premier compte propriétaire (administrateur), exécutez le script CLI fourni :

```bash
npm run create-admin
```

Ce script interactif vous demandera :
1. L'adresse e-mail de l'administrateur.
2. Le mot de passe associé.
3. Le nom d'affichage (optionnel, par défaut "Administrateur").

*Vous pouvez également utiliser ce script pour réinitialiser le mot de passe d'un compte existant.*

---

## 💻 Lancer l'Application

### En Mode Développement
```bash
npm run dev
```
Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### En Mode Production
```bash
npm run build
npm start
```

---

## 🔒 Sécurité et Confidentialité
- **Accès restreint** : L'accès au tableau de bord des propriétaires est protégé par Better-Auth et nécessite d'être authentifié.
- **Accès aux dossiers locataires** : Les pièces justificatives téléversées sur Google Drive sont configurées avec le rôle `reader` pour `anyone` (non répertoriées sur les moteurs de recherche Google), permettant au propriétaire de les consulter facilement depuis son tableau de bord sans configuration complexe de droits.
- **Suppression propre des données** : Grâce à la suppression en cascade, aucune donnée orpheline n'est conservée sur Supabase ou sur Google Drive lors de la suppression d'un bien immobilier.
