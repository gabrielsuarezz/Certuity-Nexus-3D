import re

# Defense-in-depth PII masking on anything leaving the agent. The mock data is
# already masked, but we never want a full number to slip through (e.g. if a
# real custodian feed is wired in later).
_PATTERNS = [
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "***-**-****"),          # SSN
    (re.compile(r"\b(?:\d[ -]?){12,19}\b"), "[account # redacted]"),  # card/acct runs
]


def redact(text: str) -> str:
    if not text:
        return text
    out = text
    for pattern, repl in _PATTERNS:
        out = pattern.sub(repl, out)
    return out
