const BASE_URL = 'https://api.fifa.com/api/v3';
const CONFIG = {
  idCompetition: 17,
  idSeason: 285023,
  idGroup: 289275,
  language: 'es'
};

const loadingEl = document.getElementById('loading');
const containerEl = document.getElementById('matches-container');

async function obtenerPartidosMexico() {
  try {
    const calendarUrl = `${BASE_URL}/calendar/matches?idCompetition=${CONFIG.idCompetition}&idSeason=${CONFIG.idSeason}&idGroup=${CONFIG.idGroup}&language=${CONFIG.language}`;
    const response = await fetch(calendarUrl);
    
    if (!response.ok) {
      throw new Error(`Error al consultar el calendario: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.Results || !Array.isArray(data.Results)) {
      throw new Error('La estructura de respuesta no contiene un arreglo Results válido.');
    }

    // Filtrar solo los encuentros donde participe México (Local o Visitante)
    const partidosMexico = data.Results.filter(match => {
      const homeCountry = match.Home?.IdCountry;
      const awayCountry = match.Away?.IdCountry;
      return homeCountry === 'MEX' || awayCountry === 'MEX';
    });

    if (partidosMexico.length === 0) {
      mostrarMensajeVacio('No se encontraron encuentros programados para la Selección Mexicana.');
      return;
    }

    const partidosConEstadisticas = [];

    for (const match of partidosMexico) {
      const stats = await obtenerTimelineMatch(match.IdMatch);
      partidosConEstadisticas.push({ match, stats });
    }

    renderizarPartidos(partidosConEstadisticas);

  } catch (error) {
    console.error('Error general en la aplicación:', error);
    mostrarError(`Ocurrió un error al cargar los datos: ${error.message}`);
  } finally {
    loadingEl.style.display = 'none';
  }
}

async function obtenerTimelineMatch(idMatch) {
  try {
    const response = await fetch(`${BASE_URL}/timelines/${idMatch}?language=${CONFIG.language}`);
    if (!response.ok) return { goles: [], amarillas: [], rojas: [] };

    const data = await response.json();
    const eventos = data.Event || [];

    return {
      goles: eventos.filter(e => e.Type === 0),
      amarillas: eventos.filter(e => e.Type === 2),
      rojas: eventos.filter(e => e.Type === 3)
    };
  } catch (err) {
    console.warn(`No se pudieron cargar los eventos para el partido ${idMatch}:`, err);
    return { goles: [], amarillas: [], rojas: [] };
  }
}

function renderizarPartidos(listaPartidos) {
  containerEl.innerHTML = '';

  listaPartidos.forEach(({ match, stats }) => {
    const card = document.createElement('article');
    card.className = 'match-card';

    const fechaPartido = match.Date ? new Date(match.Date).toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'Fecha por confirmar';

    const estadio = match.Stadium?.Name?.[0]?.Description || 'Estadio no especificado';
    const local = match.Home?.ShortClubName || match.Home?.IdCountry || 'Local';
    const visitante = match.Away?.ShortClubName || match.Away?.IdCountry || 'Visitante';
    const scoreLocal = match.Home?.Score ?? 0;
    const scoreVisitante = match.Away?.Score ?? 0;

    const htmlGoles = stats.goles.length > 0
      ? stats.goles.map(g => `<li>⚽ Min ${g.MatchMinute}': ${g.TypeLocalized || 'Gol'}</li>`).join('')
      : '<li>Sin goles registrados</li>';

    const htmlTarjetas = (stats.amarillas.length + stats.rojas.length) > 0
      ? [
          ...stats.amarillas.map(a => `<li>🟨 Min ${a.MatchMinute}': Tarjeta Amarilla</li>`),
          ...stats.rojas.map(r => `<li>🟥 Min ${r.MatchMinute}': Tarjeta Roja</li>`)
        ].join('')
      : '<li>Sin tarjetas registradas</li>';

    card.innerHTML = `
      <div class="match-header">
        <span>📍 ${estadio}</span>
        <span>🗓️ ${fechaPartido}</span>
      </div>
      <div class="match-teams">
        <div class="team">
          <span class="team-name">${local}</span>
        </div>
        <div class="score">${scoreLocal} - ${scoreVisitante}</div>
        <div class="team">
          <span class="team-name">${visitante}</span>
        </div>
      </div>
      <div class="match-details">
        <div class="details-section">
          <h4>Goles (${stats.goles.length})</h4>
          <ul>${htmlGoles}</ul>
        </div>
        <div class="details-section">
          <h4>Tarjetas (🟨 ${stats.amarillas.length} | 🟥 ${stats.rojas.length})</h4>
          <ul>${htmlTarjetas}</ul>
        </div>
      </div>
    `;

    containerEl.appendChild(card);
  });

  containerEl.style.display = 'grid';
}

function mostrarError(mensaje) {
  containerEl.innerHTML = `<div class="error-card"><h3>Error</h3><p>${mensaje}</p></div>`;
  containerEl.style.display = 'block';
}

function mostrarMensajeVacio(mensaje) {
  containerEl.innerHTML = `<p style="text-align:center; color: var(--muted);">${mensaje}</p>`;
  containerEl.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', obtenerPartidosMexico);