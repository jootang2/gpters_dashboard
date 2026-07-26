'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { SurveyFormData, AiTool } from '@/lib/types'

const AI_TOOLS: AiTool[] = ['ChatGPT', 'Claude', 'Gemini', 'Copilot', '없음', '기타']

const TOTAL_STEPS = 3

const initialFormData: SurveyFormData = {
  name: '',
  job_role: '',
  age_range: '',
  location: '',
  claude_code_experience: '',
  ai_tools: [],
  coding_experience: '',
  study_goal: '',
  automation_wish: '',
  desired_outcome: '',
}

export default function SurveyPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<SurveyFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const updateField = <K extends keyof SurveyFormData>(key: K, value: SurveyFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const toggleAiTool = (tool: AiTool) => {
    setFormData((prev) => ({
      ...prev,
      ai_tools: prev.ai_tools.includes(tool)
        ? prev.ai_tools.filter((t) => t !== tool)
        : [...prev.ai_tools, tool],
    }))
  }

  const handleNext = () => {
    setError('')
    if (step === 3) return  // step 3은 마지막, 다음 없음
    setStep((s) => s + 1)
  }

  const handleBack = () => {
    setError('')
    if (step > 1) setStep((s) => s - 1)
  }

  const handleSubmit = async () => {
    // Step 3 필수 검증
    if (!formData.study_goal.trim()) {
      setError('스터디에서 얻고 싶은 것을 입력해 주세요.')
      return
    }
    if (!formData.automation_wish.trim()) {
      setError('자동화하고 싶은 업무를 입력해 주세요.')
      return
    }
    if (!formData.desired_outcome.trim()) {
      setError('만들고 싶은 결과물을 입력해 주세요.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const { error: sbError } = await supabase.from('survey_responses').insert([
        {
          name: formData.name,
          job_role: formData.job_role,
          age_range: formData.age_range || null,
          location: formData.location || null,
          claude_code_experience: formData.claude_code_experience,
          ai_tools: formData.ai_tools,
          coding_experience: formData.coding_experience,
          study_goal: formData.study_goal,
          automation_wish: formData.automation_wish,
          desired_outcome: formData.desired_outcome,
        },
      ])
      if (sbError) {
        // Supabase 연결 실패 시 콘솔에만 기록하고 완료 페이지로 이동
        console.error('[Survey] Supabase insert error (proceeding to complete):', sbError)
      }
      router.push('/survey/complete')
    } catch (err) {
      console.error('[Survey] Unexpected error (proceeding to complete):', err)
      router.push('/survey/complete')
    } finally {
      setSubmitting(false)
    }
  }

  const isStepValid = (s: number): boolean => {
    switch (s) {
      case 1:
        return formData.name.trim() !== '' && formData.job_role.trim() !== ''
      case 2:
        return formData.claude_code_experience !== '' && formData.coding_experience !== ''
      case 3:
        return (
          formData.study_goal.trim() !== '' &&
          formData.automation_wish.trim() !== '' &&
          formData.desired_outcome.trim() !== ''
        )
      default:
        return true
    }
  }

  return (
    <main className="min-h-screen bg-canvas text-fg flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl">
        {/* 나가기 */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-2 hover:text-text-secondary transition-colors">
            ← 홈으로
          </Link>
        </div>

        {/* 헤더 */}
        <div className="mb-8">
          <p className="text-sm text-accent font-medium mb-2">
            Step {step} / {TOTAL_STEPS}
          </p>
          {/* 진행 바 */}
          <div className="w-full h-1.5 bg-surface-strong rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* 카드 */}
        <div className="backdrop-blur-sm bg-surface border border-line rounded-2xl p-8">
          {step === 1 && (
            <Step1
              formData={formData}
              updateField={updateField}
            />
          )}
          {step === 2 && (
            <Step2
              formData={formData}
              updateField={updateField}
              toggleAiTool={toggleAiTool}
            />
          )}
          {step === 3 && (
            <Step3
              formData={formData}
              updateField={updateField}
            />
          )}

          {error && (
            <p className="mt-4 text-sm text-error bg-error/10 border border-error/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex-1 py-3 rounded-full border border-line text-text-secondary hover:bg-surface-strong transition-colors"
              >
                이전
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid(step)}
                className="flex-1 py-3 rounded-full bg-brand hover:bg-accent-hover font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                다음
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !isStepValid(step)}
                className="flex-1 py-3 rounded-full bg-brand hover:bg-accent-hover font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? '제출 중...' : '제출하기'}
              </button>
            )}
          </div>
        </div>

        {/* 개인정보 안내 */}
        <p className="mt-4 text-center text-xs text-muted-2 leading-relaxed">
          수집된 정보는 스터디 운영 목적으로만 사용되며,<br />
          제3자에게 제공되지 않습니다. 스터디 종료 후 삭제됩니다.
        </p>
      </div>
    </main>
  )
}

