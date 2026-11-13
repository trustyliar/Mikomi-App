# Android build configuration

`google-services.json` connects the app to the Firebase project `mikomi-app-92f1c`.
The GitHub Actions build copies it into the generated Android project.

It is not a secret: a copy of it ships inside every Android app that uses Firebase.
What protects the data is the Firestore security rules, not this file.

Replace this file whenever the Firebase project changes — in particular after adding
the app's SHA-1 fingerprint, which is what makes Google sign-in work.
