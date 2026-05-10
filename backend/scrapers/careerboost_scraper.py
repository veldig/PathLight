"""
CareerBoost scraper: curated + live jobs from RemoteOK, Arbeitnow, The Muse, and USAJobs.
Embeds and upserts into the Supabase `jobs` table.
"""
import os
import uuid
import re
import httpx
from lib.mongo_client import get_mongo
from ml.embeddings import embed_batch

CURATED = [
    {
        "title": "Remote Medical Coder",
        "company": "Health Information Alliance",
        "salary_range": "$40,000–$65,000/year",
        "salary_min": 40000, "salary_max": 65000,
        "remote": True, "childcare_benefits": False,
        "description": "Code medical records remotely using ICD-10 and CPT codes. Flexible hours — work evenings or early mornings around your family schedule. CPC certification preferred but on-the-job training available.",
        "tags": ["healthcare", "medical coding", "remote", "flexible hours"],
        "url": "https://www.ahima.org/career",
    },
    {
        "title": "Remote Bookkeeper (Part-Time)",
        "company": "Virtual Bookkeeping Firms",
        "salary_range": "$20–$35/hour",
        "salary_min": 20, "salary_max": 35,
        "remote": True, "childcare_benefits": False,
        "description": "Handle accounts payable/receivable, reconciliations, and payroll for small businesses remotely. Set your own schedule, typically 15–25 hours/week. QuickBooks experience helpful.",
        "tags": ["bookkeeping", "accounting", "part-time", "remote", "flexible"],
        "url": "https://www.flexjobs.com/jobs/bookkeeper",
    },
    {
        "title": "Customer Success Specialist",
        "company": "Remote-First SaaS Companies",
        "salary_range": "$45,000–$60,000/year",
        "salary_min": 45000, "salary_max": 60000,
        "remote": True, "childcare_benefits": True,
        "description": "Help customers get value from software products via email, chat, and video calls. Full-time remote with flexible core hours. Many companies offer childcare stipend ($1,500–$3,000/year) and parent-friendly culture.",
        "tags": ["customer success", "SaaS", "remote", "childcare benefits", "tech"],
        "url": "https://remoteok.com/remote-customer-success-jobs",
    },
    {
        "title": "Online Tutor — K-12 Math & Reading",
        "company": "Tutor.com / VarsityTutors",
        "salary_range": "$15–$30/hour",
        "salary_min": 15, "salary_max": 30,
        "remote": True, "childcare_benefits": False,
        "description": "Teach students online in math, reading, science, or test prep. Work evenings and weekends to fit your schedule. No formal teaching degree required — subject knowledge and patience are key.",
        "tags": ["tutoring", "education", "flexible hours", "evenings", "remote", "part-time"],
        "url": "https://www.tutor.com/apply",
    },
    {
        "title": "Social Media Manager (Async)",
        "company": "Digital Marketing Agencies",
        "salary_range": "$35,000–$55,000/year",
        "salary_min": 35000, "salary_max": 55000,
        "remote": True, "childcare_benefits": False,
        "description": "Create and schedule content for small business social media accounts. Completely asynchronous work — set your own hours around family responsibilities. Canva and basic analytics skills helpful.",
        "tags": ["social media", "marketing", "async", "remote", "creative", "flexible"],
        "url": "https://remoteok.com/remote-marketing-jobs",
    },
    {
        "title": "Remote Data Entry & Admin Assistant",
        "company": "Healthcare & Administrative Organizations",
        "salary_range": "$18–$28/hour",
        "salary_min": 18, "salary_max": 28,
        "remote": True, "childcare_benefits": False,
        "description": "Remote data entry, scheduling, and admin support. Consistent part-time hours (20–30/week). Great for structured schedules around school drop-off/pick-up.",
        "tags": ["administrative", "data entry", "part-time", "remote", "healthcare", "structured"],
        "url": "https://www.indeed.com/q-Remote-Data-Entry-jobs.html",
    },
    {
        "title": "Certified Nursing Assistant (CNA) — Per Diem",
        "company": "Local Hospitals and Care Facilities",
        "salary_range": "$18–$26/hour",
        "salary_min": 18, "salary_max": 26,
        "remote": False, "childcare_benefits": True,
        "description": "Per diem CNA shifts at hospitals and rehab facilities. Choose your own shifts — work only when childcare is available. Many employers offer childcare assistance and flexible scheduling for parents.",
        "tags": ["CNA", "healthcare", "per diem", "flexible shifts", "childcare benefits"],
        "url": "https://www.careerbuilder.com/jobs/nursing-assistant",
    },
    {
        "title": "Remote Intake Coordinator — Social Services",
        "company": "Community Health Organizations",
        "salary_range": "$32,000–$45,000/year",
        "salary_min": 32000, "salary_max": 45000,
        "remote": True, "childcare_benefits": True,
        "description": "Screen clients for social service eligibility, schedule appointments, and coordinate care. Remote with flexible hours. Childcare support often available.",
        "tags": ["social services", "healthcare", "remote", "childcare benefits", "community"],
        "url": "https://www.idealist.org/en/nonprofit-jobs",
    },
    {
        "title": "UX Research Assistant (Entry Level, Remote)",
        "company": "Tech & Design Firms",
        "salary_range": "$40,000–$55,000/year",
        "salary_min": 40000, "salary_max": 55000,
        "remote": True, "childcare_benefits": True,
        "description": "Conduct user interviews, analyze survey data, synthesize findings. Async-first culture with flexible scheduling. Great career-change role into tech.",
        "tags": ["UX research", "tech", "remote", "entry level", "flexible", "childcare benefits"],
        "url": "https://remoteok.com/remote-ux-jobs",
    },
    {
        "title": "Federal Government Administrative Specialist",
        "company": "U.S. Federal Government",
        "salary_range": "$42,000–$65,000/year",
        "salary_min": 42000, "salary_max": 65000,
        "remote": True, "childcare_benefits": True,
        "description": "Federal administrative roles with full benefits: health insurance, childcare FSA, paid family leave, retirement plan. Many positions now telework-eligible. Strong job security. Apply via USAJobs.gov.",
        "tags": ["government", "federal", "administrative", "benefits", "telework", "job security"],
        "url": "https://www.usajobs.gov/Search/Results?k=administrative+telework&p=1",
    },
    {
        "title": "Remote Contact Center Representative",
        "company": "Federal / State Government Agencies",
        "salary_range": "$35,000–$48,000/year",
        "salary_min": 35000, "salary_max": 48000,
        "remote": True, "childcare_benefits": True,
        "description": "Handle citizen inquiries for government agencies from home. Structured schedule, full federal benefits including childcare FSA. No degree required for many GS-5 level positions.",
        "tags": ["government", "customer service", "remote", "federal benefits", "no degree required"],
        "url": "https://www.usajobs.gov/Search/Results?k=contact+center&hp=public",
    },
    {
        "title": "Healthcare Navigator / Benefits Counselor",
        "company": "Nonprofit Health Clinics & FQHC",
        "salary_range": "$38,000–$52,000/year",
        "salary_min": 38000, "salary_max": 52000,
        "remote": True, "childcare_benefits": True,
        "description": "Help families enroll in Medicaid, CHIP, SNAP, and other benefits. Community health centers (FQHCs) offer excellent childcare assistance, loan repayment, and flexible remote work.",
        "tags": ["healthcare", "benefits counseling", "nonprofit", "remote", "mission-driven", "childcare"],
        "url": "https://findahealthcenter.hrsa.gov/",
    },
]


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", text or "").strip()


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
    all_jobs.extend(_fetch_arbeitnow())
    all_jobs.extend(_fetch_the_muse())
    all_jobs.extend(_fetch_usajobs())

    # Deduplicate by title+company
    seen = set()
    deduped = []
    for j in all_jobs:
        key = (j.get("title", "").lower(), j.get("company", "").lower())
        if key not in seen:
            seen.add(key)
            deduped.append(j)
    all_jobs = deduped

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
            "description": j.get("description", "")[:500],
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
            jobs = [j for j in data if isinstance(j, dict) and j.get("position")][:25]
            result = []
            for j in jobs:
                tags = j.get("tags") or []
                s_min, s_max = j.get("salary_min"), j.get("salary_max")
                if s_min and s_max:
                    salary_range = f"${int(s_min):,}–${int(s_max):,}/year"
                elif s_min:
                    salary_range = f"From ${int(s_min):,}/year"
                else:
                    salary_range = "Competitive"
                desc = _strip_html(j.get("description") or "")[:400]
                result.append({
                    "title": j.get("position", ""),
                    "company": j.get("company", ""),
                    "salary_range": salary_range,
                    "salary_min": s_min,
                    "salary_max": s_max,
                    "remote": True,
                    "childcare_benefits": False,
                    "description": desc,
                    "tags": (tags[:8] if isinstance(tags, list) else []),
                    "url": j.get("url") or j.get("apply_url", ""),
                })
            return result
    except Exception:
        return []


