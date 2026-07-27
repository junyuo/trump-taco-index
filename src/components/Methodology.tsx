import { BookOpen, Scale, TriangleAlert } from 'lucide-react'
import { indexConfig } from '../config/indexConfig'

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
        <article>
          <BookOpen aria-hidden="true" />
          <h3>從市場敘事到代理模型</h3>
          <p>
            「TACO」是 Trump Always Chickens Out 的市場用語，用來描述強硬政策訊號在市場與政治壓力升高後，可能出現延後、縮小、豁免或撤回的情境。這是一種市場敘事，不是必然因果律。
          </p>
        </article>
        <article>
          <Scale aria-hidden="true" />
          <h3>可解釋的計算方式</h3>
          <p>
            本站以最近 {indexConfig.rollingWindow} 個交易日計算 Z-score；Brent 與美債殖利率上升增加壓力，荷姆茲通行量與 S&P 500 下跌則反向計壓。代理權重為 30%／25%／25%／20%。
          </p>
        </article>
        <article>
          <TriangleAlert aria-hidden="true" />
          <h3>模型邊界</h3>
          <p>
            本站不是 Signum Global Advisors 官方指數，原始模型完整公式與權重並未公開。指數只衡量市場壓力，不代表 Donald Trump 一定改變政策，也不構成投資建議。
          </p>
        </article>
      </div>
      <div className="disclaimer-box">
        <strong>重要聲明</strong>
        <p>
          荷姆茲海峽資料可能為延遲、估算或人工維護；發布真實資料前應確認授權、時間戳與引用。任何分數、門檻及歷史分類均是研究用途的代理設定，不應作為交易、法律或政策決策的唯一依據。
        </p>
      </div>
    </section>
  )
}
