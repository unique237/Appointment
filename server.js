require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const speakeasy = require("speakeasy");
const twilio = require("twilio");
const schedule = require("node-schedule");

require("dotenv").config(); // Assurez-vous d'avoir un fichier .env avec vos identifiants Twilio

const app = express();

// Initialisation du client Twilio
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Stockage en mémoire pour les utilisateurs et les rendez-vous
const users = {}; // { téléphone: { secret, otpVerified: false } }
const appointments = []; // [{ téléphone, date, message }]

// Fonction pour générer un jeton d'accès Twilio Client
const generateAccessToken = (identity) => {
  const { AccessToken } = twilio.jwt;
  const VoiceGrant = AccessToken.VoiceGrant;

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET
  );

  token.identity = identity;

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWIML_APP_SID,
    incomingAllow: true,
  });

  token.addGrant(voiceGrant);
  return token.toJwt();
};

// Endpoint pour enregistrer un utilisateur et envoyer un OTP
app.post("/register", (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Le numéro de téléphone est requis" });
  }

  const secret = speakeasy.generateSecret({ length: 20 }).base32;
  users[phone] = { secret, otpVerified: false };

  const otp = speakeasy.totp({ secret, encoding: "base32" });
  twilioClient.messages.create({
    body: `Votre code OTP est : ${otp}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });

  return res.json({ message: "OTP envoyé avec succès" });
});

// Endpoint pour vérifier l'OTP
app.post("/verify", (req, res) => {
  const { phone, otp } = req.body;

  if (!users[phone]) {
    return res.status(404).json({ error: "Utilisateur non trouvé" });
  }

  const isValid = speakeasy.totp.verify({
    secret: users[phone].secret,
    encoding: "base32",
    token: otp,
    window: 1,
  });

  if (!isValid) {
    return res.status(400).json({ error: "OTP invalide" });
  }

  users[phone].otpVerified = true;
  return res.json({ message: "OTP vérifié avec succès" });
});

// Endpoint pour générer un jeton Twilio Client
app.get("/token", (req, res) => {
  const { phone } = req.query;

  if (!users[phone] || !users[phone].otpVerified) {
    return res.status(403).json({ error: "Utilisateur non vérifié" });
  }

  const token = generateAccessToken(phone);
  return res.json({ token });
});

// Stockage temporaire des rappels planifiés
const reminders = [];

// Liste des messages par défaut en fonction du délai
const defaultMessages = {
  2: "Rappel : Votre réunion commence dans 2 minutes.",
  5: "Rappel : Votre réunion commence dans 5 minutes.",
  7: "Rappel : Votre réunion commence dans 7 minutes.",
};

// Planifier un rappel
// Planifier un rappel
app.post("/schedule", (req, res) => {
  const { phone, date, reminderTime } = req.body;

  if (!phone || !date || !reminderTime) {
    return res.status(400).json({ message: "Tous les champs sont requis." });
  }

  // Vérification du message par défaut en fonction du délai choisi
  const message = defaultMessages[reminderTime];
  if (!message) {
    return res
      .status(400)
      .json({
        message: "Délai de rappel invalide. Choisissez 2, 5 ou 7 minutes.",
      });
  }

  // Calcul de la date du rappel en fonction du délai choisi
  const reminderDate = new Date(date);
  reminderDate.setMinutes(reminderDate.getMinutes() - reminderTime); // Soustraire le délai du temps de la réunion
  const reminder = {
    phone,
    reminderTime,
    date: reminderDate,
    message,
    status: "Planned",
  };
  reminders.push(reminder);

  // Programmer l'envoi du SMS
  const job = schedule.scheduleJob(reminderDate, async () => {
    try {
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });

      // Mise à jour du statut du rappel
      reminder.status = "Sent";
      console.log(`Rappel envoyé à ${phone}`);
    } catch (error) {
      console.error("Erreur lors de l'envoi du SMS :", error);
      reminder.status = "Failed";
    }
  });

  res.status(200).json({ message: "Rappel planifié avec succès." });
});

// Obtenir tous les rappels
app.get("/reminders", (req, res) => {
  res.json(reminders);
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});