def _fetch_arbeitnow() -> list[dict]:
    """Free remote job board API — no key required."""
    try:
        with httpx.Client(timeout=12) as client:
            resp = client.get(
                "https://www.arbeitnow.com/api/job-board-api",
                headers={"Accept": "application/json"},
            )
            if resp.status_code != 200:
                return []
            jobs = resp.json().get("data", [])[:20]
            result = []
            for j in jobs:
                desc = _strip_html(j.get("description", ""))[:400]
                tags = j.get("tags") or []
                result.append({
                    "title": j.get("title", ""),
                    "company": j.get("company_name", ""),
                    "salary_range": "Competitive",
                    "salary_min": None,
                    "salary_max": None,
                    "remote": j.get("remote", True),
                    "childcare_benefits": False,
                    "description": desc,
                    "tags": (tags[:8] if isinstance(tags, list) else []),
                    "url": j.get("url", ""),
                })
            return result
    except Exception:
        return []


def _fetch_the_muse() -> list[dict]:
    """The Muse public jobs API — free, no key required for basic access."""
    try:
        with httpx.Client(timeout=12) as client:
            resp = client.get(
                "https://www.themuse.com/api/public/jobs",
                params={"page": 0, "level": "Entry Level", "location": "Flexible / Remote"},
                headers={"Accept": "application/json"},
            )
            if resp.status_code != 200:
                return []
            jobs = resp.json().get("results", [])[:15]
            result = []
            for j in jobs:
                levels = [lv.get("name", "") for lv in (j.get("levels") or [])]
                locations = [lo.get("name", "") for lo in (j.get("locations") or [])]
                is_remote = any("remote" in lo.lower() or "flexible" in lo.lower() for lo in locations)
                categories = [c.get("name", "") for c in (j.get("categories") or [])]
                company = (j.get("company") or {}).get("name", "")
                url = (j.get("refs") or {}).get("landing_page", "https://www.themuse.com/jobs")
                desc = _strip_html(j.get("contents") or "")[:400]
                result.append({
                    "title": j.get("name", ""),
                    "company": company,
                    "salary_range": "Competitive",
                    "salary_min": None,
                    "salary_max": None,
                    "remote": is_remote,
                    "childcare_benefits": False,
                    "description": desc or f"{', '.join(categories)} role at {company}.",
                    "tags": categories[:6] + levels[:2],
                    "url": url,
                })
            return result
    except Exception:
        return []


