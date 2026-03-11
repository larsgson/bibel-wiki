import type { Section } from "../lib/types"

interface Props {
  section: Section
  sectionIndex: number
  selectedLanguages: string[]
  sectionsMap: Record<string, Section[]>
  isPlaying: boolean
  onSectionClick: (index: number) => void
}

const RTL_LANGUAGES = ["heb", "arb", "ara"]

export default function StorySection({
  section,
  sectionIndex,
  selectedLanguages,
  sectionsMap,
  isPlaying,
  onSectionClick,
}: Props) {
  const primaryLang = selectedLanguages[0]
  const primarySection = sectionsMap[primaryLang]?.[sectionIndex]
  if (!primarySection) return null

  return (
    <div
      id={`verse-${sectionIndex}`}
      data-verse-idx={sectionIndex}
      data-clickable="1"
      className={`rounded-lg overflow-hidden border transition-all cursor-pointer dark:bg-white/[0.04] ${
        isPlaying
          ? "border-red-500 ring-2 ring-red-500/30 shadow-lg"
          : "border-gray-200 dark:border-gray-700/50 hover:shadow-md"
      }`}
      onClick={() => onSectionClick(sectionIndex)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSectionClick(sectionIndex)
        }
      }}
    >
      {/* Images + verse ref */}
      {primarySection.imageUrls.length > 0 && (
        <div className="listen-verse-images">
          {primarySection.imageUrls.map((url, imgIdx) => (
            <img
              key={imgIdx}
              src={url}
              alt={`Section ${sectionIndex + 1}`}
              className="w-full aspect-video object-cover"
              loading="lazy"
            />
          ))}
          {primarySection.reference && (
            <div className="listen-verse-ref">{primarySection.reference}</div>
          )}
        </div>
      )}

      {/* No-image verse ref fallback */}
      {primarySection.imageUrls.length === 0 && primarySection.reference && (
        <div className="listen-verse-ref-inline">{primarySection.reference}</div>
      )}

      {/* Section heading (no-image case only) */}
      {primarySection.imageUrls.length === 0 && primarySection.heading && (
        <div className="px-3 pt-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
            {primarySection.heading}
          </h3>
        </div>
      )}

      {/* Multi-language text */}
      {selectedLanguages.map((langCode, langIndex) => {
        const langSection = sectionsMap[langCode]?.[sectionIndex]
        if (!langSection?.text?.trim()) return null

        const isRTL = RTL_LANGUAGES.includes(langCode)
        const isPrimary = langIndex === 0
        const hasImages = primarySection.imageUrls.length > 0
        const textClass = isPrimary
          ? `listen-verse-text-primary${hasImages ? " has-images" : ""}`
          : `listen-verse-text-secondary${hasImages ? " has-images" : ""}`

        return (
          <div key={langCode} className={textClass} dir={isRTL ? "rtl" : "ltr"}>
            {/* Heading inside primary text block so it participates in the overlap */}
            {isPrimary && hasImages && primarySection.heading && (
              <h3 className="text-base font-semibold mb-1 text-white">
                {primarySection.heading}
              </h3>
            )}
            {!isPrimary && (
              <span className="text-xs text-gray-400 uppercase">{langCode}</span>
            )}
            {langSection.text.split("\n").map((line, i) => {
              const trimmed = line.trim()
              if (!trimmed) return null
              return (
                <p key={i} className="mb-1">
                  {trimmed}
                </p>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
