# Protocole ESP32 → AtisouShield → Neon

## Flux

ESP32 → HTTPS POST /api/iot → Neon (iot_readings) → HydroponieIoT

## Contrat JSON

Le microcontrôleur envoie uniquement les mesures réellement disponibles :

```json
{
  "deviceId": "ESP32-ATISOU-001",
  "tankId": "BAC-...",
  "timestamp": "2026-09-22T17:00:00Z",
  "ph": 6.1,
  "ec": 1.8,
  "waterTemperature": 23.4,
  "airTemperature": 29.1,
  "humidity": 72.4,
  "waterLevel": 84.0,
  "dissolvedOxygen": null
}
```

Une valeur indisponible est envoyée comme `null`, jamais comme une valeur inventée.

## Transport

- Méthode : HTTPS POST
- URL : `https://<domaine-atisoushield>/api/iot`
- Content-Type : `application/json`
- En-tête optionnel de prototype : `x-atisou-device-token`
- Si `ATISOU_IOT_DEVICE_TOKEN` est configuré dans Vercel, le même secret doit être fourni par le dispositif.
- Le `deviceId` doit correspondre au `sensor_id` du bac lorsqu'un capteur est associé.

## Fréquence expérimentale

Le firmware d'exemple utilise une période configurable. La fréquence doit être choisie selon l'expérience et la capacité des capteurs, du réseau et de Neon. Aucun seuil agronomique n'est codé dans le firmware.

## Calibration

Les sondes pH et EC sont dépendantes de leur matériel. Le firmware n'applique pas de coefficient scientifique universel. Les fonctions de lecture retournent `null` tant que la calibration du dispositif n'a pas été renseignée.

## Sécurité

Pour un déploiement réel, utiliser un secret par dispositif ou une authentification IoT dédiée plutôt qu'un secret global. Le secret ne doit jamais être affiché dans l'interface web ni commité dans le dépôt.

## Décision scientifique

Le firmware ne commande pas le relais pour corriger automatiquement le pH, l'EC, le niveau d'eau ou une autre variable. Il mesure et transmet. L'analyse, l'alerte, la recommandation et la validation humaine restent séparées.
