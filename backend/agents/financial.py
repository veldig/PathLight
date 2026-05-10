import anthropic
import json
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def load_prompt():
    prompt_path = os.path.join(os.path.dirname(__file__), 
                               "../prompts/financial_prompt.txt")
    with open(prompt_path, "r") as f:
        return f.read()

def run_financial_agent(user_profile: dict) -> dict:
    try:
        system_prompt = load_prompt()

        user_message = f"""Here is the student parent profile to analyze:

Name: {user_profile.get('name', 'Unknown')}
School: {user_profile.get('school', 'Unknown')}
Major: {user_profile.get('major', 'Unknown')}
Number of Children: {user_profile.get('num_children', 'Unknown')}
Work Hours per Week: {user_profile.get('work_hours_per_week', 'Unknown')}
Monthly Income: {user_profile.get('monthly_income', 'Unknown')}
Monthly Expenses: {user_profile.get('monthly_expenses', 'Unknown')}
Biggest Financial Stress: {user_profile.get('biggest_financial_stress', 'Unknown')}
State: {user_profile.get('state', 'Unknown')}
FAFSA Completed: {user_profile.get('fafsa_completed', 'Unknown')}
Class Schedule: {json.dumps(user_profile.get('class_schedule', []), indent=2)}

Please analyze this profile and return the financial plan JSON."""

        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=4000,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_message}
            ]
        )

        response_text = response.content[0].text.strip()

        # Remove markdown code blocks if Claude adds them
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()

        return json.loads(response_text)

    except json.JSONDecodeError as e:
        return {
            "error": "Failed to parse Claude's response as JSON",
            "details": str(e),
            "raw_response": response_text if 'response_text' in locals() else None,
            "first_100_chars": response_text[:100] if 'response_text' in locals() else None
        }
    except anthropic.AuthenticationError:
        return {"error": "Invalid API key. Check your ANTHROPIC_API_KEY."}
    except anthropic.RateLimitError:
        return {"error": "Rate limit reached. Please try again shortly."}
    except anthropic.APIStatusError as e:
        return {"error": f"API error ({e.status_code}): {e.message}"}
    except anthropic.APIConnectionError:
        return {"error": "Network error. Check your internet connection."}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}