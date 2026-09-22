#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ============================================================
// AtisouShield — exemple de protocole ESP32
// Aucun capteur n'est simulé. Les conversions pH/EC doivent être
// calibrées pour le matériel réellement installé.
// ============================================================

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL = "https://YOUR-ATISOUSHIELD-DOMAIN/api/iot";

const char* DEVICE_ID = "ESP32-ATISOU-001";
const char* TANK_ID = "BAC-REPLACE-WITH-NEON-ID";
const char* DEVICE_TOKEN = "REPLACE_WITH_DEVICE_TOKEN";

constexpr uint32_t SEND_INTERVAL_MS = 60000;

// Broches à adapter au câblage réel.
constexpr int PH_PIN = 34;
constexpr int EC_PIN = 35;
constexpr int WATER_LEVEL_PIN = 32;
constexpr int DHT_PIN = 4;
constexpr int ONE_WIRE_PIN = 5;

#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);
OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature waterTemperatureSensor(&oneWire);

bool readPH(float& value) {
  // Calibration obligatoire selon la sonde/carte pH utilisée.
  // Retourne false plutôt que d'inventer une valeur.
  (void)value;
  (void)PH_PIN;
  return false;
}

bool readEC(float& value) {
  // Calibration obligatoire selon le module EC utilisé.
  // Retourne false plutôt que d'inventer une valeur.
  (void)value;
  (void)EC_PIN;
  return false;
}

bool readWaterLevel(float& value) {
  // Calibration obligatoire selon le capteur de niveau utilisé.
  (void)value;
  (void)WATER_LEVEL_PIN;
  return false;
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  const uint32_t deadline = millis() + 20000;
  while (WiFi.status() != WL_CONNECTED && millis() < deadline) {
    delay(250);
  }
}

bool sendReading() {
  if (WiFi.status() != WL_CONNECTED) return false;

  const float airTemperature = dht.readTemperature();
  const float humidity = dht.readHumidity();

  waterTemperatureSensor.requestTemperatures();
  const float waterTemperature = waterTemperatureSensor.getTempCByIndex(0);

  float ph = 0.0f;
  float ec = 0.0f;
  float waterLevel = 0.0f;

  const bool hasPH = readPH(ph);
  const bool hasEC = readEC(ec);
  const bool hasWaterLevel = readWaterLevel(waterLevel);
  const bool hasAirTemperature = !isnan(airTemperature);
  const bool hasHumidity = !isnan(humidity);
  const bool hasWaterTemperature = waterTemperature != DEVICE_DISCONNECTED_C;

  JsonDocument document;
  document["deviceId"] = DEVICE_ID;
  document["tankId"] = TANK_ID;
  document["timestamp"] = "SET_BY_DEVICE";

  if (hasPH) document["ph"] = ph; else document["ph"] = nullptr;
  if (hasEC) document["ec"] = ec; else document["ec"] = nullptr;
  if (hasWaterTemperature) document["waterTemperature"] = waterTemperature; else document["waterTemperature"] = nullptr;
  if (hasAirTemperature) document["airTemperature"] = airTemperature; else document["airTemperature"] = nullptr;
  if (hasHumidity) document["humidity"] = humidity; else document["humidity"] = nullptr;
  if (hasWaterLevel) document["waterLevel"] = waterLevel; else document["waterLevel"] = nullptr;
  document["dissolvedOxygen"] = nullptr;

  // L'API exige un timestamp ISO 8601. Remplacer cette fonction
  // par une horloge synchronisée NTP avant utilisation réelle.
  document["timestamp"] = "2026-09-22T17:00:00Z";

  String payload;
  serializeJson(document, payload);

  WiFiClientSecure client;
  // Prototype uniquement : installer et valider le certificat racine
  // de l'hôte en production au lieu de désactiver la vérification TLS.
  client.setInsecure();

  HTTPClient http;
  if (!http.begin(client, API_URL)) return false;
  http.addHeader("Content-Type", "application/json");
  if (DEVICE_TOKEN[0] != '\0' && String(DEVICE_TOKEN) != "REPLACE_WITH_DEVICE_TOKEN") {
    http.addHeader("x-atisou-device-token", DEVICE_TOKEN);
  }

  const int status = http.POST(payload);
  http.end();
  return status >= 200 && status < 300;
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  waterTemperatureSensor.begin();
  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  static uint32_t lastSend = 0;
  if (millis() - lastSend >= SEND_INTERVAL_MS || lastSend == 0) {
    lastSend = millis();
    sendReading();
  }

  delay(250);
}
