# Prepares the generated Android project before it is built:
#  - signs it with Mikomi's fixed key, so the fingerprint Firebase knows never changes
#  - wires in Firebase when android-config/google-services.json has been supplied
import pathlib

app = pathlib.Path('android/app/build.gradle')
s = app.read_text()

if pathlib.Path('android/app/mikomi-debug.p12').exists() and 'signingConfigs' not in s:
    block = """
    signingConfigs {
        debug {
            storeFile file('mikomi-debug.p12')
            storeType 'pkcs12'
            storePassword 'mikomi123'
            keyAlias 'mikomi'
            keyPassword 'mikomi123'
        }
    }
"""
    i = s.index('android {') + len('android {')
    s = s[:i] + block + s[i:]
    print('Fixed signing key in use.')

if pathlib.Path('android/app/google-services.json').exists():
    root = pathlib.Path('android/build.gradle')
    r = root.read_text()
    if 'com.google.gms:google-services' not in r:
        root.write_text(r.replace('dependencies {', "dependencies {\n        classpath 'com.google.gms:google-services:4.4.2'", 1))
    if 'com.google.gms.google-services' not in s:
        s += "\napply plugin: 'com.google.gms.google-services'\n"
    print('Firebase wired in.')
else:
    print('No google-services.json supplied: this build has no Firebase, so sign-in will not work.')

app.write_text(s)
