// Roda treino e recomendacao em segundo plano (Web Worker) para a tela nao travar.
import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { makeContext, encodeMovie, buildUserProfile, createTrainingData } from '../encoding.js';
import { trainModel } from '../model.js';
import { scoreCandidates, topLikedMovies } from '../recommend.js';

// Guarda tudo em memoria depois do treino, para a recomendacao reaproveitar
const state = { model: null, movies: [], users: [], context: null, movieVectors: null };

// Carrega os dados, codifica, treina e vai avisando a tela do progresso.
async function startTraining() {
    // CPU para evitar o erro de shader do WebGL que apareceu antes
    await tf.setBackend('cpu');
    await tf.ready();

    state.movies = await (await fetch('/data/movies.json')).json();
    state.users = await (await fetch('/data/users.json')).json();
    state.context = makeContext(state.movies);
    state.movieVectors = new Map(state.movies.map(m => [m.id, encodeMovie(m, state.context)]));

    const trainData = createTrainingData(state.movies, state.users, state.context);
    const likedRate = trainData.labels.filter(l => l === 1).length / trainData.labels.length;

    postMessage({
        type: 'start',
        examples: trainData.labels.length,
        inputDimension: trainData.inputDimension,
        likedRate
    });

    state.model = await trainModel(tf, trainData, metrics => postMessage({ type: 'epoch', ...metrics }));
    postMessage({ type: 'done' });
}

// Recebe os candidatos escolhidos pelo servidor, pontua com a rede
// e devolve os 10 melhores junto com os filmes favoritos do usuario.
function recommend({ userId, candidates }) {
    const user = state.users.find(u => u.id === userId);
    const movieById = new Map(state.movies.map(m => [m.id, m]));
    const profile = buildUserProfile(user, state.movieVectors, state.context);

    const items = scoreCandidates(tf, state.model, profile, candidates, state.movieVectors)
        .slice(0, 10)
        .map(item => ({ ...movieById.get(item.movieId), score: item.score, votes: item.votes }));

    postMessage({
        type: 'recommendations',
        userId,
        liked: topLikedMovies(user, movieById),
        items
    });
}

// Escuta mensagens da tela e chama a funcao certa para cada acao.
self.onmessage = event => {
    const { action, ...data } = event.data;
    const handlers = { train: startTraining, recommend };
    if (!handlers[action]) return;
    Promise.resolve(handlers[action](data))
        .catch(error => postMessage({ type: 'error', message: error.message }));
};
