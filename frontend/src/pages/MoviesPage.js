import { getMovies, API_GATEWAY_URL } from '../api/apiClient.js';

const MoviesPage = {
  render: async () => {
    return `
      <div class="container py-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2 class="fw-bold">Movie List</h2>
          <div class="col-md-4">
            <input
              type="text"
              id="search-input"
              class="form-control"
              placeholder="🔍 Search movies..."
            />
          </div>
        </div>
        <div id="movies-list" class="row g-4">
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  afterRender: async () => {
    const moviesList = document.getElementById('movies-list');
    const searchInput = document.getElementById('search-input');

    const fetchAndRenderMovies = async (query = '') => {
      try {
        const movies = await getMovies(query);
        
        if (movies.length === 0) {
            moviesList.innerHTML = '<div class="col-12 text-center text-muted"><p>No matching movies found.</p></div>';
            return;
        }

        moviesList.innerHTML = movies.map(movie => `
          <div class="col-md-3 col-sm-6">
            <div class="card h-100 shadow-sm border-0 overflow-hidden">
              <a href="/movies/${movie.id}">
                ${movie.image_url ? `
                  <img src="${API_GATEWAY_URL}/movies/posters/${movie.image_url}" 
                       class="card-img-top movie-poster" 
                       alt="${movie.title}"
                       onerror="this.parentElement.innerHTML='<div class=\\'movie-poster d-flex align-items-center justify-content-center bg-dark text-white\\'><h1 class=\\'display-1\\'>🎬</h1></div>'">
                ` : `
                  <div class="movie-poster d-flex align-items-center justify-content-center bg-dark text-white">
                    <h1 class="display-1">🎬</h1>
                  </div>
                `}
              </a>
              <div class="card-body">
                <h6 class="fw-bold mb-1 text-truncate">${movie.title}</h6>
                <p class="text-muted small mb-2">${movie.genre} • ${movie.duration}m</p>
                <div class="d-grid">
                  <a href="/movies/${movie.id}" class="btn btn-outline-primary btn-sm">Details</a>
                </div>
              </div>
            </div>
          </div>
        `).join('');

      } catch (err) {
        moviesList.innerHTML = `<div class="col-12"><div class="alert alert-danger">Error: ${err.message}</div></div>`;
      }
    };

    // Initial fetch
    await fetchAndRenderMovies();

    // Debounce helper
    const debounce = (func, delay) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
      };
    };

    const debouncedSearch = debounce((query) => {
      fetchAndRenderMovies(query);
    }, 500);

    // Search event
    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });
  }
};

export default MoviesPage;
