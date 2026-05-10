"""
CareerBoost scraper: curated flexible jobs + live RemoteOK API data.
Embeds and upserts into the Supabase `jobs` table.
"""
import uuid
import httpx
from lib.mongo_client import get_mongo
from ml.embeddings import embed_batch

CURATED = [
    {
        "title": "Remote Medical Coder",
        "company": "Health Information Alliance",
        "salary_range": "$40,000–$65,000/year",
        "salary_min": 40000,
        "salary_max": 65000,
        "remote": True,
        "childcare_benefits": False,
        "description": "Code medical records remotely using ICD-10 and CPT codes. Flexible hours — work evenings or early mornings around your family schedule. CPC certification preferred but on-the-job training available.",
        "tags": ["healthcare", "medical coding", "remote", "flexible hours"],
        "url": "https://www.ahima.org/career",
    },
    {
        "title": "Remote Bookkeeper (Part-Time)",
        "company": "Virtual Bookkeeping Firms",
        "salary_range": "$20–$35/hour",
        "salary_min": 20,
        "salary_max": 35,
        "remote": True,
        "childcare_benefits": False,
        "description": "Handle accounts payable/receivable, reconciliations, and payroll for small businesses remotely. Set your own schedule, typically 15–25 hours/week. QuickBooks experience helpful.",
        "tags": ["bookkeeping", "accounting", "part-time", "remote", "flexible"],
        "url": "https://www.flexjobs.com/jobs/bookkeeper",
    },
    {
        "title": "Customer Success Specialist",
        "company": "Remote-First SaaS Companies",
        "salary_range": "$45,000–$60,000/year",
        "salary_min": 45000,
        "salary_max": 60000,
        "remote": True,
        "childcare_benefits": True,
        "description": "Help customers get value from software products via email, chat, and video calls. Full-time remote with flexible core hours. Many companies offer childcare stipend ($1,500–$3,000/year) and parent-friendly culture.",
        "tags": ["customer success", "SaaS", "remote", "childcare benefits", "tech"],
        "url": "https://remoteok.com/remote-customer-success-jobs",
    },
    {
        "title": "Virtual Healthcare Patient Navigator",
        "company": "CareCoordination Networks",
        "salary_range": "$38,000–$52,000/year",
        "salary_min": 38000,
        "salary_max": 52000,
        "remote": True,
        "childcare_benefits": True,
        "description": "Guide patients through healthcare options, insurance, and community resources via phone and video. Empathy and communication skills valued over formal credentials. Paid training provided. Childcare assistance available.",
        "tags": ["healthcare", "patient advocacy", "remote", "childcare benefits", "social services"],
        "url": "https://www.flexjobs.com",
    },
    {
        "title": "Online Tutor — K-12 Math & Reading",
        "company": "Tutor.com / VarsityTutors",
        "salary_range": "$15–$30/hour",
        "salary_min": 15,
        "salary_max": 30,
        "remote": True,
        "childcare_benefits": False,
        "description": "Teach students online in math, reading, science, or test prep. Work evenings and weekends to fit your schedule. No formal teaching degree required — subject knowledge and patience are key.",
        "tags": ["tutoring", "education", "flexible hours", "evenings", "remote", "part-time"],
        "url": "https://www.tutor.com/apply",
    },
    {
        "title": "Social Media Manager (Async)",
        "company": "Digital Marketing Agencies",
        "salary_range": "$35,000–$55,000/year",
        "salary_min": 35000,
        "salary_max": 55000,
        "remote": True,
        "childcare_benefits": False,
        "description": "Create and schedule content for small business social media accounts. Completely asynchronous work — set your own hours around family responsibilities. Canva and basic analytics skills helpful.",
        "tags": ["social media", "marketing", "async", "remote", "creative", "flexible"],
        "url": "https://remoteok.com/remote-marketing-jobs",
    },
    {
        "title": "Remote Data Entry & Admin Assistant",
        "company": "Healthcare & Administrative Organizations",
        "salary_range": "$18–$28/hour",
        "salary_min": 18,
        "salary_max": 28,
        "remote": True,
        "childcare_benefits": False,
        "description": "Remote data entry, scheduling, and admin support for healthcare or business organizations. Consistent part-time hours (20–30/week). Great for structured schedules around school drop-off/pick-up.",
        "tags": ["administrative", "data entry", "part-time", "remote", "healthcare", "structured"],
        "url": "https://www.indeed.com/q-Remote-Data-Entry-jobs.html",
    },
    {
        "title": "Certified Nursing Assistant (CNA) — Per Diem",
        "company": "Local Hospitals and Care Facilities",
        "salary_range": "$18–$26/hour",
        "salary_min": 18,
        "salary_max": 26,
        "remote": False,
        "childcare_benefits": True,
        "description": "Per diem CNA shifts at hospitals, nursing homes, and rehab facilities. Choose your own shifts — work only when childcare is available. Many employers offer childcare assistance and flexible scheduling for parents.",
        "tags": ["CNA", "healthcare", "per diem", "flexible shifts", "childcare benefits"],
        "url": "https://www.careerbuilder.com/jobs/nursing-assistant",
    },
    {
        "title": "Remote Intake Coordinator — Social Services",
        "company": "Community Health Organizations",
        "salary_range": "$32,000–$45,000/year",
        "salary_min": 32000,
        "salary_max": 45000,
        "remote": True,
        "childcare_benefits": True,
        "description": "Screen clients for social service eligibility, schedule appointments, and coordinate care via phone and video. Mission-driven work. Remote or hybrid with flexible hours. Childcare support often available.",
        "tags": ["social services", "healthcare", "remote", "childcare benefits", "community"],
        "url": "https://www.idealist.org/en/nonprofit-jobs",
    },
    {
        "title": "UX Research Assistant (Entry Level, Remote)",
        "company": "Tech & Design Firms",
        "salary_range": "$40,000–$55,000/year",
        "salary_min": 40000,
        "salary_max": 55000,
        "remote": True,
        "childcare_benefits": True,
        "description": "Conduct user interviews, analyze survey data, and synthesize research findings. Entry-level role with training provided. Async-first culture with flexible scheduling. Great career path in tech for career-changers.",
        "tags": ["UX research", "tech", "remote", "entry level", "flexible", "childcare benefits"],
        "url": "https://remoteok.com/remote-ux-jobs",
    },
]


