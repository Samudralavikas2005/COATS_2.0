import os
import django
import random
from datetime import date, timedelta

# ── Point to the PRODUCTION Neon database ─────────────────────────
os.environ['DATABASE_URL'] = (
    "postgresql://neondb_owner:npg_ab1RlCeM6hoN@ep-divine-cake-a4upeiqo-pooler"
    ".us-east-1.aws.neon.tech/neondb?sslmode=require"
)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'coats.settings')
django.setup()

from cases.models import Case, ChainOfCustody
from accounts.models import User

# ── Realistic Tamil Nadu ATS Case Data ────────────────────────────

PS_LIMITS = [
    "Adyar", "T.Nagar", "Anna Nagar", "Ambattur",
    "Perambur", "Mylapore", "Thiruvanmiyur", "Velachery",
    "Kodambakkam", "Guindy", "Nungambakkam", "Egmore",
    "Kilpauk", "Royapuram", "Tondiarpet", "Saidapet",
    "Alandur", "Chromepet", "Tambaram", "Porur",
    "Tiruchirappalli Fort", "Srirangam", "Dindigul Town",
    "Theni", "Sivaganga", "Ramanathapuram",
    "Gandhipuram", "RS Puram", "Peelamedu", "Singanallur",
    "Saravanampatti", "Sulur", "Tiruppur North", "Erode Town",
]

SECTIONS_OF_LAW = [
    "IPC 302 — Murder",
    "IPC 307 — Attempt to Murder",
    "IPC 376 — Rape",
    "IPC 379 — Theft",
    "IPC 392 — Robbery",
    "IPC 395 — Dacoity",
    "IPC 420 — Cheating and Fraud",
    "IPC 498A — Dowry Harassment",
    "IPC 306 — Abetment of Suicide",
    "IPC 354 — Assault on Women",
    "IPC 120B — Criminal Conspiracy",
    "IPC 147/148/149 — Rioting",
    "IPC 324 — Voluntarily Causing Hurt with Weapon",
    "IPC 341/323 — Wrongful Restraint & Hurt",
    "IPC 406 — Criminal Breach of Trust",
    "IPC 427 — Mischief Causing Damage",
    "IPC 452 — House Trespass with Assault",
    "IPC 506 — Criminal Intimidation",
    "NDPS Act Sec 20 — Cannabis Possession",
    "NDPS Act Sec 21 — Manufactured Drug Possession",
    "NDPS Act Sec 22 — Psychotropic Substance",
    "UAPA Sec 13 — Unlawful Activities",
    "UAPA Sec 16 — Terrorist Act",
    "UAPA Sec 18 — Conspiracy for Terrorist Act",
    "POCSO Act Sec 4 — Penetrative Sexual Assault",
    "POCSO Act Sec 6 — Aggravated Assault",
    "Arms Act Sec 25 — Illegal Arms Possession",
    "Arms Act Sec 27 — Using Arms",
    "IT Act Sec 66 — Computer Hacking",
    "IT Act Sec 66C — Identity Theft",
    "Explosive Substances Act Sec 3 — Causing Explosion",
    "Goondas Act — Habitual Offender Detention",
]

COMPLAINANTS = [
    "Rajesh Kumar S.", "Anitha Devi M.", "Suresh Babu R.", "Mohamed Ibrahim K.",
    "Karthikeyan P.", "Priya Dharshini V.", "Vijayakumar T.", "Lakshmi Narayanan G.",
    "Geetha Rani S.", "Balakrishnan M.", "Senthil Murugan A.", "Kavitha Priya R.",
    "Arumugam N.", "Saranya Devi K.", "Ramachandran P.", "Deepa Lakshmi T.",
    "Gopalakrishnan V.", "Meenakshi Sundaram S.", "Nithya Sri M.", "Ravi Shankar B.",
    "Jeyalakshmi P.", "Murugesan K.", "Tamilarasi V.", "Sundararajan R.",
    "Padmavathi G.", "Vengatesan S.", "Chitra Devi M.", "Saravanan A.",
    "Thangamani R.", "Kumaresan P.",
]

ACCUSED_POOL = [
    "Muthu alias 'Bullet' Pandi, age 32, resident of Madurai",
    "Senthil Kumar (28) and 3 unknown associates",
    "Vignesh alias 'Vicky' (25), history-sheeter of Ambattur",
    "Logesh (30) and Ramesh (27), brothers from Trichy",
    "A group of 4 masked individuals, identities unknown",
    "Kumaravel S. (45), businessman from Coimbatore",
    "Manikandan alias 'Mani' (22), previous NDPS offender",
    "Rajkumar (35), autorickshaw driver, T.Nagar",
    "Arun Prasad (29) and Dinesh Kumar (31), IT employees",
    "Selvakumar (40), suspended govt. employee, Salem",
    "Unknown male, approximately 30 years, medium build",
    "Kamal (38), financier, and his associates numbering 5",
    "Pradeep alias 'Peter' (26), known rowdy of Chromepet",
    "Anwar Basha (33) and 2 juveniles (names withheld)",
    "Ganesh (27), delivery executive, Velachery",
    "Ravi alias 'Rocket' Ravi (34), interstate criminal",
    "Surya Prakash (31), real estate agent, Anna Nagar",
    "Mohan Raj (42) and wife Lakshmi (39), Tambaram",
    "Unidentified gang of 6, suspected interstate operators",
    "Kathiresan (50), retired military personnel, Tirunelveli",
]

