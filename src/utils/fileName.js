/** Nome de ficheiro seguro a partir do nome do projeto: "Sala da Ana" → "sala-da-ana". */
export function slugify(name, fallback = 'projeto') {
  const slug = String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return slug || fallback
}
