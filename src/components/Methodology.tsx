import { BookOpen, Scale, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { indexConfig } from '../config/indexConfig'

const methodItems: { title: string; icon: ReactNode; content: ReactNode }[] = [
  {
    title: '從市場敘事到代理模型',
    icon: <BookOpen aria-hidden="true" />,
    content: (
      <>
        「TACO」是 Trump Always Chickens Out 的市場用語，用來描述強硬政策訊號在市場與政治壓力升高後，可能出現延後、縮小、豁免或撤回的情境。這是一種市場敘事，不是必然因果律。
      </>
    ),
  },
  {
    title: '可解釋的計算方式',
    icon: <Scale aria-hidden="true" />,
    content: (
      <>
        本站以最近 {indexConfig.rollingWindow} 個交易日計算 Z-score；Brent 與美債殖利率上升增加壓力，荷姆茲通行量與 S&P 500 下跌則反向計壓。代理權重為 30%／25%／25%／20%。
      </>
    ),
  },
  {
    title: '模型邊界',
    icon: <TriangleAlert aria-hidden="true" />,
    content: (
      <>
        本站不是 Signum Global Advisors 官方指數，原始模型完整公式與權重並未公開。指數只衡量市場壓力，不代表 Donald Trump 一定改變政策，也不構成投資建議。
      </>
    ),
  },
]

export function Methodology() {
  return (
    <section className="method-section" id="methodology" aria-labelledby="method-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">HOW IT WORKS</span>
          <h2 id="method-title">方法論與免責聲明</h2>
        </div>
      </div>
      <div className="method-grid">
        {methodItems.map((item) => (
          <article key={item.title}>
            {item.icon}
            <h3>{item.title}</h3>
            <p>{item.content}</p>
          </article>
        ))}
      </div>
      <div className="method-accordions">
        {methodItems.map((item) => (
          <details key={item.title}>
            <summary>{item.icon}<span>{item.title}</span></summary>
            <p>{item.content}</p>
          </details>
        ))}
      </div>
      <div className="disclaimer-box">
        <strong>重要聲明</strong>
        <p>
          荷姆茲海峽每日船舶通行艘次來自 IMF PortWatch 的 AIS 衍生資料，可能漏報、延遲或在發布後修訂。任何分數、門檻及歷史分類均是研究用途的代理設定，不應作為交易、法律或政策決策的唯一依據。S&P 500 資料的使用與引用仍受來源條款約束。
        </p>
      </div>
    </section>
  )
}
