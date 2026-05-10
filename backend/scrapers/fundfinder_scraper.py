"""
FundFinder scraper: curated single-parent grants/scholarships + live Grants.gov API data.
Embeds and upserts into the Supabase `scholarships` table.
"""
import uuid
import httpx
from lib.supabase_client import get_supabase
from ml.embeddings import embed_batch

CURATED = [
    {
        "name": "Federal Pell Grant",
        "source": "U.S. Department of Education",
        "amount": 7395,
        "deadline": "June 30 annually — complete FAFSA early",
        "description": "Need-based federal grant for undergraduate students. No repayment required. Single parents often qualify due to low Expected Family Contribution (EFC). Award amount depends on income, family size, and enrollment status.",
        "requirements": ["Complete the FAFSA", "Enrolled at least half-time at accredited institution", "Demonstrated financial need", "U.S. citizen or eligible non-citizen", "Undergraduate student"],
        "url": "https://studentaid.gov/understand-aid/types/grants/pell",
    },
    {
        "name": "Patsy Takemoto Mink Education Foundation Award",
        "source": "Patsy T. Mink Foundation",
        "amount": 5000,
        "deadline": "January 31",
        "description": "For low-income women continuing their education while raising children under 18. Named after the first woman of color elected to U.S. Congress. Prioritizes women returning to school after a gap.",
        "requirements": ["Mother with children under 18 at home", "Low-income household", "Attending accredited U.S. institution", "GPA 2.0 or higher"],
        "url": "https://www.patsytminkfoundation.org/education-foundation.html",
    },
    {
        "name": "Soroptimist Live Your Dream Award",
        "source": "Soroptimist International of the Americas",
        "amount": 10000,
        "deadline": "November 15",
        "description": "Financial support for women who are the primary financial provider for their families while pursuing education or vocational training. Multiple award tiers from local to international level.",
        "requirements": ["Primary financial provider for dependents", "Enrolled in vocational or undergraduate program", "Demonstrated financial need", "Not enrolled in a graduate program"],
        "url": "https://www.soroptimist.org/scholarships/live-your-dream.html",
    },
    {
        "name": "Jeannette Rankin Women's Scholarship",
        "source": "Jeannette Rankin Foundation",
        "amount": 2000,
        "deadline": "March 1",
        "description": "Supports low-income women age 35 and older pursuing education. Priority given to non-traditional students including single mothers returning to school.",
        "requirements": ["Woman age 35 or older", "U.S. citizen or permanent resident", "Demonstrated financial need", "Enrolled in accredited technical or bachelor's program"],
        "url": "https://www.rankinfoundation.org",
    },
    {
        "name": "AAUW Selected Professions Fellowships",
        "source": "American Association of University Women",
        "amount": 20000,
        "deadline": "December 1",
        "description": "Fellowships for women enrolled full-time in underrepresented fields including engineering, computer science, and business. Open to master's and doctoral candidates.",
        "requirements": ["U.S. citizen or permanent resident", "Full-time graduate enrollment", "Field: STEM, computer science, or business", "Demonstrated academic excellence"],
        "url": "https://www.aauw.org/resources/programs/fellowships-grants/",
    },
    {
        "name": "Single Parent Scholarship Fund",
        "source": "Single Parent Scholarship Fund",
        "amount": 3000,
        "deadline": "Rolling — varies by regional chapter",
        "description": "Dedicated financial support for single parents pursuing higher education to improve family economic stability. Chapters in Arkansas and partner states. Also offers mentoring and professional development.",
        "requirements": ["Single parent with at least one dependent child", "Enrolled in accredited institution", "GPA 2.0 or higher", "Demonstrated financial need", "Personal essay required"],
        "url": "https://spsf.org",
    },
    {
        "name": "Child Care Access Means Parents in School (CCAMPIS)",
        "source": "U.S. Department of Education",
        "amount": 5000,
        "deadline": "Apply through your college's financial aid office",
        "description": "Federal program providing campus-based or near-campus childcare subsidies for low-income student parents. Contact your institution's childcare or financial aid office to apply.",
        "requirements": ["Enrolled student parent at participating institution", "Low income (federal guidelines)", "Child under 13", "Must attend institution that receives CCAMPIS funding"],
        "url": "https://www2.ed.gov/programs/campisp/index.html",
    },
    {
        "name": "TANF Education and Training Assistance",
        "source": "Federal TANF Program — apply through state social services",
        "amount": 5000,
        "deadline": "Rolling — contact your local TANF office",
        "description": "Temporary Assistance for Needy Families can fund education and vocational training for low-income single parents. Covers tuition, books, and sometimes childcare as part of a self-sufficiency plan.",
        "requirements": ["Income below state threshold", "Single parent or guardian of dependent child", "Education/training leads to employment", "U.S. citizen or eligible non-citizen"],
        "url": "https://www.acf.hhs.gov/ofa/programs/tanf",
    },
    {
        "name": "Child Care and Development Fund (CCDF / CCAP)",
        "source": "Child Care and Development Fund — Federal/State",
        "amount": 8000,
        "deadline": "Rolling — apply through your state's childcare agency",
        "description": "The Child Care and Development Fund provides childcare subsidies for low-income parents who are working, in school, or in job training. Reduces or eliminates childcare costs while you pursue your degree.",
        "requirements": ["Low-income parent or guardian", "Child under 13", "Parent employed, in school, or in approved training program", "Meet state-specific income requirements"],
        "url": "https://www.childcare.gov/consumer-education/get-help-paying-for-child-care",
    },
    {
        "name": "Raise the Nation Scholarship",
        "source": "Raise the Nation",
        "amount": 2500,
        "deadline": "April 15",
        "description": "Specifically designed for single parents working to improve their family's future through higher education. Recognizes resilience and dedication of single-parent households.",
        "requirements": ["Single parent status", "Demonstrated financial need", "500-word personal essay", "Two letters of recommendation", "GPA 2.5 or higher"],
        "url": "https://www.raisethenation.org",
    },
    {
        "name": "Hispanic Scholarship Fund",
        "source": "Hispanic Scholarship Fund",
        "amount": 5000,
        "deadline": "February 15",
        "description": "Scholarship for Hispanic and Latino students pursuing higher education. Strong preference for first-generation college students and those from low-income households, including single parents.",
        "requirements": ["Hispanic or Latino heritage", "U.S. citizen, permanent resident, or DACA recipient", "GPA 3.0 or higher", "Enrolled full-time at accredited institution"],
        "url": "https://www.hsf.net/scholarship",
    },
    {
        "name": "Gates Scholarship",
        "source": "Bill & Melinda Gates Foundation",
        "amount": 30000,
        "deadline": "September 15",
        "description": "Full scholarship covering unmet financial need for outstanding minority students with significant need. Renewable for all four years. Includes leadership development programming.",
        "requirements": ["African American, American Indian/Alaska Native, Asian & Pacific Islander American, or Hispanic American", "Pell Grant eligible", "High school senior or college freshman", "GPA 3.3 or higher"],
        "url": "https://www.thegatesscholarship.org",
    },
]


