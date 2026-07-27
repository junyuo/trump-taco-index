export const indicatorKeys = ['brent', 'us10y', 'hormuz', 'sp500'] as const

export type IndicatorKey = (typeof indicatorKeys)[number]

export const indexConfig = {
  rollingWindow: 60,
  staleAfterHours: 12,
  weights: {
    brent: 0.3,
    us10y: 0.25,
    hormuz: 0.25,
    sp500: 0.2,
  } satisfies Record<IndicatorKey, number>,
  scoreBreakpoints: [
    { compositeZ: 0, score: 0 },
    { compositeZ: 1, score: 30 },
    { compositeZ: 2, score: 60 },
    { compositeZ: 2.9, score: 85 },
    { compositeZ: 3.4, score: 100 },
  ],
  statusBands: [
    {
      min: 0,
      max: 24,
      name: '還沒開火',
      icon: '🌮',
      tone: 'green',
      description: '市場壓力低，強硬言論尚未造成明顯金融壓力。',
    },
    {
      min: 25,
      max: 49,
      name: '玉米餅開始加熱',
      icon: '🌮',
      tone: 'yellow',
      description: '市場開始反應，但距離政策轉向仍有距離。',
    },
    {
      min: 50,
      max: 69,
      name: '餡料快包不住',
      icon: '🌮',
      tone: 'orange',
      description: '金融市場壓力明顯增加，政策調整機率值得關注。',
    },
    {
      min: 70,
      max: 84,
      name: 'TACO 警戒',
      icon: '🌮',
      tone: 'red',
      description: '市場已進入高壓區，需密切觀察政策言論及官方行動。',
    },
    {
      min: 85,
      max: 100,
      name: 'TACO 時刻',
      icon: '🚨',
      tone: 'deep-red',
      description: '綜合市場壓力接近歷史報導所述的政策轉向區間，但不代表政策一定改變。',
    },
  ],
} as const
