const express = require("express");
const { default: makeWASocket, useSingleFileAuthState } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode-terminal");
const app = express();
const port = process.env.PORT || 3000;

const { state, saveState } = useSingleFileAuthState("./auth.json");

app.use(express.json());

let sock;

async function connectToWhatsApp() {
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveState);
  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    }
  });
}

connectToWhatsApp();

app.post("/send", async (req, res) => {
  const { phone, message } = req.body;

  if (!sock) return res.status(500).send({ error: "WhatsApp not connected" });

  try {
    await sock.sendMessage(phone + "@s.whatsapp.net", { text: message });
    res.send({ success: true, to: phone, message });
  } catch (err) {
    res.status(500).send({ error: err.toString() });
  }
});

app.get("/", (req, res) => res.send("WhatsApp Gateway Ready"));

app.listen(port, () => console.log(`WA Gateway running on port ${port}`));
