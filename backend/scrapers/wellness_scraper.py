"""
WellnessGuide scraper: curated mental health and parenting support resources.
Embeds and upserts into the Supabase `wellness_resources` table.
"""
import uuid
from lib.supabase_client import get_supabase
from ml.embeddings import embed_batch

RESOURCES = [
    # Crisis lines
    {
        "name": "988 Suicide & Crisis Lifeline",
        "type": "crisis",
        "description": "Free, confidential support during mental health crises. Call or text 988 anytime, 24/7. Connects you to trained counselors. Also available via online chat. Works nationwide.",
        "contact": "Call or text: 988",
        "url": "https://988lifeline.org",
        "state": None,
    },
    {
        "name": "Crisis Text Line",
        "type": "crisis",
        "description": "Free 24/7 text-based crisis support. Text HOME to 741741. Trained crisis counselors respond within minutes. Great option when you can't speak out loud — during work or when kids are asleep.",
        "contact": "Text HOME to 741741",
        "url": "https://www.crisistextline.org",
        "state": None,
    },
    {
        "name": "National Domestic Violence Hotline",
        "type": "crisis",
        "description": "Confidential support for survivors of domestic violence. Chat, call, or text. Provides safety planning, local shelter referrals, and financial independence resources for single parents.",
        "contact": "1-800-799-7233 | Text START to 88788",
        "url": "https://www.thehotline.org",
        "state": None,
    },
    # Counseling / Therapy
    {
        "name": "Open Path Collective",
        "type": "counseling",
        "description": "Affordable therapy from $30–$80 per session with licensed therapists. Specifically designed for people with limited income. Find therapists online or in-person who specialize in parenting stress, anxiety, and trauma.",
        "contact": "openpath.care",
        "url": "https://openpathcollective.org",
        "state": None,
    },
    {
        "name": "BetterHelp Online Therapy",
        "type": "counseling",
        "description": "Licensed therapists available by message, live chat, phone, or video. Flexible scheduling for parents. Financial aid program available for low-income users. No waiting rooms, no commute.",
        "contact": "betterhelp.com",
        "url": "https://www.betterhelp.com",
        "state": None,
    },
    {
        "name": "SAMHSA National Helpline",
        "type": "counseling",
        "description": "Free, confidential mental health and substance use treatment referrals. Available 24/7 in English and Spanish. Connects you to local support services, treatment facilities, and support groups.",
        "contact": "1-800-662-4357",
        "url": "https://www.samhsa.gov/find-help/national-helpline",
        "state": None,
    },
    {
        "name": "Postpartum Support International Helpline",
        "type": "counseling",
        "description": "Specialized support for postpartum depression, anxiety, rage, and birth trauma. Connects single parents to local PSI coordinators and online support groups. No cost.",
        "contact": "1-800-944-4773",
        "url": "https://www.postpartum.net",
        "state": None,
    },
    {
        "name": "Psychology Today Therapist Finder",
        "type": "counseling",
        "description": "Find licensed therapists in your area filtered by insurance, specialty, and sliding scale fees. Many therapists offer reduced rates for single parents and students. Filter for telehealth options.",
        "contact": "psychologytoday.com/us/therapists",
        "url": "https://www.psychologytoday.com/us/therapists",
        "state": None,
    },
    # Apps & Self-Care
    {
        "name": "Calm — Meditation & Sleep",
        "type": "self-care",
        "description": "Guided meditation, sleep stories, breathing exercises, and daily mindfulness. Free tier available. Research-backed stress reduction. 10-minute daily sessions fit into a parent's schedule.",
        "contact": "calm.com",
        "url": "https://www.calm.com",
        "state": None,
    },
    {
        "name": "Headspace — Mindfulness for Parents",
        "type": "self-care",
        "description": "Science-backed meditation and mindfulness app with specific programs for parenting stress, sleep, and anxiety. Free for people on Medicaid through their state program.",
        "contact": "headspace.com",
        "url": "https://www.headspace.com",
        "state": None,
    },
    {
        "name": "Woebot — AI Emotional Support",
        "type": "self-care",
        "description": "AI chatbot using Cognitive Behavioral Therapy (CBT) techniques. Available 24/7 — helpful when you need support at 2am and can't call anyone. Free app for mood tracking and coping skills.",
        "contact": "woebot.io",
        "url": "https://woebothealth.com",
        "state": None,
    },
    # Breathing & Grounding Techniques
    {
        "name": "4-7-8 Breathing Technique",
        "type": "breathing",
        "description": "Inhale 4 counts, hold 7, exhale 8. Activates the parasympathetic nervous system in under 2 minutes. Use when feeling overwhelmed by parenting, school, or financial stress. No equipment needed.",
        "contact": "Practice anywhere, anytime",
        "url": "https://www.health.harvard.edu/mind-and-mood/relaxation-techniques-breath-control-helps-quell-errant-stress-response",
        "state": None,
    },
    {
        "name": "5-4-3-2-1 Grounding Technique",
        "type": "grounding",
        "description": "Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste. Interrupts anxiety spirals and returns you to the present moment. Takes less than 3 minutes.",
        "contact": "No equipment needed",
        "url": "https://www.urmc.rochester.edu/behavioral-health-partners/bhp-blog/april-2018/5-4-3-2-1-coping-technique-for-anxiety.aspx",
        "state": None,
    },
    {
        "name": "Progressive Muscle Relaxation",
        "type": "breathing",
        "description": "Systematically tense and release muscle groups to relieve physical tension from stress. 15-minute audio-guided practice. Especially helpful for tension headaches and insomnia common in single parents.",
        "contact": "Free guided audio available at dartmouth.edu",
        "url": "https://students.dartmouth.edu/wellness-center/wellness-mindfulness/relaxation-recordings",
        "state": None,
    },
    # Community & Peer Support
    {
        "name": "Single Mothers by Choice",
        "type": "community",
        "description": "Supportive community for single mothers. Online and in-person groups, resources, and peer support from others who understand the unique challenges and joys of single parenting.",
        "contact": "singlemothersbychoice.org",
        "url": "https://www.singlemothersbychoice.org",
        "state": None,
    },
    {
        "name": "Parents Without Partners",
        "type": "community",
        "description": "International organization with local chapters offering social events, parenting education, and peer support for single parents. Helps combat the isolation that often accompanies single parenthood.",
        "contact": "parentswithoutpartners.org",
        "url": "https://www.parentswithoutpartners.org",
        "state": None,
    },
    # Children's Mental Health
    {
        "name": "Child Mind Institute",
        "type": "parenting",
        "description": "Free expert resources on children's mental health, behavior, anxiety, ADHD, and school challenges. Articles and symptom checker by licensed psychologists. Helps parents support their children's emotional health.",
        "contact": "childmind.org",
        "url": "https://childmind.org",
        "state": None,
    },
    {
        "name": "Zero to Three — Early Childhood Development",
        "type": "parenting",
        "description": "Research-based resources for parents of children ages 0–3. Covers brain development, managing toddler tantrums, building healthy attachment, and supporting development as a single parent.",
        "contact": "zerotothree.org",
        "url": "https://www.zerotothree.org",
        "state": None,
    },
]


def _embed_text(r: dict) -> str:
    return (
        f"wellness mental health resource: {r['name']} | type: {r.get('type', '')} | "
        f"{r.get('description', '')} | contact: {r.get('contact', '')}"
    )


def run(force: bool = False) -> int:
    try:
        sb = get_supabase()
        if not force:
            existing = sb.table("wellness_resources").select("id", count="exact").execute()
            if (existing.count or 0) >= 5:
                return 0

        texts = [_embed_text(r) for r in RESOURCES]
        embeddings = embed_batch(texts) or [None] * len(RESOURCES)

        rows = [
            {
                "id": str(uuid.uuid4()),
                "name": r["name"],
                "type": r.get("type", ""),
                "description": r.get("description", ""),
                "contact": r.get("contact", ""),
                "url": r.get("url", ""),
                "state": r.get("state"),
                "embedding": embeddings[i],
            }
            for i, r in enumerate(RESOURCES)
        ]

        sb.table("wellness_resources").upsert(rows).execute()
        return len(rows)
    except Exception:
        return 0  # table doesn't exist yet — ml_schema.sql needs to be run
