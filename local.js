import app from "./server.js";

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor local em http://localhost:${PORT}`));