def _embed_text(j: dict) -> str:
    tags = ", ".join(j.get("tags") or [])
    childcare = "childcare benefits provided" if j.get("childcare_benefits") else ""
    mode = "fully remote work from home" if j.get("remote") else "on-site flexible shifts"
    return (
        f"job: {j['title']} at {j.get('company', '')} | {mode} | {childcare} | "
        f"{j.get('description', '')} | tags: {tags} | salary: {j.get('salary_range', '')}"
    )


def run(force: bool = False) -> int:
    db = get_mongo()
    if not force:
        if db["jobs"].count_documents({}) >= 5:
            return 0

    all_jobs = CURATED.copy()
    all_jobs.extend(_fetch_remoteok())

    texts = [_embed_text(j) for j in all_jobs]
    embeddings = embed_batch(texts) or [None] * len(all_jobs)

    rows = [
        {
            "id": str(uuid.uuid4()),
            "title": j["title"],
            "company": j.get("company", ""),
            "salary_range": j.get("salary_range", "Competitive"),
            "salary_min": j.get("salary_min"),
            "salary_max": j.get("salary_max"),
            "remote": j.get("remote", True),
            "childcare_benefits": j.get("childcare_benefits", False),
            "description": j.get("description", ""),
            "tags": j.get("tags", []),
            "url": j.get("url", ""),
            "embedding": embeddings[i],
        }
        for i, j in enumerate(all_jobs)
    ]

    for row in rows:
        db["jobs"].update_one({"title": row["title"], "company": row["company"]}, {"$set": row}, upsert=True)
    return len(rows)


def _fetch_remoteok() -> list[dict]:
    try:
        with httpx.Client(timeout=12) as client:
            resp = client.get(
                "https://remoteok.com/api",
                headers={"User-Agent": "PathLight/1.0 Remote Job Search for Single Parents"},
            )
            if resp.status_code != 200:
                return []

            data = resp.json()
            jobs = [j for j in data if isinstance(j, dict) and j.get("position")][:20]
            result = []
            for j in jobs:
                tags = j.get("tags") or []
                s_min = j.get("salary_min")
                s_max = j.get("salary_max")
                if s_min and s_max:
                    salary_range = f"${int(s_min):,}–${int(s_max):,}/year"
                elif s_min:
                    salary_range = f"From ${int(s_min):,}/year"
                else:
                    salary_range = "Competitive"

                desc = j.get("description") or ""
                # Strip HTML tags simply
                import re
                desc = re.sub(r"<[^>]+>", " ", desc).strip()[:500]

                result.append({
                    "title": j.get("position", ""),
                    "company": j.get("company", ""),
                    "salary_range": salary_range,
                    "salary_min": s_min,
                    "salary_max": s_max,
                    "remote": True,
                    "childcare_benefits": False,
                    "description": desc,
                    "tags": tags[:8] if isinstance(tags, list) else [],
                    "url": j.get("url") or j.get("apply_url", ""),
                })
            return result
    except Exception:
        pass
    return []
