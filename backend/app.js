import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import routes from "./routes/index.js";
import cors from "cors";

const app = express();

app.use(express.json());

// TODO: revisar isso aqui depois, configurar direito
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Origin", "Content-Type", "Accept", "Authorization", "X-Request-With"],
  })
);

app.use("/api", routes);

const PORT = process.env.PORT || 5555;

if (!process.env.DB_URI) {
  console.log("Sem URI de conexão ao MongoDB no .env");
  process.exit(1)
}

if (!process.env.SECRET_JWT) {
  console.log("Sem SECRET_JWT no .env");
  process.exit(1);
}

if (!process.env.BREVO_API_KEY || !process.env.BREVO_NAME || !process.env.BREVO_EMAIL) {
  console.log("Segredos do Brevo não configurados corretamente no .env. Envio de email não irá funcionar.")
}

if (!process.env.OPENINARY_URL || !process.env.OPENINARY_API_KEY) {
  console.log("Sem OPENINARY_URL ou OPENINARY_API_KEY no .env");
  process.exit(1);
}

mongoose
  .connect(process.env.DB_URI)
  .then(() => {
    console.log("Conectado ao MongoDB com sucesso");
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((error) => {
    console.log(`Não foi possivel conectar ao banco de dados: ${error}`);
  });