/* ─── Step 컴포넌트 ─── */

function Step1({
  formData,
  updateField,
}: {
  formData: SurveyFormData
  updateField: <K extends keyof SurveyFormData>(key: K, value: SurveyFormData[K]) => void
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight">기본 정보</h2>
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm text-muted mb-1 block">이름</span>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="홍길동"
            className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted mb-1 block">직업 / 역할</span>
          <input
            type="text"
            value={formData.job_role}
            onChange={(e) => updateField('job_role', e.target.value)}
            placeholder="마케터, 기획자, 강사 등"
            className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors"
          />
        </label>
        {/* 나이대 (옵션) */}
        <label className="block">
          <span className="text-sm text-muted mb-1 block">나이대 <span className="text-muted-2 text-xs">(선택)</span></span>
          <select
            value={formData.age_range ?? ''}
            onChange={(e) => updateField('age_range', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-panel border border-line text-fg focus:outline-none focus:border-accent transition-colors"
          >
            <option value="">선택 안 함</option>
            <option value="10대">10대</option>
            <option value="20대">20대</option>
            <option value="30대">30대</option>
            <option value="40대">40대</option>
            <option value="50대 이상">50대 이상</option>
          </select>
        </label>
        {/* 사는 곳 (옵션) */}
        <label className="block">
          <span className="text-sm text-muted mb-1 block">사는 곳 <span className="text-muted-2 text-xs">(선택)</span></span>
          <input
            type="text"
            value={formData.location ?? ''}
            onChange={(e) => updateField('location', e.target.value)}
            placeholder="서울, 부산, 경기 등"
            className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors"
          />
        </label>
      </div>
    </div>
  )
}

function Step2({
  formData,
  updateField,
  toggleAiTool,
}: {
  formData: SurveyFormData
  updateField: <K extends keyof SurveyFormData>(key: K, value: SurveyFormData[K]) => void
  toggleAiTool: (tool: AiTool) => void
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight">현재 수준</h2>

      {/* Claude Code 경험 */}
      <div>
        <p className="text-sm text-muted mb-3">Claude Code 경험</p>
        <div className="space-y-2">
          {(['처음 들어봄', '들어봤지만 안 써봄', '써봤음'] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="claude_code_experience"
                value={opt}
                checked={formData.claude_code_experience === opt}
                onChange={() => updateField('claude_code_experience', opt)}
                className="accent-[#5e6ad2]"
              />
              <span className="text-text-secondary group-hover:text-fg transition-colors">{opt}</span>
            </label>
          ))}
        </div>
      </div>

      {/* AI 도구 */}
      <div>
        <p className="text-sm text-muted mb-3">현재 쓰는 AI 도구 (복수 선택)</p>
        <div className="grid grid-cols-2 gap-2">
          {AI_TOOLS.map((tool) => (
            <label key={tool} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.ai_tools.includes(tool)}
                onChange={() => toggleAiTool(tool)}
                className="accent-[#5e6ad2]"
              />
              <span className="text-text-secondary group-hover:text-fg transition-colors">{tool}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 코딩 경험 */}
      <div>
        <p className="text-sm text-muted mb-3">코딩 경험</p>
        <div className="space-y-2">
          {(['없음', '조금', '있음'] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="coding_experience"
                value={opt}
                checked={formData.coding_experience === opt}
                onChange={() => updateField('coding_experience', opt)}
                className="accent-[#5e6ad2]"
              />
              <span className="text-text-secondary group-hover:text-fg transition-colors">{opt}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function Step3({
  formData,
  updateField,
}: {
  formData: SurveyFormData
  updateField: <K extends keyof SurveyFormData>(key: K, value: SurveyFormData[K]) => void
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight">목표 & 기대</h2>
      {[
        { key: 'study_goal' as const, label: '이 스터디에서 얻고 싶은 것', placeholder: '자유롭게 작성해 주세요.' },
        { key: 'automation_wish' as const, label: '자동화하고 싶은 반복 업무', placeholder: '예: 매일 반복되는 보고서 작성, 고객 이메일 분류 등' },
        { key: 'desired_outcome' as const, label: '스터디 후 만들고 싶은 결과물', placeholder: '예: 나만의 AI 업무 도우미, 자동 뉴스레터 발송 봇 등' },
      ].map(({ key, label, placeholder }) => (
        <label key={key} className="block">
          <span className="text-sm text-muted mb-1 block">{label}<span className="text-error ml-0.5">*</span></span>
          <textarea
            value={formData[key]}
            onChange={(e) => updateField(key, e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-fg placeholder-muted-2 focus:outline-none focus:border-accent transition-colors resize-none"
          />
        </label>
      ))}
    </div>
  )
}
