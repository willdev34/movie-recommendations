// Conexao com o ChromaDB (que roda no Docker, porta 8000).
import { ChromaClient } from 'chromadb';

const client = new ChromaClient({ host: 'localhost', port: 8000 });

// Pergunta ao ChromaDB "voce esta ai?". Retorna um numero se estiver vivo
// e lanca erro se o container nao estiver rodando.
export async function pingChroma() {
    return client.heartbeat();
}

// Devolve uma colecao vazia com esse nome (colecao e como uma "tabela" de vetores).
// Se ja existir, apaga e cria de novo, assim rodar o script duas vezes nao duplica nada.
// Usa distancia por cosseno: mede o angulo entre vetores, ou seja, o quanto
// duas pessoas gostam das mesmas COISAS, sem depender da intensidade dos numeros.
// embeddingFunction: null porque os vetores sao nossos, o Chroma nao precisa gerar.
export async function resetCollection(name) {
    try {
        await client.deleteCollection({ name });
    } catch {
        // nao existia ainda, tudo bem
    }
    return client.createCollection({
        name,
        embeddingFunction: null,
        configuration: { hnsw: { space: 'cosine' } }
    });
}

// Abre uma colecao que ja existe (criada pelo npm run index-vectors).
export async function openCollection(name) {
    return client.getOrCreateCollection({ name, embeddingFunction: null });
}
