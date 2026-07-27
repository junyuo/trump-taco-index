import type { LatestData } from '../types/data'

const shortNames: Record<keyof LatestData['indicators'], string> = {
  brent: '布蘭特原油',
  us10y: '美國公債殖利率',
  hormuz: '荷姆茲海峽通行量',
  sp500: '美國股市',
}

export function buildObservationSummary(data: LatestData): string {
  const ranked = Object.entries(data.indicators).sort(
    ([, left], [, right]) => right.contribution - left.contribution,
  ) as [keyof LatestData['indicators'], LatestData['indicators']['brent']][]

  const leading = ranked.filter(([, item]) => item.contribution >= 0.15).slice(0, 2)
  const leaders =
    leading.length > 0
      ? leading.map(([key]) => shortNames[key]).join('與')
      : '各市場變數'

  const marketQualifier =
    data.index.score >= 85
      ? '整體壓力已進入 TACO 時刻觀察區，但政策是否轉向仍取決於政治與政策因素。'
      : data.index.score >= 70
        ? '整體指數已進入高壓警戒區，仍不代表政策必然改變。'
        : data.index.score >= 50
          ? '整體壓力明顯，但尚未進入 TACO 時刻區間。'
          : '整體市場壓力仍有限，距離高壓警戒區尚有距離。'

  return `目前主要壓力來自${leaders}。${marketQualifier}`
}
