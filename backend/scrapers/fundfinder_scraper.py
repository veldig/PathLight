"""
FundFinder scraper: scholarships, government aid, grants, and childcare programs.
Sources: curated dataset, Grants.gov API, and additional live sources.
Embeds and upserts into the Supabase `scholarships` table.
"""
import uuid
import httpx
from lib.supabase_client import get_supabase
from ml.embeddings import embed_batch

CURATED = [
    # ── Federal Education Grants ──────────────────────────────────────────────
    {
        "name": "Federal Pell Grant",
        "source": "U.S. Department of Education",
        "amount": 7395,
        "deadline": "June 30 annually — complete FAFSA as early as October 1",
        "description": "Need-based federal grant for undergraduate students. No repayment required. Single parents often qualify due to low Expected Family Contribution. Award depends on income, family size, and enrollment.",
        "requirements": ["Complete the FAFSA", "Enrolled at least half-time at accredited institution", "Demonstrated financial need", "U.S. citizen or eligible non-citizen", "Undergraduate student"],
        "url": "https://studentaid.gov/understand-aid/types/grants/pell",
        "type": "education",
    },
    {
        "name": "Iraq and Afghanistan Service Grant",
        "source": "U.S. Department of Education",
        "amount": 6895,
        "deadline": "See FAFSA deadlines",
        "description": "For students whose parent or guardian died as a result of military service in Iraq or Afghanistan after 9/11. Does not require demonstrated financial need.",
        "requirements": ["Parent/guardian died in military service post-9/11", "Under 24 or enrolled in college when parent died", "U.S. citizen or eligible non-citizen"],
        "url": "https://studentaid.gov/understand-aid/types/grants/iraq-afghanistan-service",
        "type": "education",
    },
    {
        "name": "TEACH Grant",
        "source": "U.S. Department of Education",
        "amount": 4000,
        "deadline": "Complete FAFSA — award given per academic year",
        "description": "For students planning to teach in high-need fields at low-income schools. Up to $4,000/year. Single parents who commit to teaching can benefit significantly.",
        "requirements": ["Pursuing degree in education or teaching", "Agree to teach 4 years at low-income school", "Enrolled in TEACH-eligible program", "Meet academic achievement requirement"],
        "url": "https://studentaid.gov/understand-aid/types/grants/teach",
        "type": "education",
    },
    # ── Scholarships for Single Parents ──────────────────────────────────────
    {
        "name": "Single Parent Scholarship Fund",
        "source": "Single Parent Scholarship Fund",
        "amount": 3000,
        "deadline": "Rolling — varies by regional chapter",
        "description": "Dedicated support for single parents pursuing higher education to improve family economic stability. Offers mentoring and professional development alongside funding.",
        "requirements": ["Single parent with at least one dependent child", "Enrolled in accredited institution", "GPA 2.0 or higher", "Demonstrated financial need", "Personal essay required"],
        "url": "https://spsf.org",
        "type": "scholarship",
    },
    {
        "name": "Soroptimist Live Your Dream Award",
        "source": "Soroptimist International of the Americas",
        "amount": 10000,
        "deadline": "November 15",
        "description": "Financial support for women who are the primary financial provider for their families while pursuing education or vocational training. Multiple award tiers up to $10,000.",
        "requirements": ["Primary financial provider for dependents", "Enrolled in vocational or undergraduate program", "Demonstrated financial need", "Not enrolled in a graduate program"],
        "url": "https://www.soroptimist.org/scholarships/live-your-dream.html",
        "type": "scholarship",
    },
    {
        "name": "Patsy Takemoto Mink Education Foundation Award",
        "source": "Patsy T. Mink Foundation",
        "amount": 5000,
        "deadline": "January 31",
        "description": "For low-income women continuing their education while raising children under 18. Prioritizes women returning to school after a gap.",
        "requirements": ["Mother with children under 18", "Low-income household", "Attending accredited U.S. institution", "GPA 2.0 or higher"],
        "url": "https://www.patsytminkfoundation.org/education-foundation.html",
        "type": "scholarship",
    },
    {
        "name": "Jeannette Rankin Women's Scholarship",
        "source": "Jeannette Rankin Foundation",
        "amount": 2000,
        "deadline": "March 1",
        "description": "Supports low-income women age 35 and older pursuing education. Priority given to non-traditional students including single mothers returning to school.",
        "requirements": ["Woman age 35 or older", "U.S. citizen or permanent resident", "Demonstrated financial need", "Enrolled in accredited technical or bachelor's program"],
        "url": "https://www.rankinfoundation.org",
        "type": "scholarship",
    },
    {
        "name": "Raise the Nation Scholarship",
        "source": "Raise the Nation",
        "amount": 2500,
        "deadline": "April 15",
        "description": "Specifically designed for single parents working to improve their family's future through higher education.",
        "requirements": ["Single parent status", "Demonstrated financial need", "500-word personal essay", "Two letters of recommendation", "GPA 2.5 or higher"],
        "url": "https://www.raisethenation.org",
        "type": "scholarship",
    },
    {
        "name": "Hispanic Scholarship Fund",
        "source": "Hispanic Scholarship Fund",
        "amount": 5000,
        "deadline": "February 15",
        "description": "Scholarship for Hispanic and Latino students. Strong preference for first-generation college students and low-income households including single parents.",
        "requirements": ["Hispanic or Latino heritage", "U.S. citizen, permanent resident, or DACA recipient", "GPA 3.0 or higher", "Enrolled full-time"],
        "url": "https://www.hsf.net/scholarship",
        "type": "scholarship",
    },
    {
        "name": "Gates Scholarship",
        "source": "Bill & Melinda Gates Foundation",
        "amount": 30000,
        "deadline": "September 15",
        "description": "Full scholarship covering unmet financial need for outstanding minority students. Renewable for all four years with leadership development programming.",
        "requirements": ["African American, American Indian, Asian & Pacific Islander, or Hispanic", "Pell Grant eligible", "High school senior or college freshman", "GPA 3.3 or higher"],
        "url": "https://www.thegatesscholarship.org",
        "type": "scholarship",
    },
    {
        "name": "AAUW Selected Professions Fellowships",
        "source": "American Association of University Women",
        "amount": 20000,
        "deadline": "December 1",
        "description": "Fellowships for women enrolled in underrepresented fields including engineering, computer science, and business.",
        "requirements": ["U.S. citizen or permanent resident", "Full-time graduate enrollment", "Field: STEM, computer science, or business"],
        "url": "https://www.aauw.org/resources/programs/fellowships-grants/",
        "type": "scholarship",
    },
    # ── Childcare & Family Assistance ─────────────────────────────────────────
    {
        "name": "Child Care and Development Fund (CCDF / CCAP)",
        "source": "U.S. Department of Health & Human Services",
        "amount": 8000,
        "deadline": "Rolling — apply through your state's childcare agency",
        "description": "The Child Care and Development Fund provides childcare subsidies for low-income parents who are working, in school, or in job training. Reduces or eliminates childcare costs.",
        "requirements": ["Low-income parent or guardian", "Child under 13", "Parent employed, in school, or in approved training program", "Meet state-specific income requirements"],
        "url": "https://www.childcare.gov/consumer-education/get-help-paying-for-child-care",
        "type": "childcare",
    },
    {
        "name": "Child Care Access Means Parents in School (CCAMPIS)",
        "source": "U.S. Department of Education",
        "amount": 5000,
        "deadline": "Apply through your college's financial aid office",
        "description": "Federal program providing campus-based or near-campus childcare subsidies for low-income student parents. Contact your institution's financial aid office.",
        "requirements": ["Enrolled student parent at participating institution", "Low income (federal guidelines)", "Child under 13", "Must attend institution that receives CCAMPIS funding"],
        "url": "https://www2.ed.gov/programs/campisp/index.html",
        "type": "childcare",
    },
    {
        "name": "Head Start / Early Head Start",
        "source": "U.S. Department of Health & Human Services",
        "amount": 10000,
        "deadline": "Rolling — apply through your local Head Start program",
        "description": "Free comprehensive early childhood education, health, nutrition, and parent involvement services for low-income families with children ages birth to 5. Covers full-day or part-day childcare.",
        "requirements": ["Family income at or below federal poverty guidelines", "Child age birth to 5 years", "Some programs accept children in foster care or with disabilities regardless of income"],
        "url": "https://www.acf.hhs.gov/ohs/about/head-start",
        "type": "childcare",
    },
    # ── Government Aid / Safety Net ────────────────────────────────────────────
    {
        "name": "SNAP (Supplemental Nutrition Assistance Program)",
        "source": "U.S. Department of Agriculture",
        "amount": 6000,
        "deadline": "Rolling — apply any time at your local SNAP office or Benefits.gov",
        "description": "Monthly food assistance benefits loaded onto an EBT card. Single parents with children typically qualify. Average benefit is $500+/month for a family of 3. Apply online at your state's benefits portal.",
        "requirements": ["Household income at or below 130% of poverty line", "Meet work requirements (waived for parents with dependent children under 6)", "U.S. citizen or qualified non-citizen"],
        "url": "https://www.fns.usda.gov/snap/recipient/eligibility",
        "type": "government_aid",
    },
    {
        "name": "WIC (Women, Infants, and Children Nutrition Program)",
        "source": "U.S. Department of Agriculture",
        "amount": 3600,
        "deadline": "Rolling — apply at your local WIC clinic",
        "description": "Nutritious foods, breastfeeding support, and health referrals for pregnant women, new mothers, and children up to age 5. Valued at $300+/month. Free to apply.",
        "requirements": ["Pregnant, postpartum, or breastfeeding woman, or child under 5", "Income at or below 185% of federal poverty level", "Determined nutritionally at risk by WIC health professional"],
        "url": "https://www.fns.usda.gov/wic",
        "type": "government_aid",
    },
    {
        "name": "TANF Education and Training Assistance",
        "source": "Federal TANF Program — state social services",
        "amount": 5000,
        "deadline": "Rolling — contact your local TANF office",
        "description": "Temporary Assistance for Needy Families can fund education and vocational training for low-income single parents. Covers tuition, books, and sometimes childcare as part of a self-sufficiency plan.",
        "requirements": ["Income below state threshold", "Single parent or guardian of dependent child", "Education/training leads to employment", "U.S. citizen or eligible non-citizen"],
        "url": "https://www.acf.hhs.gov/ofa/programs/tanf",
        "type": "government_aid",
    },
    {
        "name": "Medicaid / CHIP for Families",
        "source": "Centers for Medicare & Medicaid Services",
        "amount": 12000,
        "deadline": "Rolling — apply any time at Healthcare.gov or your state Medicaid office",
        "description": "Free or low-cost health coverage for children and families. Medicaid covers parents below ~138% of poverty level. CHIP covers children in families earning too much for Medicaid but not enough for private insurance.",
        "requirements": ["Income below state Medicaid threshold (varies by state)", "U.S. citizen or qualified non-citizen", "Must not have access to affordable employer-sponsored insurance"],
        "url": "https://www.medicaid.gov/medicaid/eligibility/index.html",
        "type": "healthcare",
    },
    {
        "name": "LIHEAP — Low Income Home Energy Assistance",
        "source": "U.S. Department of Health & Human Services",
        "amount": 1400,
        "deadline": "Seasonal — apply in fall/winter through your state or local agency",
        "description": "Helps low-income households pay heating and cooling bills. Also covers energy crisis emergencies and home weatherization. Single parents with young children are high priority.",
        "requirements": ["Income at or below 150% of federal poverty level or 60% of state median income", "Paying for home heating or cooling", "Priority given to households with children under 6"],
        "url": "https://www.acf.hhs.gov/ocs/low-income-home-energy-assistance-program-liheap",
        "type": "government_aid",
    },
    {
        "name": "Section 8 / HUD Housing Choice Voucher",
        "source": "U.S. Department of Housing and Urban Development",
        "amount": 9600,
        "deadline": "Apply when your local PHA opens its waitlist — check HUD.gov",
        "description": "Rental assistance that pays the difference between what you can afford and market-rate rent. Priority given to extremely low-income families, single parents, and victims of domestic violence.",
        "requirements": ["Income below 50% of area median income", "U.S. citizen or eligible immigration status", "Pass background check", "Apply through local Public Housing Authority (PHA)"],
        "url": "https://www.hud.gov/topics/housing_choice_voucher_program_section_8",
        "type": "housing",
    },
    {
        "name": "EITC — Earned Income Tax Credit",
        "source": "Internal Revenue Service (IRS)",
        "amount": 7430,
        "deadline": "File federal taxes by April 15",
        "description": "Refundable federal tax credit for low-to-moderate income workers with children. Single parents with 3+ children can receive up to $7,430. You must file a tax return to claim it — even if you owe no taxes.",
        "requirements": ["Have earned income and meet income limits", "Have a valid Social Security number", "File a federal tax return", "Claim a qualifying child or meet childless EITC rules"],
        "url": "https://www.irs.gov/credits-deductions/individuals/earned-income-tax-credit-eitc",
        "type": "tax_credit",
    },
    {
        "name": "Child Tax Credit (CTC)",
        "source": "Internal Revenue Service (IRS)",
        "amount": 2000,
        "deadline": "File federal taxes by April 15",
        "description": "Up to $2,000 per qualifying child under 17. Partially refundable (up to $1,600 as Additional CTC). Single parents with multiple children can receive significant refunds.",
        "requirements": ["Child under 17 at end of tax year", "Child is your dependent", "Child has a valid Social Security number", "Income below $200,000 (single filer)"],
        "url": "https://www.irs.gov/credits-deductions/individuals/child-tax-credit",
        "type": "tax_credit",
    },
    {
        "name": "Child and Dependent Care Tax Credit",
        "source": "Internal Revenue Service (IRS)",
        "amount": 1050,
        "deadline": "File federal taxes by April 15",
        "description": "Credit for childcare expenses paid while you worked or looked for work. Up to 35% of $3,000 ($1,050 max) for one child, or 35% of $6,000 ($2,100 max) for two or more children.",
        "requirements": ["Paid for childcare for child under 13", "Have earned income (or spouse)", "Qualifying childcare expenses paid to provider who is not your dependent"],
        "url": "https://www.irs.gov/credits-deductions/individuals/child-and-dependent-care-credit-information",
        "type": "tax_credit",
    },
    {
        "name": "211 Emergency Assistance Network",
        "source": "United Way / National 211 Network",
        "amount": 1500,
        "deadline": "Call or text 211 anytime — 24/7",
        "description": "Free referral service connecting families to local emergency assistance: food banks, utility help, rent assistance, childcare, healthcare, and crisis support. Call or text 211 from anywhere in the US.",
        "requirements": ["Any resident can call", "Prioritizes low-income families and single parents", "Services vary by location"],
        "url": "https://www.211.org",
        "type": "emergency_aid",
    },
    {
        "name": "State Pre-K / Universal Pre-K Programs",
        "source": "State Departments of Education",
        "amount": 8000,
        "deadline": "Apply each spring for the following school year",
        "description": "Many states offer free or subsidized pre-kindergarten programs for 3-4 year olds. Quality childcare and early education that reduces your childcare costs dramatically.",
        "requirements": ["Child age 3-4", "Varies by state — some are income-based, some are universal", "Attend public school programs in your district"],
        "url": "https://nieer.org/state-preschool-yearbooks",
        "type": "childcare",
    },
]


