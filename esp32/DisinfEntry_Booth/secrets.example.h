// Copy this file to secrets.h (same folder) and fill in your own values.
// secrets.h is git-ignored; this example is the only one that is committed.

// The FIRST WiFi the booth uses. To change WiFi later you do not need to re-upload:
// when the booth cannot connect for ~45 s it opens its own network "DisinfEntry-Setup".
// Join it from a phone, the setup page opens (or go to http://192.168.4.1), pick the new
// WiFi and enter its password. It is saved on the booth and replaces these two values.
const char* WIFI_SSID       = "your-wifi-name";
const char* WIFI_PASSWORD   = "your-wifi-password";

// Password of the "DisinfEntry-Setup" network (8+ characters). The default is
// "disinfentry"; set your own so people near the booth cannot change its WiFi.
// #define WIFI_SETUP_AP_PASSWORD "choose-a-password"

// --- Local XAMPP server (used when SERVER_URL_VALUE below is NOT defined) ---
// Windows computer name of the XAMPP machine, WITHOUT ".local" (run `hostname` in cmd).
const char* SERVER_HOSTNAME = "YOUR-PC-NAME";

// Must match System Settings -> Booth API Access. Generate a new one there; never
// keep the shipped default.
const char* API_KEY         = "paste-the-key-from-system-settings";

// --- Railway / hosted server ---
// To report to a deployed site instead of a local XAMPP machine, uncomment and fill in
// your address: https, no trailing slash, no project folder. The booth then talks to it
// over TLS and does not search the local network.
// #define SERVER_URL_VALUE "https://your-app.up.railway.app"

// --- Report to the local XAMPP server TOO ---
// With the hosted address above set, uncomment this to ALSO send everything to the local
// XAMPP server (found by SERVER_HOSTNAME). Each server has its own retry queue, so one being
// down never loses data for the other. Settings (threshold, spray times) come from the
// hosted server. If the local server uses a different API key, define it too:
// #define ALSO_LOCAL_SERVER
// #define LOCAL_API_KEY_VALUE "the-local-servers-key"