GISTS = [
    "Complainant reported theft of 50 sovereigns of gold jewellery from residence during night hours when family was asleep. CCTV footage from neighbouring house shows two suspects scaling the compound wall at approximately 02:30 AM.",
    "Intelligence report received regarding suspected terrorist hideout operating from a rented apartment in the industrial estate. Surveillance confirmed suspicious movements and possible procurement of explosive materials.",
    "Attempted murder with a machete over a long-standing property dispute between two families in the outskirts of the city. Victim sustained deep lacerations on both arms and was admitted to ICU.",
    "Online financial fraud through a fake cryptocurrency investment platform defrauding over 150 victims across Tamil Nadu. Total estimated loss exceeds Rs. 4.2 crores. Operations traced to a call centre in Guindy.",
    "Seizure of 5 kg ganja and 200 grams of methamphetamine from a parked vehicle near the railway junction. Two occupants fled on foot. Vehicle registered under a fictitious identity.",
    "Housebreaking and theft of electronics including laptops, mobile phones, and Rs. 2 lakh cash from a locked apartment. Fingerprints lifted from the scene match a known offender.",
    "Cybercrime involving unauthorized access to 45 bank accounts through phishing emails mimicking the Income Tax Department. Rs. 18 lakh siphoned within 72 hours.",
    "Public assault on a traffic constable during a routine vehicle check near the tollbooth. Accused was intoxicated and assaulted the officer with a glass bottle causing facial injuries.",
    "Kidnapping of a 12-year-old child from school premises by two men posing as relatives. Ransom demand of Rs. 50 lakh received via encrypted messaging app. Child recovered safely after 48-hour operation.",
    "Illegal arms cache discovered during a routine search operation in a farmhouse. Recovered items include 2 country-made pistols, 15 rounds of ammunition, and one hand grenade.",
    "Dowry harassment complaint filed by wife after being subjected to physical and mental torture for additional dowry of Rs. 10 lakh. Burn marks observed on arms during medical examination.",
    "Fatal road rage incident where the accused deliberately rammed his SUV into the victim's motorcycle after a verbal altercation at a traffic signal. Victim declared dead on arrival at hospital.",
    "Large-scale cattle smuggling racket busted at the Andhra Pradesh border. 3 trucks carrying 45 cattle intercepted. Accused connected to an interstate smuggling syndicate.",
    "Procurement and distribution of counterfeit Indian currency notes with face value of Rs. 15 lakh. Notes were being circulated through small retail shops and petrol bunks.",
    "Gang rape of a college student in a moving car on the outskirts of the city. Victim identified 3 of the 4 accused through CCTV at a nearby petrol station.",
    "Extortion racket targeting IT professionals through social media impersonation and threats of releasing fabricated private images. Over 20 victims across Chennai identified.",
    "Illegal sand mining operation discovered along the Cauvery riverbed using heavy machinery during night hours. Revenue loss estimated at Rs. 80 lakh. Three earth movers seized.",
    "Honour killing of a 22-year-old girl by her father and uncle over an inter-caste relationship. Accused attempted to stage it as a suicide by hanging.",
    "Bombing threat received at Central Railway Station via anonymous call. Bomb Disposal Squad deployed. Suspicious package found near Platform 4 contained only a timer device — no explosives.",
    "Organized begging racket involving trafficking of children from neighbouring states. 12 children rescued from a godown in Royapuram. Three ringleaders arrested.",
    "Assault and robbery of a foreign tourist near Marina Beach. Accused snatched a handbag containing passport, Rs. 30,000 and credit cards, then fled on a stolen two-wheeler.",
    "Land grabbing of 3 acres of temple trust land using forged revenue documents. The accused, a local politician's associate, had constructed unauthorized commercial shops on the property.",
    "Drunk driving accident causing death of a pedestrian on ECR. Accused, a software engineer, was driving at 120 kmph and had a BAC of 0.15%. Dashcam footage recovered.",
    "Communal tension arising from desecration of a place of worship. Inflammatory pamphlets recovered from the area. Three suspects identified through mobile tower location analysis.",
    "Missing person complaint — a 19-year-old college student missing for 7 days. Last seen at a restaurant near campus. Mobile phone switched off. Friends report signs of depression.",
]

