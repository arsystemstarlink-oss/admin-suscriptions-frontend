import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

const COMMON_DOMAINS = [
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'icloud.com',
  'proton.me',
  'hotmail.es',
  'live.com',
]

export interface EmailInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value?: string
  onValueChange?: (value: string) => void
}

const EmailInput = React.forwardRef<HTMLInputElement, EmailInputProps>(
  ({ className, value = '', onValueChange, onBlur, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null)
    const [open, setOpen] = React.useState(false)
    const [highlighted, setHighlighted] = React.useState(0)

    const [localPart = '', domainPart = ''] = value.split('@')
    const filteredDomains = COMMON_DOMAINS.filter((domain) => domain.startsWith(domainPart))
    const suggestions = filteredDomains.map((domain) =>
      localPart ? `${localPart}@${domain}` : `@${domain}`,
    )
    const isComplete = localPart.length > 0 && COMMON_DOMAINS.includes(domainPart)

    React.useEffect(() => {
      setHighlighted(0)
    }, [localPart, domainPart])

    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    }

    const selectSuggestion = (email: string) => {
      const domain = email.slice(email.indexOf('@'))
      onValueChange?.(email)
      setOpen(false)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        if (domain === email) {
          inputRef.current?.setSelectionRange(0, 0)
        }
      })
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange?.(event.target.value)
      setOpen(true)
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open || suggestions.length === 0) return
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHighlighted((index) => (index + 1) % suggestions.length)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHighlighted((index) => (index - 1 + suggestions.length) % suggestions.length)
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        selectSuggestion(suggestions[highlighted])
      } else if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    const showSuggestions = open && suggestions.length > 0 && !isComplete

    return (
      <div className={cn('relative', className)}>
        <Input
          {...props}
          ref={setRefs}
          type="email"
          inputMode="email"
          autoComplete="new-password"
          data-1p-ignore
          data-lpignore="true"
          placeholder="nombre@correo.com"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={(event) => {
            onBlur?.(event)
            setOpen(false)
          }}
        />
        {showSuggestions && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            {suggestions.map((suggestion, index) => (
              <li key={suggestion}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer',
                    index === highlighted && 'bg-accent text-accent-foreground',
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => selectSuggestion(suggestion)}
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }
)
EmailInput.displayName = 'EmailInput'

export { EmailInput }
