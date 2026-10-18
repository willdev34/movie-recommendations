// Usa a rede treinada para dar uma nota a cada filme candidato.

// Para cada candidato, junta [perfil do usuario, vetor do filme], pergunta a rede
// "qual a chance de ele gostar?" e devolve a lista ordenada da maior para a menor.
// Recebe o tf e o model como parametros para poder ser testada fora do browser.
export function scoreCandidates(tf, model, profile, candidates, movieVectors) {
    const valid = candidates.filter(c => movieVectors.has(c.movieId));
    if (!valid.length) return [];

    const inputs = valid.map(c => [...profile, ...movieVectors.get(c.movieId)]);
    // tidy libera a memoria dos tensores temporarios depois do calculo
    const scores = tf.tidy(() => Array.from(model.predict(tf.tensor2d(inputs)).dataSync()));

    return valid
        .map((c, i) => ({ movieId: c.movieId, votes: c.votes, score: scores[i] }))
        .sort((a, b) => b.score - a.score);
}

// Devolve os N filmes que o usuario mais gostou (maior nota), para a gente
// comparar com as recomendacoes e julgar se fazem sentido.
export function topLikedMovies(user, movieById, count = 5) {
    return [...user.ratings]
        .filter(r => movieById.has(r.movieId))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, count)
        .map(r => movieById.get(r.movieId));
}
