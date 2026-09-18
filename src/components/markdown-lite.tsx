// Tiny non-dependency markdown renderer — good enough for the flat
// heading/list/bold content our mock documents use, without pulling in a
// full markdown library for a static prototype.
export function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n")
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return <h2 key={i}>{line.slice(3)}</h2>
        }
        if (line.startsWith("# ")) {
          return <h1 key={i}>{line.slice(2)}</h1>
        }
        if (line.startsWith("- ")) {
          return <li key={i}>{renderInline(line.slice(2))}</li>
        }
        if (line.trim() === "") {
          return null
        }
        return <p key={i}>{renderInline(line)}</p>
      })}
    </>
  )
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}
