// Controla a tela: botao de treinar e area de log.
const button = document.querySelector('#train');
const log = document.querySelector('#log');

// Escreve uma linha na area de log
function write(text) {
    log.textContent += text + '\n';
}

// Cria o worker e mostra na tela cada mensagem que ele envia
function train() {
    log.textContent = '';
    button.disabled = true;
    const worker = new Worker(new URL('./workers/trainingWorker.js', import.meta.url), { type: 'module' });

    worker.onmessage = ({ data }) => {
        if (data.type === 'start') {
            write(`Exemplos: ${data.examples} | Entrada: ${data.inputDimension} numeros`);
            write(`Base de comparacao: chutar sempre "gostou" acerta ${(data.likedRate * 100).toFixed(1)}%\n`);
        }
        if (data.type === 'epoch') {
            write(`Epoca ${data.epoch}: erro ${data.loss.toFixed(3)} | acerto ${(data.accuracy * 100).toFixed(1)}% | acerto validacao ${(data.valAccuracy * 100).toFixed(1)}%`);
        }
        if (data.type === 'done') { write('\nTreino concluido.'); button.disabled = false; }
        if (data.type === 'error') { write('Erro: ' + data.message); button.disabled = false; }
    };

    worker.postMessage({ action: 'train' });
}

button.addEventListener('click', train);
