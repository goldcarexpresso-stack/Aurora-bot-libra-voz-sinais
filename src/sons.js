import * as tf from '@tensorflow/tfjs'

const MODELO_URL = 'https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1'
const MAPA_URL =
  'https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/yamnet_class_map.csv'

export const TAXA = 16000
export const AMOSTRAS = 15600

const NOMES_PT = {
  'Siren': 'sirene',
  'Civil defense siren': 'sirene',
  'Ambulance (siren)': 'sirene de ambulância',
  'Fire engine, fire truck (siren)': 'sirene de bombeiros',
  'Police car (siren)': 'sirene de polícia',
  'Emergency vehicle': 'veículo de emergência',
  'Vehicle horn, car horn, honking': 'buzina',
  'Car alarm': 'alarme de carro',
  'Doorbell': 'campainha',
  'Ding-dong': 'campainha',
  'Knock': 'batida na porta',
  'Slam': 'porta batendo',
  'Door': 'porta',
  'Applause': 'palmas',
  'Clapping': 'palmas',
  'Dog': 'cachorro',
  'Bark': 'cachorro latindo',
  'Baby cry, infant cry': 'bebê chorando',
  'Crying, sobbing': 'choro',
  'Speech': 'voz de pessoa falando',
  'Shout': 'grito',
  'Screaming': 'grito',
  'Alarm': 'alarme',
  'Smoke detector, smoke alarm': 'alarme de incêndio',
  'Fire alarm': 'alarme de incêndio',
  'Alarm clock': 'despertador',
  'Telephone bell ringing': 'telefone tocando',
  'Ringtone': 'celular tocando',
  'Glass': 'vidro',
  'Shatter': 'vidro quebrando',
  'Explosion': 'estouro forte',
  'Gunshot, gunfire': 'estouro forte',
  'Water': 'água',
  'Boiling': 'água fervendo',
  'Microwave oven': 'micro-ondas',
  'Beep, bleep': 'bipe de aparelho',
  'Music': 'música',
  'Laughter': 'risada',
  'Cough': 'tosse',
  'Whistling': 'assobio',
}

function lerLinhaCsv(linha) {
  const primeira = linha.indexOf(',')
  if (primeira < 0) return null
  const segunda = linha.indexOf(',', primeira + 1)
  if (segunda < 0) return null

  let nome = linha.slice(segunda + 1).trim()
  if (nome.startsWith('"') && nome.endsWith('"')) {
    nome = nome.slice(1, -1).replace(/""/g, '"')
  }
  return nome
}

let cache = null

export async function carregarReconhecedor() {
  if (cache) return cache

  const [modelo, resposta] = await Promise.all([
    tf.loadGraphModel(MODELO_URL, { fromTFHub: true }),
    fetch(MAPA_URL),
  ])

  if (!resposta.ok) throw new Error('mapa')

  const texto = await resposta.text()
  const linhas = texto.split('\n').slice(1)
  const nomes = []
  for (const linha of linhas) {
    if (!linha.trim()) continue
    const nome = lerLinhaCsv(linha)
    if (nome) nomes.push(nome)
  }

  if (nomes.length < 500) throw new Error('mapa')

  const interessantes = []
  nomes.forEach((nome, i) => {
    if (NOMES_PT[nome]) interessantes.push({ indice: i, texto: NOMES_PT[nome] })
  })

  cache = { modelo, nomes, interessantes }
  return cache
}

export function reconhecer(reconhecedor, onda) {
  const { modelo, interessantes } = reconhecedor

  return tf.tidy(() => {
    const entrada = tf.tensor1d(onda)
    const saida = modelo.execute(entrada)
    const notas = Array.isArray(saida) ? saida[0] : saida
    const porClasse = notas.max(0)
    const valores = porClasse.dataSync()

    let melhor = null
    for (const item of interessantes) {
      const nota = valores[item.indice]
      if (!melhor || nota > melhor.nota) {
        melhor = { texto: item.texto, nota }
      }
    }

    return melhor
  })
}
