import { MongoClient } from "mongodb";

const uri = "mongodb+srv://daigo:etecjau@arvoredo.7phyefy.mongodb.net/Arvoredo?retryWrites=true&w=majority&appName=Arvoredo";

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("✅ Conectado ao MongoDB!");
    const db = client.db("Arvoredo");
    console.log("Databases:", await db.admin().listDatabases());
  } catch (err) {
    console.error("❌ Erro ao conectar:", err);
  } finally {
    await client.close();
  }
}

run();
