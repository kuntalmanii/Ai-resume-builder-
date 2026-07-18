"""Skill taxonomy and boundary-safe alias matching system."""

import re

# Centralized taxonomy: Canonical Name -> List of aliases/phrases
TAXONOMY = {
    "JavaScript": ["javascript", "js", "ecmascript"],
    "TypeScript": ["typescript", "ts"],
    "React": ["react", "react.js", "reactjs"],
    "Node.js": ["node", "node.js", "nodejs"],
    "PostgreSQL": ["postgres", "postgresql"],
    "Amazon Web Services": ["aws", "amazon web services", "amazon web service"],
    "Google Cloud": ["gcp", "google cloud", "google cloud platform"],
    "Machine Learning": ["machine learning", "ml"],
    "Natural Language Processing": ["natural language processing", "nlp"],
    "CI/CD": ["ci/cd", "continuous integration", "continuous delivery", "continuous deployment"],
    "Go": ["golang", "go"],
    "Java": ["java"],
    "Python": ["python", "py"],
    "C++": ["c++", "cpp"],
    "C": ["c"],
    "R": ["r"],
    "Kafka": ["kafka", "apache kafka"],
    "Docker": ["docker"],
    "Kubernetes": ["kubernetes", "k8s"],
    "GraphQL": ["graphql"],
    "Webpack": ["webpack"],
}

# Special matching rules to prevent false positives
# Each list contains tuple of (pattern, flags)
SPECIAL_PATTERNS = {
    "Go": [
        (r"\bgolang\b", re.IGNORECASE),
        (r"\bGo\b", 0),  # case-sensitive to avoid matching the English verb "go"
    ],
    "R": [
        (r"\bR\b", 0)  # case-sensitive to avoid matching the English letter "r"
    ],
    "C": [
        (r"\b[Cc]\b(?![+#\w])", 0)  # avoid matching C++ or C# or parts of other words
    ],
    "Java": [
        (r"\b[Jj]ava\b(?![Ss]cript)", 0)  # avoid matching JavaScript
    ],
    "C++": [(r"\b[Cc]\+\+", re.IGNORECASE)],
}


def get_canonical_skill(phrase: str) -> str | None:
    """Resolve a raw phrase/term to its canonical skill name if it exists in our taxonomy."""
    phrase_clean = phrase.strip().lower()
    for canonical, aliases in TAXONOMY.items():
        if phrase_clean == canonical.lower() or any(phrase_clean == a.lower() for a in aliases):
            return canonical
    return None


def match_skill_in_text(canonical_skill: str, text: str) -> bool:
    """Check if a canonical skill is mentioned in a text block, enforcing strict boundary rules."""
    if canonical_skill in SPECIAL_PATTERNS:
        # Use custom regexes
        for pattern_str, flags in SPECIAL_PATTERNS[canonical_skill]:
            if re.search(pattern_str, text, flags):
                return True
        return False

    # Standard matches: compile a regex for all aliases
    aliases = TAXONOMY.get(canonical_skill, [canonical_skill])
    # Escape and join with word boundaries
    escaped_aliases = [re.escape(a) for a in aliases]
    pattern_str = r"\b(" + "|".join(escaped_aliases) + r")\b"
    return bool(re.search(pattern_str, text, re.IGNORECASE))
