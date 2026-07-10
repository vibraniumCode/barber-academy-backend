// Configuración central de Bunny.net
// Exportamos las variables de entorno tipadas para usarlas en todo el proyecto
// Si alguna falta, el error aparece temprano al arrancar el servidor
export const bunnyConfig = {
  apiKey: process.env.BUNNY_API_KEY as string,
  libraryId: process.env.BUNNY_LIBRARY_ID as string,
  cdnHostname: process.env.BUNNY_CDN_HOSTNAME as string,
  tokenKey: process.env.BUNNY_TOKEN_KEY as string,

  // URL base de la API de Bunny Stream
  apiUrl: `https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}`,
}