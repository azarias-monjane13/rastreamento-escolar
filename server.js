const express = require("express");
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

let ultimaLocalizacao = null;

app.get("/", (req, res) => {
  res.send("Servidor de Rastreamento Escolar activo!");
});

app.post("/api/localizacao", (req, res) => {
  const { latitude, longitude } = req.body;

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return res.status(400).json({
      erro: "Coordenadas invalidas"
    });
  }

  ultimaLocalizacao = {
    latitude,
    longitude,
    data: new Date().toISOString()
  };

  console.log("Localizacao recebida:", ultimaLocalizacao);

  res.status(200).json({
    mensagem: "Localizacao recebida com sucesso",
    localizacao: ultimaLocalizacao
  });
});

app.get("/api/localizacao", (req, res) => {
  res.json(ultimaLocalizacao);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor activo na porta ${PORT}`);
});
