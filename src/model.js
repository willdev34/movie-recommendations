// Define e treina a rede neural.
// Recebe o `tf` como parametro para funcionar tanto no browser quanto no Node.

// Monta a rede: entrada -> 64 neuronios -> 32 neuronios -> 1 saida (0 a 1).
// A saida e a chance de o usuario gostar do filme.
export function createModel(tf, inputDimension) {
    const model = tf.sequential();

    // Primeira camada precisa saber o tamanho da entrada (inputShape)
    model.add(tf.layers.dense({ inputShape: [inputDimension], units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    // Sigmoid comprime o resultado para o intervalo 0 a 1
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy', // erro para respostas do tipo sim/nao
        metrics: ['accuracy']
    });

    return model;
}

// Treina a rede. 20% dos exemplos ficam de fora (validacao) para medir
// se ela aprendeu de verdade ou so decorou os exemplos de treino.
// onEpochEnd e chamado ao fim de cada epoca com as metricas.
export async function trainModel(tf, trainData, onEpochEnd) {
    const model = createModel(tf, trainData.inputDimension);
    const xs = tf.tensor2d(trainData.inputs);
    const ys = tf.tensor2d(trainData.labels, [trainData.labels.length, 1]);

    await model.fit(xs, ys, {
        epochs: 20,
        batchSize: 64,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => onEpochEnd({
                epoch: epoch + 1,
                loss: logs.loss,
                accuracy: logs.acc ?? logs.accuracy,
                valLoss: logs.val_loss,
                valAccuracy: logs.val_acc ?? logs.val_accuracy
            })
        }
    });

    xs.dispose();
    ys.dispose();
    return model;
}
