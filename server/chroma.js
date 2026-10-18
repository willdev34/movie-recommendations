// Conexao com o ChromaDB (que roda no Docker, porta 8000).
import { ChromaClient } from 'chromadb';

const client = new ChromaClient({ host: 'localhost', port: 8000 });

// Pergunta ao ChromaDB "voce esta ai?". Retorna um numero se estiver vivo
// e lanca erro se o container nao estiver rodando.
export async function pingChroma() {
    return client.heartbeat();
}
