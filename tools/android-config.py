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

# Play services and Firebase expect Android 6 or newer.
v = pathlib.Path('android/variables.gradle')
t = v.read_text()
if 'minSdkVersion = 22' in t:
    t = t.replace('minSdkVersion = 22', 'minSdkVersion = 23')
    print('minSdkVersion raised to 23.')
# The sign-in plugin leaves Google's sign-in library out of the app unless this is set,
# which otherwise makes the app crash on launch with a missing GoogleSignIn class.
if 'rgcfaIncludeGoogle' not in t:
    t = t.replace('ext {', 'ext {\n    rgcfaIncludeGoogle = true', 1)
    print('Google sign-in library will be packaged.')
v.write_text(t)

# If anything fails while the app starts, show the reason on screen instead of
# closing silently, so a crash on someone else's phone can be read and fixed.
main = pathlib.Path('android/app/src/main/java/in/mikomi/jlpt/MainActivity.java')
if main.exists():
    main.write_text('''package in.mikomi.jlpt;

import android.os.Bundle;
import android.widget.ScrollView;
import android.widget.TextView;
import com.getcapacitor.BridgeActivity;
import java.io.PrintWriter;
import java.io.StringWriter;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        try {
            super.onCreate(savedInstanceState);
        } catch (Throwable error) {
            StringWriter writer = new StringWriter();
            error.printStackTrace(new PrintWriter(writer));
            try {
                TextView view = new TextView(this);
                view.setText("Mikomi could not start.\\n\\n" + writer.toString());
                view.setTextIsSelectable(true);
                view.setPadding(40, 60, 40, 40);
                view.setTextSize(11);
                ScrollView scroll = new ScrollView(this);
                scroll.addView(view);
                setContentView(scroll);
            } catch (Throwable ignored) {
                throw error;
            }
        }
    }
}
''')
    print('Startup error screen installed.')

app.write_text(s)
