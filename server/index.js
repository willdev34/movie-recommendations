// Servidor Node que fica entre a pagina e o ChromaDB.
// O browser nao fala direto com o banco: ele chama este servidor.
import express from 'express';
import cors from 'cors';
import { pingChroma } from './chroma.js';

const app = express();
const PORT = 3001; // a pagina usa 3000, o servidor usa 3001

app.use(cors());         // permite a pagina (porta 3000) chamar o servidor (porta 3001)
app.use(express.json({ limit: '50mb' })); // vetores em lote sao grandes

// Rota de teste: responde se o servidor e o ChromaDB estao funcionando.
app.get('/health', async (req, res) => {
    try {
        await pingChroma();
        res.json({ server: 'ok', chroma: 'ok' });
    } catch (error) {
        res.status(503).json({ server: 'ok', chroma: 'fora do ar', detail: error.message });
    }
});

app.listen(PORT, () => console.log(`Servidor em http://localhost:${PORT}`));
