// =============================================
// CONFIGURACIÓN PRINCIPAL
// =============================================
const SHEET_ID = "1m5TOfOxH_itvSyxCQ5lvQEtH6HwZfH7bsdWryHK5diI";
const SHEET_NAME = "ubi"; // Asegúrate que coincida con el nombre de tu hoja

// =============================================
// FUNCIÓN PARA CARGAR DATOS DESDE SHEETS (CORREGIDA)
// =============================================
async function cargarDatosDesdeSheets() {
  try {
    // URL corregida usando opensheet.elk.sh
    const url = `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}`;
    console.log("Cargando datos desde:", url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log("Datos recibidos:", data);
    
    // Validación y transformación de datos
    if (!Array.isArray(data)) {
      console.error("Los datos no son un array:", data);
      return [];
    }
    
    const ubicaciones = data
      .filter(item => item.coordenadas && item.titulo && item.fecha) // Filtrar elementos válidos
      .map(item => {
        // Convertir coordenadas de string a array numérico
        const coords = item.coordenadas.split(',').map(coord => {
          const num = parseFloat(coord.trim());
          return isNaN(num) ? 0 : num; // Manejar valores no numéricos
        });
        
        return {
          ...item,
          coordenadas: coords
        };
      });
    
    console.log("Ubicaciones formateadas:", ubicaciones);
    return ubicaciones;
    
  } catch (error) {
    console.error("Error cargando datos:", error);
    return [];
  }
}

// =============================================
// FUNCIONES DE VISUALIZACIÓN (CON VALIDACIÓN)
// =============================================
let mapa, timeline;

function initMap(ubicaciones) {
  try {
    // Verificar que Leaflet esté disponible
    if (typeof L === 'undefined') {
      throw new Error("Leaflet no está cargado correctamente");
    }
    
    // Verificar que hay ubicaciones
    if (!ubicaciones.length) {
      console.warn("No hay ubicaciones para mostrar en el mapa");
      return;
    }
    
    const container = document.getElementById('mapa-container');
    if (!container) {
      throw new Error("Contenedor del mapa no encontrado");
    }
    
    // Crear instancia del mapa
    mapa = L.map(container).setView(ubicaciones[0].coordenadas, 13);
    
    // Capa base del mapa
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}/.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapa);
    
    // Agregar marcadores
    ubicaciones.forEach(u => {
      if (u.coordenadas.length === 2 && !isNaN(u.coordenadas[0])) {
        L.marker(u.coordenadas)
          .bindPopup(`<b>${u.titulo}</b><p>${u.descripcion}</p>`)
          .addTo(mapa);
      }
    });
    
  } catch (error) {
    console.error("Error inicializando mapa:", error);
  }
}

function initTimeline(ubicaciones) {
  try {
    // Verificar que TimelineJS esté disponible
    if (typeof TL === 'undefined') {
      console.warn("TimelineJS no está cargado");
      return;
    }
    
    // Verificar que hay ubicaciones
    if (!ubicaciones.length) {
      console.warn("No hay ubicaciones para mostrar en la línea de tiempo");
      return;
    }
    
    const container = document.getElementById('timeline-container');
    if (!container) {
      throw new Error("Contenedor de timeline no encontrado");
    }
    
    // Preparar datos para TimelineJS
    const timelineData = {
      events: ubicaciones.map(u => ({
        start_date: {
          year: u.fecha.split('-')[0] || "2025",
          month: u.fecha.split('-')[1] || "01",
          day: u.fecha.split('-')[2] || "01"
        },
        text: {
          headline: u.titulo,
          text: u.descripcion
        }
      }))
    };
    
    timeline = new TL.Timeline(container, timelineData);
    
  } catch (error) {
    console.error("Error inicializando timeline:", error);
  }
}

// =============================================
// INICIALIZACIÓN DE LA APLICACIÓN (MEJORADA)
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
  // Elemento para mostrar errores
  const errorContainer = document.createElement('div');
  errorContainer.id = 'error-message';
  errorContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    background: #ff6b6b;
    color: white;
    padding: 15px;
    text-align: center;
    z-index: 10000;
    display: none;
    font-family: Arial, sans-serif;
  `;
  document.body.prepend(errorContainer);
  
  try {
    // 1. Cargar datos
    const ubicaciones = await cargarDatosDesdeSheets();
    
    // 2. Ordenar por fecha
    ubicaciones.sort((a, b) => {
      try {
        return new Date(a.fecha) - new Date(b.fecha);
      } catch {
        return 0;
      }
    });
    
    // 3. Inicializar componentes
    initMap(ubicaciones);
    initTimeline(ubicaciones);
    
    // 4. Inicializar Fullpage.js si existe
    if (typeof fullpage !== 'undefined') {
      try {
        new fullpage('#fullpage', {
          licenseKey: 'OPEN-SOURCE-GPLV3-LICENSE',
          afterRender: () => {
            setTimeout(() => {
              if (mapa) mapa.invalidateSize();
            }, 500);
          },
          onLeave: (origin, destination) => {
            if (destination.index === 1 && mapa) {
              setTimeout(() => mapa.invalidateSize(), 300);
            }
          }
        });
      } catch (error) {
        console.error("Error inicializando Fullpage.js:", error);
      }
    }
    
    // 5. Mostrar mensaje si no hay datos
    if (ubicaciones.length === 0) {
      showError("No se pudieron cargar los datos. Por favor verifica tu conexión.");
    }
    
  } catch (error) {
    console.error("Error crítico en la aplicación:", error);
    showError(`Error crítico: ${error.message}`);
  }
  
  function showError(message) {
    console.error(message);
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    
    // Ocultar después de 10 segundos
    setTimeout(() => {
      errorContainer.style.display = 'none';
    }, 10000);
  }
});