def _embed_text(s: dict) -> str:
    reqs = " | ".join(s.get("requirements") or [])
    return (
        f"scholarship grant funding aid: {s['name']} | source: {s.get('source', '')} | "
        f"type: {s.get('type', 'grant')} | amount: ${s.get('amount', 0):,} | "
        f"{s.get('description', '')} | requirements: {reqs}"
    )


def run(force: bool = False) -> int:
    sb = get_supabase()
    if not force:
        existing = sb.table("scholarships").select("id", count="exact").execute()
        if (existing.count or 0) >= 5:
            return 0

    all_items = CURATED.copy()
    all_items.extend(_fetch_grants_gov())

    # Deduplicate by name
    seen = set()
    deduped = []
    for item in all_items:
        key = item.get("name", "").lower()
        if key not in seen:
            seen.add(key)
            deduped.append(item)
    all_items = deduped

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
    """Pull live federal grant opportunities from Grants.gov."""
    try:
        with httpx.Client(timeout=15) as client:
            # Search for education, family, and childcare-related grants
            searches = [
                "education single parent family childcare low income women",
                "housing assistance low income families children",
                "nutrition food assistance families poverty",
            ]
            results = []
            for keyword in searches:
                resp = client.post(
                    "https://apply07.grants.gov/grantsws/rest/opportunities/search/",
                    json={
                        "keyword": keyword,
                        "oppStatuses": "posted",
                        "rows": 8,
                        "startRecordNum": 0,
                    },
                    headers={"Content-Type": "application/json"},
                )
                if resp.status_code == 200:
                    hits = resp.json().get("oppHits", [])
                    for h in hits:
                        if h.get("title"):
                            results.append({
                                "name": h.get("title", "Federal Grant"),
                                "source": h.get("agencyName", "Federal Agency"),
                                "amount": h.get("awardCeiling") or 5000,
                                "deadline": h.get("closeDate", "See full announcement"),
                                "description": (h.get("synopsis") or h.get("title", ""))[:400],
                                "requirements": ["See full grant announcement for eligibility details"],
                                "url": f"https://www.grants.gov/search-results-detail/{h.get('id', '')}",
                                "type": "federal_grant",
                            })
            return results
    except Exception:
        return []
