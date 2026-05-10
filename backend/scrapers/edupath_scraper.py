"""
EduPath scraper: curated online courses + live Coursera catalog data.
Embeds and upserts into the Supabase `courses` table.
"""
import uuid
import httpx
from lib.supabase_client import get_supabase
from ml.embeddings import embed_batch

CURATED = [
    # Healthcare
    {
        "name": "Healthcare Administration Certificate",
        "provider": "Coursera / University of Minnesota",
        "credits": 3,
        "online": True,
        "field": "Healthcare",
        "description": "Explore structure and operations of healthcare organizations. Covers finance, law, HR, and quality improvement. Ideal for careers as medical office manager or healthcare coordinator.",
        "duration_weeks": 8,
        "url": "https://www.coursera.org/learn/healthcare-administration",
    },
    {
        "name": "Medical Billing and Coding Career Diploma",
        "provider": "Penn Foster College",
        "credits": 30,
        "online": True,
        "field": "Healthcare",
        "description": "Self-paced medical billing and coding program. Typically completed in 4–6 months. Prepares for CPC and CCA certification exams. High job demand, fully remote career path.",
        "duration_weeks": 24,
        "url": "https://www.pennfoster.edu/programs/healthcare/medical-billing-and-coding-career-diploma",
    },
    {
        "name": "Pharmacy Technician Certificate",
        "provider": "Coursera / UC San Diego",
        "credits": 6,
        "online": True,
        "field": "Healthcare",
        "description": "Prepare for the Pharmacy Technician Certification Exam (PTCE). Learn drug classifications, compounding, and pharmacy law. Entry to stable healthcare career with flexible hours.",
        "duration_weeks": 20,
        "url": "https://www.coursera.org/professional-certificates/pharmacy-technician",
    },
    # Business
    {
        "name": "Business Foundations Specialization",
        "provider": "Coursera / Wharton School, UPenn",
        "credits": 4,
        "online": True,
        "field": "Business",
        "description": "Core business concepts: marketing, accounting, operations, and people management. Build a business foundation applicable to any career. Financial aid available on Coursera.",
        "duration_weeks": 12,
        "url": "https://www.coursera.org/specializations/wharton-business-foundations",
    },
    {
        "name": "Intuit Academy Bookkeeping Certificate",
        "provider": "Coursera / Intuit",
        "credits": 2,
        "online": True,
        "field": "Business",
        "description": "Learn QuickBooks and bookkeeping fundamentals for small businesses. Earn an Intuit-recognized certificate. High demand skill with good remote freelance income potential.",
        "duration_weeks": 6,
        "url": "https://www.coursera.org/learn/intuit-bookkeeping",
    },
    # Technology
    {
        "name": "Google Data Analytics Professional Certificate",
        "provider": "Coursera / Google",
        "credits": 6,
        "online": True,
        "field": "Technology / Data",
        "description": "Prepare for an entry-level data analyst role in about 6 months at your own pace. Covers SQL, Tableau, R, and spreadsheets. No prior experience needed. Financial aid available.",
        "duration_weeks": 26,
        "url": "https://www.coursera.org/professional-certificates/google-data-analytics",
    },
    {
        "name": "Google Project Management Certificate",
        "provider": "Coursera / Google",
        "credits": 6,
        "online": True,
        "field": "Technology / Business",
        "description": "Learn project management principles, Agile frameworks, and tools like Asana and Jira. Prepare for PMP and CAPM certifications. No degree required. High demand, remote-friendly career.",
        "duration_weeks": 26,
        "url": "https://www.coursera.org/professional-certificates/google-project-management",
    },
    {
        "name": "Meta Front-End Developer Professional Certificate",
        "provider": "Coursera / Meta",
        "credits": 8,
        "online": True,
        "field": "Technology / Web Development",
        "description": "Build job-ready web development skills with HTML, CSS, JavaScript, and React. 9-month self-paced program. Portfolio-building projects included. Launch a new remote career in tech.",
        "duration_weeks": 36,
        "url": "https://www.coursera.org/professional-certificates/meta-front-end-developer",
    },
    # Education / Childcare
    {
        "name": "Child Development Associate (CDA) Credential Prep",
        "provider": "Child Development Institute / CDA Council",
        "credits": 4,
        "online": True,
        "field": "Early Childhood Education",
        "description": "Prepare for the nationally recognized CDA credential. Opens doors in early childhood education, Head Start, and childcare center management. Pairs well with real-world childcare experience.",
        "duration_weeks": 16,
        "url": "https://www.cdacouncil.org/en/get-your-cda",
    },
    {
        "name": "Child and Adolescent Psychology",
        "provider": "Coursera / University of California",
        "credits": 3,
        "online": True,
        "field": "Psychology / Social Work",
        "description": "Understand child development, behavior, and family dynamics from birth through adolescence. Valuable for social work, counseling, education, healthcare, or personal parenting knowledge.",
        "duration_weeks": 8,
        "url": "https://www.coursera.org/learn/child-development",
    },
    # Social Work
    {
        "name": "Introduction to Social Work and Social Welfare",
        "provider": "edX / University of Michigan",
        "credits": 3,
        "online": True,
        "field": "Social Work",
        "description": "Explore social work practice, ethics, and social welfare policy. Foundation course for BSW programs. Learn to help families navigate complex systems. Good primer before applying to social work degree.",
        "duration_weeks": 8,
        "url": "https://www.edx.org/course/introduction-to-social-work",
    },
    # General Education
    {
        "name": "English Composition and Writing",
        "provider": "Khan Academy (Free)",
        "credits": 3,
        "online": True,
        "field": "General Education / Communication",
        "description": "Completely free. Improve writing for college, career, and everyday communication. Covers grammar, essays, research papers, and professional writing. Learn at your own pace.",
        "duration_weeks": 12,
        "url": "https://www.khanacademy.org/humanities/grammar",
    },
    {
        "name": "College Algebra and Pre-Calculus",
        "provider": "Khan Academy (Free)",
        "credits": 3,
        "online": True,
        "field": "Mathematics",
        "description": "Free comprehensive algebra coursework. Essential prerequisite for nursing, healthcare, business, and STEM degrees. Includes practice problems and instant feedback. Fully self-paced.",
        "duration_weeks": 16,
        "url": "https://www.khanacademy.org/math/algebra",
    },
    # Financial / Personal Development
    {
        "name": "Personal Finance and Family Budgeting",
        "provider": "Udemy",
        "credits": 1,
        "online": True,
        "field": "Personal Finance",
        "description": "Master budgeting, emergency funds, debt reduction, and financial planning for single-income families. Directly applicable to managing finances while in school on a limited income.",
        "duration_weeks": 4,
        "url": "https://www.udemy.com/topic/personal-finance/",
    },
    {
        "name": "Communication and Leadership Skills",
        "provider": "Coursera / University of Colorado",
        "credits": 3,
        "online": True,
        "field": "Business / Leadership",
        "description": "Develop communication, negotiation, and leadership skills for the modern workplace. Applicable to nearly any career path. Strong communication is the top skill requested by employers.",
        "duration_weeks": 10,
        "url": "https://www.coursera.org/learn/communication-leadership",
    },
]