def _fetch_usajobs() -> list[dict]:
    """USAJobs federal government job listings. Requires USAJOBS_API_KEY env var."""
    api_key = os.environ.get("USAJOBS_API_KEY", "")
    user_email = os.environ.get("USAJOBS_EMAIL", "pathlight@pathlight.app")
    if not api_key:
        return []
    try:
        with httpx.Client(timeout=15) as client:
            resp = client.get(
                "https://data.usajobs.gov/api/search",
                params={
                    "Keyword": "remote telework flexible administrative",
                    "RemoteIndicator": True,
                    "ResultsPerPage": 20,
                    "SortField": "OpenDate",
                    "SortDirection": "Desc",
                },
                headers={
                    "Host": "data.usajobs.gov",
                    "User-Agent": user_email,
                    "Authorization-Key": api_key,
                },
            )
            if resp.status_code != 200:
                return []
            items = resp.json().get("SearchResult", {}).get("SearchResultItems", [])
            result = []
            for item in items[:20]:
                d = item.get("MatchedObjectDescriptor", {})
                title = d.get("PositionTitle", "")
                dept = d.get("DepartmentName", "U.S. Federal Government")
                uri = d.get("PositionURI", "https://www.usajobs.gov")
                apply_uri = d.get("ApplyURI", [uri])[0] if d.get("ApplyURI") else uri
                remunerations = d.get("PositionRemuneration", [{}])
                rem = remunerations[0] if remunerations else {}
                s_min = float(rem.get("MinimumRange", 0) or 0)
                s_max = float(rem.get("MaximumRange", 0) or 0)
                rate = rem.get("RateIntervalCode", "PA")
                if s_min and s_max:
                    if rate == "PH":
                        salary_range = f"${s_min:.0f}–${s_max:.0f}/hour"
                    else:
                        salary_range = f"${s_min:,.0f}–${s_max:,.0f}/year"
                else:
                    salary_range = "Federal Pay Scale"
                qualifications = _strip_html(
                    d.get("QualificationSummary", "")
                    or d.get("UserArea", {}).get("Details", {}).get("JobSummary", "")
                )[:400]
                result.append({
                    "title": title,
                    "company": dept,
                    "salary_range": salary_range,
                    "salary_min": s_min or None,
                    "salary_max": s_max or None,
                    "remote": True,
                    "childcare_benefits": True,
                    "description": qualifications or f"{title} — federal government role with full benefits including health insurance, retirement, and paid family leave.",
                    "tags": ["government", "federal", "benefits", "job security", "telework"],
                    "url": apply_uri,
                })
            return result
    except Exception:
        return []
