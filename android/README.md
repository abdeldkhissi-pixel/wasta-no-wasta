# Projet Mobile Android - Wasta No (Maroc)

Ce dossier `android/` contient l'ensemble de la structure native Android pour générer le fichier **APK** (`.apk`) ou le paquet d'application Android pour votre téléphone.

## 📱 Informations de l'application
- **Nom de l'application :** Wasta No
- **Package ID :** `ma.wastano.app`
- **Slogan :** Le bon service. La bonne personne.
- **Région :** Fès & Meknès, Maroc

---

## 🚀 Méthode 1 : Installer instantanément sur votre téléphone (Sans compiler d'APK)
Vous n'avez pas besoin d'installer Android Studio ni de brancher votre téléphone par câble :
1. Sur votre smartphone Android, ouvrez **Google Chrome** (ou votre navigateur habituel).
2. Ouvrez l'adresse de votre application Wasta No :
   `https://ais-pre-7dvkn4hcttfaeluqsmaass-259511614157.europe-west1.run.app`
3. Un bouton **« Installer sur Téléphone »** apparaît directement dans l'application.
4. Ou appuyez sur les **trois petits points (⋮)** en haut à droite de Google Chrome, puis sélectionnez **« Installer l'application »** (ou *« Ajouter à l'écran d'accueil »*).
5. Android génère automatiquement un **WebAPK natif**, avec le logo Wasta No sur votre écran d'accueil, sans barre d'adresse, exactement comme une application téléchargée sur le Play Store !

---

## 🛠️ Méthode 2 : Générer le fichier APK (.apk) avec Android Studio
Si vous souhaitez un fichier `.apk` physique installable :

1. **Ouvrir le projet :**
   - Téléchargez ce code ou clonez-le sur votre ordinateur.
   - Lancez **Android Studio**.
   - Cliquez sur **Open an existing project** et sélectionnez ce dossier `android/`.

2. **Générer le fichier APK :**
   - Dans la barre de menu supérieure, cliquez sur **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - Android Studio compile l'application et génère le fichier :
     `android/app/build/outputs/apk/debug/app-debug.apk`

3. **Installer sur votre téléphone :**
   - Transférez le fichier `app-debug.apk` sur votre téléphone (via WhatsApp, Google Drive, câble USB ou email).
   - Touchez le fichier `.apk` sur votre téléphone pour lancer l'installation.
   - Si votre téléphone demande l'autorisation d'installer des applications de sources inconnues, activez l'autorisation.
