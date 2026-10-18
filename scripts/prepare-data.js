import { readFileSync, writeFileSync } from 'node:fs';

const TOP_MOVIES = 300;      // quantos filmes mais avaliados vamos manter
const MIN_USER_RATINGS = 20; // usuario precisa ter avaliado ao menos isso

// Le um CSV e devolve uma lista de linhas, cada uma como lista de colunas.
// Precisa tratar aspas porque titulos como "American President, The (1995)" tem virgula.
function parseCsv(path) {
    const lines = readFileSync(path, 'utf-8').split(/\r?\n/).filter(Boolean);
    lines.shift(); // remove o cabecalho
    return lines.map(line => {
        const cols = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { cols.push(current); current = ''; }
            else current += char;
        }
        cols.push(current);
        return cols;
    });
}

const ratingsRaw = parseCsv('data/raw/ratings.csv').map(([userId, movieId, rating]) => ({
    userId: Number(userId), movieId: Number(movieId), rating: Number(rating)
}));

// 1. Conta quantas avaliacoes cada filme recebeu e pega os mais populares
const countByMovie = new Map();
ratingsRaw.forEach(r => countByMovie.set(r.movieId, (countByMovie.get(r.movieId) || 0) + 1));
const topMovieIds = new Set(
    [...countByMovie.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_MOVIES).map(([id]) => id)
);

// 2. Mantem so avaliacoes desses filmes
const ratings = ratingsRaw.filter(r => topMovieIds.has(r.movieId));

// 3. Mantem so usuarios com avaliacoes suficientes
const ratingsByUser = new Map();
ratings.forEach(r => {
    if (!ratingsByUser.has(r.userId)) ratingsByUser.set(r.userId, []);
    ratingsByUser.get(r.userId).push({ movieId: r.movieId, rating: r.rating });
});
const users = [...ratingsByUser.entries()]
    .filter(([, list]) => list.length >= MIN_USER_RATINGS)
    .map(([id, list]) => ({ id, ratings: list }));

// 4. Monta os filmes com genero (lista), ano e nota media
const sumByMovie = new Map();
ratings.forEach(r => sumByMovie.set(r.movieId, (sumByMovie.get(r.movieId) || 0) + r.rating));

const movies = parseCsv('data/raw/movies.csv')
    .filter(([id]) => topMovieIds.has(Number(id)))
    .map(([id, title, genres]) => {
        const year = title.match(/\((\d{4})\)\s*$/);
        return {
            id: Number(id),
            title: title.replace(/\s*\(\d{4}\)\s*$/, ''),
            year: year ? Number(year[1]) : null,
            genres: genres === '(no genres listed)' ? [] : genres.split('|'),
            ratingCount: countByMovie.get(Number(id)),
            avgRating: Number((sumByMovie.get(Number(id)) / countByMovie.get(Number(id))).toFixed(2))
        };
    });

writeFileSync('data/movies.json', JSON.stringify(movies, null, 2));
writeFileSync('data/users.json', JSON.stringify(users));

const totalRatings = users.reduce((sum, u) => sum + u.ratings.length, 0);
console.log(`Filmes: ${movies.length}`);
console.log(`Usuarios: ${users.length}`);
console.log(`Avaliacoes: ${totalRatings}`);
console.log(`Generos: ${[...new Set(movies.flatMap(m => m.genres))].length}`);
