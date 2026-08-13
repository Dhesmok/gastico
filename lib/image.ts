'use client'

// ---------------------------------------------------------------------------
// Compresión de facturas en el navegador.
//
// Una foto de celular pesa 3–6 MB. Una factura legible cabe en ~80 KB si la
// bajamos a 1280 px y la pasamos a WebP. Con eso, el gigabyte gratis de
// Supabase Storage da para más de 10.000 facturas: no hay que pagar nada ni
// montar un Drive aparte.
// ---------------------------------------------------------------------------

const MAX_SIDE = 1280
const QUALITY = 0.72

export type PreparedImage = {
  /** Para subir a Storage. */
  blob: Blob
  /** Para mandarle a Gemini (sin el prefijo data:). */
  base64: string
  mimeType: string
  /** URL local para pintar la burbuja mientras sube. */
  previewUrl: string
  bytes: number
}

export async function prepareReceipt(file: File): Promise<PreparedImage> {
  const bitmap = await loadBitmap(file)

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No pude procesar la imagen en este navegador')
  ctx.drawImage(bitmap, 0, 0, width, height)
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()

  // Safari viejo no exporta WebP: cuando no lo soporta, el navegador devuelve
  // otro tipo, y ahí caemos a JPEG sin drama.
  let mimeType = 'image/webp'
  let blob = await toBlob(canvas, mimeType, QUALITY)
  if (!blob || blob.type !== mimeType) {
    mimeType = 'image/jpeg'
    blob = await toBlob(canvas, mimeType, QUALITY)
  }
  if (!blob) throw new Error('No pude comprimir la imagen')
  mimeType = blob.type || mimeType

  return {
    blob,
    base64: await toBase64(blob),
    mimeType,
    previewUrl: URL.createObjectURL(blob),
    bytes: blob.size,
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // sigue por el camino del <img>
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('No pude leer la imagen'))
      img.src = url
    })
  } finally {
    // El canvas ya copió los píxeles cuando se resuelve la promesa.
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality)
  })
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(new Error('No pude leer la imagen'))
    reader.readAsDataURL(blob)
  })
}
