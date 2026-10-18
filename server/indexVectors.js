// Calcula os vetores de filmes e usuarios e salva tudo no ChromaDB.
// Rodar uma vez (ou sempre que os dados mudarem): npm run index-vectors
import { readFileSync } from 'node:fs';
import { makeContext, encodeMovie, buildUserProfile } from '../src/encoding.js';
import { resetCollection } from './chroma.js';

// Le um arquivo JSON e devolve o conteudo ja convertido
function loadJson(path) {
    return JSON.parse(readFileSync(path, 'utf-8'));
}

// Salva os filmes no banco: cada um com seu vetor e dados para exibir depois.
// O Chroma so aceita valores simples nos metadados (sem listas), por isso
// os generos viram um texto separado por "|".
async function indexMovies(movies, movieVectors) {
    const collection = await resetCollection('movies');
    await collection.upsert({
        ids: movies.map(m => String(m.id)),
        embeddings: movies.map(m => movieVectors.get(m.id)),
        metadatas: movies.map(m => ({
            title: m.title,
            year: m.year ?? 0,
            genres: m.genres.join('|'),
            avgRating: m.avgRating
        }))
    });
    return collection;
}

// Salva os usuarios no banco: cada um com seu perfil (media dos filmes que gostou).
// Usuario sem nenhum filme curtido tem vetor zerado e e ignorado, porque
// a distancia por cosseno nao funciona com vetor zerado.
async function indexUsers(users, movieVectors, context) {
    const collection = await resetCollection('users');
    const profiles = users
        .map(user => ({ user, profile: buildUserProfile(user, movieVectors, context) }))
        .filter(({ profile }) => profile.some(value => value !== 0));

    await collection.upsert({
        ids: profiles.map(({ user }) => String(user.id)),
        embeddings: profiles.map(({ profile }) => profile),
        metadatas: profiles.map(({ user }) => ({ ratingsCount: user.ratings.length }))
    });
    return { collection, profiles };
}

// Teste de sanidade: busca os usuarios mais parecidos com o primeiro.
// O primeiro resultado tem que ser o proprio usuario, com distancia perto de 0.
async function checkSimilarity(collection, profiles) {
    const { user, profile } = profiles[0];
    const result = await collection.query({ queryEmbeddings: [profile], nResults: 4 });
    console.log(`\nUsuarios mais parecidos com o usuario ${user.id}:`);
    result.ids[0].forEach((id, i) => {
        console.log(`  usuario ${id} | distancia ${result.distances[0][i].toFixed(4)}`);
    });
}

// Executa tudo em ordem: carrega dados, calcula vetores, salva e confere.
async function main() {
    const movies = loadJson('data/movies.json');
    const users = loadJson('data/users.json');
    const context = makeContext(movies);
    const movieVectors = new Map(movies.map(m => [m.id, encodeMovie(m, context)]));

    const moviesCollection = await indexMovies(movies, movieVectors);
    const { collection: usersCollection, profiles } = await indexUsers(users, movieVectors, context);

    console.log(`Filmes salvos: ${await moviesCollection.count()}`);
    console.log(`Usuarios salvos: ${await usersCollection.count()}`);
    await checkSimilarity(usersCollection, profiles);
}

main().catch(error => {
    console.error('Falhou:', error.message);
    process.exit(1);
});
