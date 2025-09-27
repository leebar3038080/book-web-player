from openai import OpenAI

client = OpenAI(api_key="YOUR_API_KEY")

def build_suggest_prompt(word, sentence_before, sentence_after):
    return f"""
You are an assistant that suggests better replacement words.
The goal is **not** to provide dictionary synonyms, but to propose
alternative words or phrases that capture the **literary tone, emotional feel,
and cultural context** of the text.

Context:
- Previous sentence: "{sentence_before}"
- Target word: "{word}"
- Next sentence: "{sentence_after}"

Guidelines:
1. Suggest 5 strong alternatives.
2. Each should sound natural in a **literary / narrative text**.
3. Focus on words that imply **place, feeling, or significance**, not just direct synonyms.
4. Avoid giving abstract or overly academic terms.
5. Do not repeat these sample examples, but use them as style inspiration:
   retreat, sanctuary, haven, gathering place, shrine.

Output:
List of 5 alternatives, each as a single word or short phrase.
"""

def get_suggestions(word, sentence_before, sentence_after):
    prompt = build_suggest_prompt(word, sentence_before, sentence_after)
    response = client.chat.completions.create(
        model="gpt-4o-mini",  # אפשר לשנות מודל לפי הצורך
        messages=[{"role": "user", "content": prompt}],
        temperature=0.9
    )
    return response.choices[0].message.content

# דוגמה להרצה
if __name__ == "__main__":
    word = "pilgrimage"
    before = "The locals for whom this house was also a"
    after = "site to eat and spend time."
    suggestions = get_suggestions(word, before, after)
    print("Suggestions:\n", suggestions)
