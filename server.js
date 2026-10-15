const express = require("express");
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

let ultimaLocalizacao = null;

// Página principal com o mapa e os alertas
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">

      <title>Sistema de Rastreamento Escolar</title>

      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      >

      <style>
        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background: #f2f5f9;
        }

        header {
          padding: 18px;
          background: #17365d;
          color: white;
        }

        h2 {
          margin: 0 0 10px;
          font-size: 20px;
        }

        #estado {
          font-size: 14px;
          line-height: 1.5;
        }

        #alerta {
          display: none;
          background: #d1fae5;
          color: #065f46;
          padding: 12px;
          margin-top: 10px;
          border-radius: 6px;
          font-weight: bold;
        }

        #mapa {
          height: calc(100vh - 145px);
          min-height: 350px;
          width: 100%;
        }
      </style>
    </head>

    <body>
      <header>
        <h2>Sistema de Rastreamento de Transporte Escolar</h2>

        <div id="estado">
          A procurar a última localização...
        </div>

        <div id="alerta" role="status" aria-live="polite"></div>
      </header>

      <div id="mapa"></div>

      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

      <script>
        const mapa = L.map("mapa").setView(
          [-25.9692, 32.5732],
          13
        );

        L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
          }
        ).addTo(mapa);

        let marcador = null;
        let ultimaDataConhecida = null;
        let primeiraConsulta = true;
        let temporizadorAlerta = null;

        // Mostrar o alerta durante seis segundos
        function mostrarAlerta(mensagem) {
          const alerta = document.getElementById("alerta");

          alerta.textContent = mensagem;
          alerta.style.display = "block";

          if (temporizadorAlerta !== null) {
            clearTimeout(temporizadorAlerta);
          }

          temporizadorAlerta = setTimeout(() => {
            alerta.style.display = "none";
          }, 6000);
        }

        // Consultar a localização recebida pelo servidor
        async function atualizarLocalizacao() {
          const estado = document.getElementById("estado");

          try {
            const resposta = await fetch(
              "/api/localizacao",
              { cache: "no-store" }
            );

            if (!resposta.ok) {
              throw new Error("Erro ao consultar o servidor");
            }

            const dados = await resposta.json();

            if (
              !dados ||
              typeof dados.latitude !== "number" ||
              typeof dados.longitude !== "number"
            ) {
              estado.textContent =
                "Ainda não foram recebidas coordenadas.";

              primeiraConsulta = false;
              return;
            }

            // Detectar quando chega uma nova localização
            if (primeiraConsulta) {
              // Não alertar pela localização que já existia
              // quando a página foi aberta.
              ultimaDataConhecida = dados.data || null;
              primeiraConsulta = false;

            } else if (
              dados.data &&
              dados.data !== ultimaDataConhecida
            ) {
              ultimaDataConhecida = dados.data;

              mostrarAlerta("Nova localização recebida!");
            }

            // Actualizar a posição do marcador no mapa
            const posicao = [
              dados.latitude,
              dados.longitude
            ];

            if (marcador === null) {
              marcador = L.marker(posicao)
                .addTo(mapa)
                .bindPopup("Última localização recebida");
            } else {
              marcador.setLatLng(posicao);
            }

            const dataRegisto = dados.data
              ? new Date(dados.data).toLocaleString()
              : "Não disponível";

            estado.textContent =
              "Latitude: " + dados.latitude +
              " | Longitude: " + dados.longitude +
              " | Última actualização: " + dataRegisto;

            mapa.setView(posicao, 15);

          } catch (erro) {
            estado.textContent =
              "Não foi possível consultar a localização. " +
              "A tentar novamente...";
          }
        }

        // Primeira consulta
        atualizarLocalizacao();

        // Verificar se chegaram novas coordenadas a cada 10 segundos
        setInterval(atualizarLocalizacao, 10000);
      </script>
    </body>
    </html>
  `);
});

// Receber localização do ESP32
app.post("/api/localizacao", (req, res) => {
  const { latitude, longitude } = req.body;

  // Validar as coordenadas recebidas
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

  // Guardar a última localização recebida
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

// Consultar a última localização
app.get("/api/localizacao", (req, res) => {
  res.json(ultimaLocalizacao);
});

// Iniciar servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor activo na porta ${PORT}`);
});
