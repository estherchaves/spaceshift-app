/**
 * Converte um SVG (texto) num PNG, desenhando-o num <canvas>. O SVG tem
 * de ser autónomo: estilos e tipos de letra embutidos, sem pedidos externos.
 * @returns {Promise<Blob>}
 */
export async function svgToPng(svg, { width, height, scale = 2 }) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    // O tipo de letra embutido pode chegar depois do primeiro desenho: desenha outra vez.
    await new Promise((resolve) => setTimeout(resolve, 60))
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível criar a imagem.'))), 'image/png'),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
