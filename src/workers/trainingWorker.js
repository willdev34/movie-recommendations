// Roda o treino em segundo plano (Web Worker) para a tela nao travar.
import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { makeContext, createTrainingData } from '../encoding.js';
import { trainModel } from '../model.js';

// Carrega os dados, codifica, treina e vai avisando a tela do progresso.
async function startTraining() {
    // CPU para evitar o erro de shader do WebGL que apareceu antes
    await tf.setBackend('cpu');
    await tf.ready();

    const movies = await (await fetch('/data/movies.json')).json();
    const users = await (await fetch('/data/users.json')).json();

    const context = makeContext(movies);
    const trainData = createTrainingData(movies, users, context);
    const likedRate = trainData.labels.filter(l => l === 1).length / trainData.labels.length;

    postMessage({
        type: 'start',
        examples: trainData.labels.length,
        inputDimension: trainData.inputDimension,
        likedRate
    });

    await trainModel(tf, trainData, metrics => postMessage({ type: 'epoch', ...metrics }));

    postMessage({ type: 'done' });
}

// Escuta mensagens da tela. Quando chega 'train', inicia o treino.
self.onmessage = event => {
    if (event.data.action === 'train') {
        startTraining().catch(error => postMessage({ type: 'error', message: error.message }));
    }
};
