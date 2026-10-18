// Escolhe quais filmes vale a pena pontuar para um usuario.

// Junta os filmes que os vizinhos (usuarios parecidos) curtiram e que o usuario
// ainda nao avaliou. Cada filme ganha "votes": quantos vizinhos curtiram.
// usersById e um Map de id do usuario para o usuario completo.
export function findCandidates(user, neighborIds, usersById, likeThreshold = 4) {
    const seen = new Set(user.ratings.map(r => r.movieId));
    const votes = new Map();

    neighborIds.forEach(id => {
        const neighbor = usersById.get(Number(id));
        if (!neighbor) return;
        neighbor.ratings
            .filter(r => r.rating >= likeThreshold && !seen.has(r.movieId))
            .forEach(r => votes.set(r.movieId, (votes.get(r.movieId) || 0) + 1));
    });

    return [...votes.entries()]
        .map(([movieId, count]) => ({ movieId, votes: count }))
        .sort((a, b) => b.votes - a.votes);
}
