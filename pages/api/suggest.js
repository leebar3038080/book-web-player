import openai

openai.api_key = "YOUR_API_KEY"

def build_suggest_prompt(word, sentence_before, sentence_after):
    return f"""
You are an assistant that suggests replacement words.

Target word: "{word}"
Previous sentence: "{sentence_before}"
Next sentence: "{sentence_after}"

Instructions:
1. Suggest 5 alternatives that can **fit grammatically in the exact same place** as the target word.
2. Each suggestion should be **one word** (preferred) or at most **two words**.
3. The replacement must sound **natural and literary** in the given context.
4. Avoid phrases that are too long or break grammar (e.g., "still tender young" does not fit).
5. Focus on alternatives that capture the **emotional and cultural nuance** of the text, not just dictionary synonyms.

Output: A list of 5 alternatives.
"""

def get_suggestions(word, sentence_before, sentence_after):
    prompt = build_suggest_prompt(word, sentence_before, sentence_after)

    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a literary writing assistant."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=150,
        temperature=0.8,
        n=1
    )

    return response.choices[0].message.content.strip()

# דוגמה לשימוש
if __name__ == "__main__":
    word = "essentially"
    sentence_before = "She was only two years old."
    sentence_after = "Only to an outsider did the young girl appear older."
    
    suggestions = get_suggestions(word, sentence_before, sentence_after)
    print("Suggestions:\n", suggestions)
