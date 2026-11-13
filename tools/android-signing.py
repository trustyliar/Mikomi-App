# Makes the test APK use Mikomi's fixed signing key, so its SHA-1 fingerprint
# (registered in Firebase for Google sign-in) stays the same on every build.
import pathlib, sys
p = pathlib.Path('android/app/build.gradle'); s = p.read_text()
if 'signingConfigs' in s: sys.exit('build.gradle already has signingConfigs; nothing changed.')
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
p.write_text(s[:i] + block + s[i:])
print('Signing config added.')