def _embed_text(s: dict) -> str:
    reqs = " | ".join(s.get("requirements") or [])
    return (
        f"scholarship grant funding: {s['name']} | source: {s.get('source', '')} | "
        f"amount: ${s.get('amount', 0):,} | {s.get('description', '')} | "
        f"requirements: {reqs}"
    )


def run(force: bool = False) -> int:
    try:
        return _run(force)
    except Exception:
        return 0


def _run(force: bool = False) -> int:
    sb = get_supabase()
    if not force:
        existing = sb.table("scholarships").select("id", count="exact").execute()
        if (existing.count or 0) >= 5:
            return 0

    all_items = CURATED.copy()
    all_items.extend(_fetch_grants_gov())

    texts = [_embed_text(s) for s in all_items]
    embeddings = embed_batch(texts) or [None] * len(all_items)

    rows = [
        {
            "id": str(uuid.uuid4()),
            "name": s["name"],
            "source": s.get("source", ""),
            "amount": s.get("amount", 0),
            "deadline": s.get("deadline", ""),
            "description": s.get("description", ""),
            "requirements": s.get("requirements", []),
            "url": s.get("url", ""),
            "embedding": embeddings[i],
        }
        for i, s in enumerate(all_items)
    ]

    sb.table("scholarships").upsert(rows).execute()
    return len(rows)


def _fetch_grants_gov() -> list[dict]:
    try:
        with httpx.Client(timeout=12) as client:
            resp = client.post(
                "https://apply07.grants.gov/grantsws/rest/opportunities/search/",
                json={
                    "keyword": "education single parent family childcare low income women",
                    "oppStatuses": "posted",
                    "rows": 10,
                    "startRecordNum": 0,
                },
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code == 200:
                hits = resp.json().get("oppHits", [])
                return [
                    {
                        "name": h.get("title", "Federal Grant"),
                        "source": h.get("agencyName", "Federal Agency"),
                        "amount": h.get("awardCeiling") or 5000,
                        "deadline": h.get("closeDate", "See full announcement"),
                        "description": (h.get("synopsis") or h.get("title", ""))[:400],
                        "requirements": ["See full grant announcement for eligibility details"],
                        "url": f"https://www.grants.gov/search-results-detail/{h.get('id', '')}",
                    }
                    for h in hits
                    if h.get("title")
                ]
    except Exception:
        pass
    return []
