// Controla a tela: treinar, escolher usuario e mostrar recomendacoes.
const trainButton = document.querySelector('#train');
const recommendButton = document.querySelector('#recommend');
const userSelect = document.querySelector('#user');
const log = document.querySelector('#log');
const result = document.querySelector('#result');

// O worker e criado uma vez e guarda o modelo treinado em memoria
const worker = new Worker(new URL('./workers/trainingWorker.js', import.meta.url), { type: 'module' });

// Escreve uma linha na area de log do treino
function write(text) {
    log.textContent += text + '\n';
}

// Preenche a lista de usuarios com os ids do arquivo de dados
async function loadUsers() {
    const users = await (await fetch('/data/users.json')).json();
    userSelect.innerHTML = users
        .map(u => `<option value="${u.id}">Usuario ${u.id} (${u.ratings.length} avaliacoes)</option>`)
        .join('');
}

// Inicia o treino no worker
function train() {
    log.textContent = '';
    trainButton.disabled = true;
    worker.postMessage({ action: 'train' });
}

// Pede ao servidor os candidatos do usuario escolhido e manda para o worker pontuar
async function recommend() {
    const userId = Number(userSelect.value);
    result.textContent = 'Buscando usuarios parecidos no ChromaDB...';
    try {
        const response = await fetch(`http://localhost:3001/candidates/${userId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        result.dataset.neighbors = data.neighbors;
        worker.postMessage({ action: 'recommend', userId, candidates: data.candidates });
    } catch (error) {
        result.textContent = 'Erro: ' + error.message;
    }
}

// Formata um filme como uma linha de texto
function formatMovie(movie) {
    return `${movie.title} (${movie.year ?? '?'}) | ${movie.genres.join(', ')}`;
}

// Mostra na tela o que o worker devolveu
function showRecommendations({ liked, items }) {
    const lines = [`Vizinhos consultados: ${result.dataset.neighbors}`, '', 'Filmes que mais gostou:'];
    liked.forEach(movie => lines.push('  ' + formatMovie(movie)));
    lines.push('', 'Recomendados:');
    if (!items.length) lines.push('  nenhum candidato encontrado');
    items.forEach((item, i) => lines.push(
        `  ${i + 1}. ${formatMovie(item)}\n     chance de gostar ${(item.score * 100).toFixed(0)}% | ${item.votes} vizinhos curtiram`
    ));
    result.textContent = lines.join('\n');
}

// Trata cada mensagem que o worker envia
worker.onmessage = ({ data }) => {
    if (data.type === 'start') {
        write(`Exemplos: ${data.examples} | Entrada: ${data.inputDimension} numeros`);
        write(`Base de comparacao: chutar sempre "gostou" acerta ${(data.likedRate * 100).toFixed(1)}%\n`);
    }
    if (data.type === 'epoch') {
        write(`Epoca ${data.epoch}: erro ${data.loss.toFixed(3)} | acerto ${(data.accuracy * 100).toFixed(1)}% | acerto validacao ${(data.valAccuracy * 100).toFixed(1)}%`);
    }
    if (data.type === 'done') {
        write('\nTreino concluido.');
        trainButton.disabled = false;
        recommendButton.disabled = false;
    }
    if (data.type === 'recommendations') showRecommendations(data);
    if (data.type === 'error') {
        write('Erro: ' + data.message);
        trainButton.disabled = false;
    }
};

trainButton.addEventListener('click', train);
recommendButton.addEventListener('click', recommend);
loadUsers();