ACTIONS = [
    "Obtain search warrant from the Judicial Magistrate and conduct raid at the suspect's known addresses.",
    "Submit fingerprint evidence and DNA samples to FSL (Forensic Science Laboratory) for analysis.",
    "Review and collect CCTV footage from all traffic cameras within a 2 km radius of the crime scene.",
    "Await post-mortem report from the Government General Hospital. Preserve biological evidence.",
    "Initiate mobile tower dump analysis and CDR (Call Detail Records) for all suspects' numbers.",
    "Issue summons to 5 key witnesses identified from the preliminary investigation for recording statements.",
    "Execute non-bailable arrest warrant against the primary suspect who is reportedly absconding.",
    "File chargesheet under Sections mentioned before the Judicial Magistrate within the statutory period.",
    "Coordinate with Cyber Crime Cell for tracing IP addresses and digital footprint of the accused.",
    "Request Interpol Red Notice for the main accused believed to have fled to a neighbouring country.",
    "Conduct TIP (Test Identification Parade) at the Central Prison with the victim and eyewitnesses.",
    "Apply for police custody of the arrested accused for further interrogation regarding co-conspirators.",
    "Secure all electronic evidence — mobile phones, laptops, pen drives — under proper chain of custody protocols.",
    "Coordinate with the Narcotics Control Bureau for inter-state linkage of the drug supply chain.",
    "File application for extension of judicial remand of the accused. Next hearing on the scheduled date.",
    "Prepare detailed case diary and submit progress report to the Superintendent of Police.",
    "Arrange for the victim's medical re-examination and counselling as per POCSO Act guidelines.",
    "Deploy surveillance team to monitor the movements of the remaining absconding accused persons.",
    "Liaise with the Revenue Department for verification of disputed land documents and survey records.",
    "Record the statement of the complainant under Section 164 CrPC before the Magistrate.",
]

STAGES = ["UI", "UI", "UI", "PT", "PT", "HC", "SC", "CC"]  # weighted towards UI/PT


def get_random_date(start_year=2024):
    start = date(start_year, 1, 1)
    end = date(2026, 3, 31)
    delta = (end - start).days
    return start + timedelta(days=random.randrange(delta))


def seed_cases(count=25):
    print("=" * 60)
    print("  COATS 2.0 — Production Case Seeding Script")
    print("  Target: Neon PostgreSQL (Production)")
    print("=" * 60)

    officers = list(User.objects.filter(role='CASE'))
    if not officers:
        print("\n❌ No CASE officers found in the database!")
        print("   Run user_seeding.py against production first.")
        return

    print(f"\n✅ Found {len(officers)} Case Officers:")
    for o in officers:
        print(f"   • {o.username} ({o.branch})")

    existing = Case.objects.count()
    print(f"\n📊 Existing cases in DB: {existing}")
    print(f"🎯 Attempting to seed {count} new cases...\n")

    created = 0
    used_crime_numbers = set(Case.objects.values_list('crime_number', flat=True))

    for i in range(count):
        officer = random.choice(officers)

        # Generate unique crime number
        while True:
            crime_no = f"{random.randint(100, 999)}/{random.choice([2024, 2025, 2026])}"
            if crime_no not in used_crime_numbers:
                used_crime_numbers.add(crime_no)
                break

        occ_date = get_random_date()
        reg_date = occ_date + timedelta(days=random.randint(0, 3))

        case = Case.objects.create(
            ps_limit=random.choice(PS_LIMITS),
            crime_number=crime_no,
            section_of_law=random.choice(SECTIONS_OF_LAW),
            date_of_occurrence=occ_date,
            date_of_registration=reg_date,
            complainant_name=random.choice(COMPLAINANTS),
            accused_details=random.choice(ACCUSED_POOL),
            gist_of_case=random.choice(GISTS),
            current_stage=random.choice(STAGES),
            action_to_be_taken=random.choice(ACTIONS),
            case_holding_officer=officer,
            branch=officer.branch,
        )

        ChainOfCustody.objects.create(
            case=case,
            officer=officer,
            officer_username=officer.username,
            officer_role=officer.role,
            officer_branch=officer.branch,
            action='CREATED',
            reason="Initial case registration",
            notes=f"Case filed under {case.section_of_law}",
            crime_number=case.crime_number,
            branch=case.branch,
            ip_address="127.0.0.1",
        )

        print(f"  ✅ [{created+1:02d}] {crime_no:>8}  |  {officer.branch}  |  {officer.username:<14}  |  {case.section_of_law[:40]}")
        created += 1

    total = Case.objects.count()
    print(f"\n{'=' * 60}")
    print(f"  ✅ Done! Seeded {created} cases.")
    print(f"  📊 Total cases now in production DB: {total}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    seed_cases(25)
