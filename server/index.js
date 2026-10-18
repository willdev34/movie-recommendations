// Servidor Node que fica entre a pagina e o ChromaDB.
// O browser nao fala direto com o banco: ele chama este servidor.
import { readFileSync } from 'node:fs';
import express from 'express';
import cors from 'cors';
import { pingChroma, openCollection } from './chroma.js';
import { makeContext, encodeMovie, buildUserProfile } from '../src/encoding.js';
import { findCandidates } from './candidates.js';

const app = express();
const PORT = 3001; // a pagina usa 3000, o servidor usa 3001

// Dados carregados uma vez na inicializacao
const movies = JSON.parse(readFileSync('data/movies.json', 'utf-8'));
const users = JSON.parse(readFileSync('data/users.json', 'utf-8'));
const usersById = new Map(users.map(u => [u.id, u]));
const context = makeContext(movies);
const movieVectors = new Map(movies.map(m => [m.id, encodeMovie(m, context)]));

app.use(cors());         // permite a pagina (porta 3000) chamar o servidor (porta 3001)
app.use(express.json({ limit: '50mb' }));

// Rota de teste: responde se o servidor e o ChromaDB estao funcionando.
app.get('/health', async (req, res) => {
    try {
        await pingChroma();
        res.json({ server: 'ok', chroma: 'ok' });
    } catch (error) {
        res.status(503).json({ server: 'ok', chroma: 'fora do ar', detail: error.message });
    }
});

// Devolve os filmes candidatos para um usuario:
// 1) calcula o perfil dele, 2) pede ao ChromaDB os usuarios mais parecidos,
// 3) junta os filmes que esses vizinhos curtiram e ele ainda nao viu.
// Quem pontua e ordena esses candidatos e a rede neural, la no browser.
app.get('/candidates/:userId', async (req, res) => {
    const user = usersById.get(Number(req.params.userId));
    if (!user) return res.status(404).json({ error: 'usuario nao encontrado' });

    const limit = Number(req.query.neighbors) || 100;
    try {
        const profile = buildUserProfile(user, movieVectors, context);
        const collection = await openCollection('users');
        // pede um a mais porque o proprio usuario vem em primeiro lugar
        const result = await collection.query({ queryEmbeddings: [profile], nResults: limit + 1 });
        const neighborIds = result.ids[0].filter(id => id !== String(user.id)).slice(0, limit);

        res.json({
            neighbors: neighborIds.length,
            candidates: findCandidates(user, neighborIds, usersById)
        });
    } catch (error) {
        res.status(503).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`Servidor em http://localhost:${PORT}`));
