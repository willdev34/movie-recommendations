// Transforma filmes e usuarios em vetores numericos.
// A rede neural nao entende texto, so numeros entre 0 e 1.

// Quanto cada parte pesa no vetor do filme (ajustavel)
export const WEIGHTS = { genre: 1, year: 0.5, rating: 0.5 };

// Nota minima para considerar que o usuario GOSTOU do filme
export const LIKE_THRESHOLD = 4;

// Coloca um valor na escala 0 a 1.
// Formula: (valor - minimo) / (maximo - minimo)
function normalize(value, min, max) {
    return (value - min) / ((max - min) || 1);
}

// Descobre o que precisamos saber sobre o conjunto de filmes antes de codificar:
// lista de generos (e a posicao de cada um) e o menor/maior ano.
// Essa informacao e o "contexto" usado por todas as outras funcoes.
export function makeContext(movies) {
    const genres = [...new Set(movies.flatMap(m => m.genres))].sort();
    const genresIndex = Object.fromEntries(genres.map((genre, i) => [genre, i]));

    const years = movies.map(m => m.year).filter(Boolean);

    return {
        genresIndex,
        numGenres: genres.length,
        minYear: Math.min(...years),
        maxYear: Math.max(...years),
        // generos + ano + nota media
        dimensions: genres.length + 2
    };
}

// Transforma UM filme em vetor: [generos (multi-hot)..., ano, nota media]
// Multi-hot: um filme pode ter varios generos, entao varias posicoes ficam ligadas.
// Exemplo com generos [Acao, Comedia, Drama] e filme "Acao|Comedia": [1, 1, 0, ano, nota]
export function encodeMovie(movie, context) {
    const vector = new Array(context.dimensions).fill(0);

    movie.genres.forEach(genre => {
        vector[context.genresIndex[genre]] = WEIGHTS.genre;
    });

    // Filme sem ano recebe o ano do meio (0.5), para nao distorcer
    const yearNorm = movie.year
        ? normalize(movie.year, context.minYear, context.maxYear)
        : 0.5;
    vector[context.numGenres] = yearNorm * WEIGHTS.year;

    // Nota vai de 0 a 5, entao dividimos por 5
    vector[context.numGenres + 1] = (movie.avgRating / 5) * WEIGHTS.rating;

    return vector;
}

// Soma dois vetores posicao por posicao
function addVectors(a, b) {
    return a.map((value, i) => value + b[i]);
}

// Monta os exemplos de treino. Cada exemplo e um par (usuario, filme):
//   entrada = [perfil do usuario, vetor do filme]
//   resposta = 1 se o usuario gostou (nota >= 4), 0 se nao gostou
// Perfil do usuario = media dos vetores dos filmes que ele gostou.
// Importante: ao montar o exemplo de um filme, tiramos esse proprio filme do perfil.
// Se nao tirasse, a resposta ja estaria escondida na entrada e a rede "colaria".
export function createTrainingData(movies, users, context) {
    const movieVectors = new Map(movies.map(m => [m.id, encodeMovie(m, context)]));
    const inputs = [];
    const labels = [];

    users.forEach(user => {
        const rated = user.ratings.filter(r => movieVectors.has(r.movieId));
        const liked = rated.filter(r => r.rating >= LIKE_THRESHOLD);

        // Soma dos vetores de tudo que o usuario gostou
        let likedSum = new Array(context.dimensions).fill(0);
        liked.forEach(r => { likedSum = addVectors(likedSum, movieVectors.get(r.movieId)); });

        rated.forEach(r => {
            const movieVector = movieVectors.get(r.movieId);
            const didLike = r.rating >= LIKE_THRESHOLD;

            // Perfil sem o filme atual
            const count = liked.length - (didLike ? 1 : 0);
            const profile = count > 0
                ? (didLike
                    ? likedSum.map((value, i) => (value - movieVector[i]) / count)
                    : likedSum.map(value => value / count))
                : new Array(context.dimensions).fill(0);

            inputs.push([...profile, ...movieVector]);
            labels.push(didLike ? 1 : 0);
        });
    });

    shuffleTogether(inputs, labels);

    return { inputs, labels, inputDimension: context.dimensions * 2 };
}

// Embaralha entradas e respostas juntas (mantendo cada par alinhado).
// Precisa ser feito antes do treino porque a validacao usa o FINAL da lista:
// sem embaralhar, a validacao pegaria so os ultimos usuarios.
function shuffleTogether(inputs, labels) {
    for (let i = inputs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [inputs[i], inputs[j]] = [inputs[j], inputs[i]];
        [labels[i], labels[j]] = [labels[j], labels[i]];
    }
}