def _embed_text(c: dict) -> str:
    mode = "online self-paced" if c.get("online") else "in-person"
    return (
        f"course education: {c['name']} | provider: {c.get('provider', '')} | "
        f"field: {c.get('field', '')} | {mode} | {c.get('description', '')} | "
        f"duration: {c.get('duration_weeks', '')} weeks | credits: {c.get('credits', '')}"
    )


def run(force: bool = False) -> int:
    try:
        return _run(force)
    except Exception:
        return 0


def _run(force: bool = False) -> int:
    sb = get_supabase()
    if not force:
        existing = sb.table("courses").select("id", count="exact").execute()
        if (existing.count or 0) >= 5:
            return 0

    all_courses = CURATED.copy()
    all_courses.extend(_fetch_coursera())

    texts = [_embed_text(c) for c in all_courses]
    embeddings = embed_batch(texts) or [None] * len(all_courses)

    rows = [
        {
            "id": str(uuid.uuid4()),
            "name": c["name"],
            "provider": c.get("provider", ""),
            "credits": c.get("credits", 3),
            "online": c.get("online", True),
            "field": c.get("field", ""),
            "description": c.get("description", ""),
            "duration_weeks": c.get("duration_weeks"),
            "url": c.get("url", ""),
            "embedding": embeddings[i],
        }
        for i, c in enumerate(all_courses)
    ]

    sb.table("courses").upsert(rows).execute()
    return len(rows)


def _fetch_coursera() -> list[dict]:
    try:
        with httpx.Client(timeout=12) as client:
            resp = client.get(
                "https://api.coursera.org/api/courses.v1",
                params={
                    "q": "search",
                    "query": "healthcare nursing social work education business",
                    "fields": "name,description,slug",
                    "limit": 12,
                },
            )
            if resp.status_code == 200:
                elements = resp.json().get("elements", [])
                return [
                    {
                        "name": e.get("name", ""),
                        "provider": "Coursera",
                        "credits": 3,
                        "online": True,
                        "field": "Online Learning",
                        "description": (e.get("description") or "")[:350],
                        "duration_weeks": 8,
                        "url": f"https://www.coursera.org/learn/{e.get('slug', '')}",
                    }
                    for e in elements
                    if e.get("name")
                ]
    except Exception:
        pass
    return []
