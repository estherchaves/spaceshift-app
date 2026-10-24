/** Descarrega um Blob com o nome indicado (sem servidor). */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  // Alguns browsers precisam que o URL viva até o download arrancar.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Lê um ficheiro escolhido pelo utilizador como texto. */
export function readFileAsText(file) {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
