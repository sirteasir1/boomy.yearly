/**
 * Gemini AI client — автоматически пробует несколько моделей.
 * Разные API ключи дают доступ к разным моделям.
 *
 * Порядок попыток:
 * 1. GEMINI_MODEL из .env.local (если задан)
 * 2. gemini-2.0-flash
 * 3. gemini-1.5-flash
 * 4. gemini-1.5-flash-latest
 * 5. gemini-pro (доступен с любым ключом)
 */
import { GoogleGenerativeAI } from '@google/generative-ai'

const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
]

function getClient() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY не задан в .env.local')
  return new GoogleGenerativeAI(key)
}

/** Попробовать конкретную модель */
async function tryModel(
  modelName: string,
  prompt: string,
  system?: string
): Promise<string> {
  const client = getClient()
  const model  = client.getGenerativeModel({
    model: modelName,
    ...(system ? { systemInstruction: system } : {}),
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  })
  const result = await model.generateContent(prompt)
  const text   = result.response.text()
  if (!text) throw new Error('Пустой ответ от модели')
  return text
}

/** Генерация текста с автоматическим fallback по моделям */
export async function generate(prompt: string, system?: string): Promise<string> {
  // Используем модель из env если задана
  const preferred = process.env.GEMINI_MODEL
  const models    = preferred
    ? [preferred, ...FALLBACK_MODELS.filter(m => m !== preferred)]
    : FALLBACK_MODELS

  let lastError: Error | null = null

  for (const model of models) {
    try {
      const text = await tryModel(model, prompt, system)
      // Логируем только в dev
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Gemini] успешно: ${model}`)
      }
      return text
    } catch (err: any) {
      lastError = err
      // Если модель не найдена — пробуем следующую
      const isNotFound = err.message?.includes('404') ||
                         err.message?.includes('not found') ||
                         err.message?.includes('not supported')
      if (!isNotFound) {
        // Другая ошибка (auth, quota и т.д.) — не пробуем остальные
        throw err
      }
      console.warn(`[Gemini] модель ${model} недоступна, пробую следующую...`)
    }
  }

  throw lastError ?? new Error('Ни одна модель Gemini не доступна')
}

/** JSON генерация с чисткой markdown */
export async function generateJSON<T>(prompt: string, system?: string): Promise<T> {
  const text  = await generate(
    prompt + '\n\nВажно: ответь ТОЛЬКО валидным JSON без markdown, без ``` и без объяснений.',
    system
  )
  const clean = text
    .replace(/^```json\s*/i, '').replace(/\s*```$/,'')
    .replace(/^```\s*/, '').replace(/\s*```$/, '')
    .trim()

  try {
    return JSON.parse(clean) as T
  } catch {
    const match = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (match) return JSON.parse(match[1]) as T
    // Последний resort — вернуть пустой объект
    console.error('[Gemini] JSON parse failed:', clean.slice(0, 200))
    throw new Error(`Не удалось разобрать JSON ответ: ${clean.slice(0, 100)}`)
  }
}

/** Получить имя активной модели (для дебага) */
export async function getActiveModel(): Promise<string> {
  const preferred = process.env.GEMINI_MODEL
  const models    = preferred ? [preferred, ...FALLBACK_MODELS] : FALLBACK_MODELS

  for (const model of models) {
    try {
      await tryModel(model, 'test', undefined)
      return model
    } catch (err: any) {
      const isNotFound = err.message?.includes('404') || err.message?.includes('not found')
      if (!isNotFound) break
    }
  }
  return 'unknown'
}
