"""
Demo Data Generator for modQ Platform
Creates realistic business scenarios and conversations for testing
"""

import asyncio
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Demo Companies and Industries
DEMO_COMPANIES = [
    {
        "name": "TechStart Solutions",
        "industry": "Technology",
        "ai_personality": "Strategic Advisor",
        "description": "B2B SaaS company specializing in workflow automation for small businesses"
    },
    {
        "name": "Growth Consulting Group",
        "industry": "Consulting",
        "ai_personality": "Professional Assistant",
        "description": "Management consulting firm helping mid-size companies scale operations"
    },
    {
        "name": "InnovateCorp",
        "industry": "Retail",
        "ai_personality": "Creative Partner",
        "description": "E-commerce platform for sustainable consumer goods"
    },
    {
        "name": "DataDrive Analytics",
        "industry": "Finance",
        "ai_personality": "Data Analyst",
        "description": "Financial technology company providing analytics tools for investment firms"
    },
    {
        "name": "HealthTech Innovations",
        "industry": "Healthcare",
        "ai_personality": "Strategic Advisor",
        "description": "Digital health platform connecting patients with healthcare providers"
    }
]

# Knowledge Base Templates
KNOWLEDGE_BASE_TEMPLATES = {
    "Technology": [
        {
            "title": "Product Overview",
            "content": "Our flagship product is a cloud-based workflow automation platform that helps small to medium businesses streamline their operations. Key features include task automation, team collaboration tools, and performance analytics. We serve over 10,000 active users across 50+ countries."
        },
        {
            "title": "Target Market",
            "content": "Primary target: SMBs with 10-500 employees in professional services, e-commerce, and consulting. Secondary market: Enterprise departments looking for workflow optimization. Customer profile: Operations managers, business owners, and team leads who value efficiency and data-driven decisions."
        },
        {
            "title": "Competitive Advantages",
            "content": "Unlike competitors, we offer: 1) No-code automation builder, 2) Built-in AI analytics, 3) 99.9% uptime SLA, 4) White-label options for agencies, 5) Transparent pricing with no hidden fees. Our customer acquisition cost is 40% lower than industry average."
        }
    ],
    "Consulting": [
        {
            "title": "Service Offerings",
            "content": "We provide strategic consulting in three main areas: Digital Transformation (40% of revenue), Operational Excellence (35%), and Change Management (25%). Our methodology combines data analysis, stakeholder interviews, and implementation support. Average project duration is 3-6 months with retainer options."
        },
        {
            "title": "Client Success Stories",
            "content": "Recent wins: Helped a 200-person manufacturing company reduce operational costs by 25% through process optimization. Guided a retail chain's digital transformation, resulting in 40% increase in online sales. Our Net Promoter Score is 68, well above industry standard of 31."
        },
        {
            "title": "Team Expertise",
            "content": "15 senior consultants with expertise in: Strategy (5), Operations (4), Technology (3), Change Management (3). Average experience: 12 years. Team includes former executives from Fortune 500 companies and Big 4 consulting firms. All consultants hold relevant certifications (PMP, Six Sigma, etc.)."
        }
    ],
    "Retail": [
        {
            "title": "Product Catalog",
            "content": "We curate sustainable consumer products across 5 categories: Home & Living (35% of sales), Personal Care (25%), Fashion (20%), Food & Beverages (15%), and Tech Accessories (5%). All products meet our sustainability criteria: eco-friendly materials, ethical sourcing, minimal packaging."
        },
        {
            "title": "Customer Demographics",
            "content": "Target demographic: Environmentally conscious consumers, ages 25-45, household income $50K+, primarily urban/suburban. 65% female, 35% male. Top customer segments: Young professionals (40%), families with children (35%), eco-enthusiasts (25%). Customer lifetime value: $285."
        },
        {
            "title": "Supply Chain",
            "content": "We work with 150+ verified sustainable suppliers across 25 countries. Key partnerships with certified B-Corps and Fair Trade organizations. Inventory turnover rate: 8.5x annually. Average delivery time: 3-5 business days domestic, 7-14 international. Carbon-neutral shipping available."
        }
    ]
}

# Sample Conversations
DEMO_CONVERSATIONS = {
    "sales_analysis": [
        {
            "message": "Can you analyze our Q3 sales performance and identify key trends?",
            "response": "Based on your business profile, here's an analysis of typical Q3 performance patterns:\n\n**Key Metrics to Review:**\n• Revenue growth vs Q2 and YoY\n• Customer acquisition cost (CAC)\n• Average order value trends\n• Product/service mix performance\n\n**Common Q3 Trends:**\n• Post-summer business acceleration\n• Back-to-school/work season impact\n• Holiday preparation (B2C)\n• Budget planning season (B2B)\n\n**Recommended Actions:**\n1. Segment analysis by customer type\n2. Channel performance evaluation\n3. Seasonal adjustment planning\n4. Q4 pipeline preparation\n\nWould you like me to dive deeper into any specific area or help you create a detailed analysis framework?"
        },
        {
            "message": "What metrics should I focus on to improve our sales conversion rate?",
            "response": "Here are the key metrics to monitor for improving sales conversion:\n\n**Primary Conversion Metrics:**\n• Lead-to-opportunity rate\n• Opportunity-to-close rate\n• Average sales cycle length\n• Deal size distribution\n\n**Leading Indicators:**\n• Lead response time\n• Number of touchpoints per lead\n• Proposal-to-close ratio\n• Discovery call completion rate\n\n**Improvement Strategies:**\n1. **Qualify Earlier**: Implement BANT criteria\n2. **Optimize Follow-up**: 5-touch minimum rule\n3. **Personalize Outreach**: Use company-specific insights\n4. **Reduce Friction**: Simplify proposal process\n\n**Industry Benchmarks:**\n• Lead-to-customer rate: 2-5%\n• Sales cycle: 3-6 months (B2B)\n• Win rate: 15-25%\n\nI can help you set up tracking systems or create conversion optimization playbooks. What's your current conversion rate?"
        }
    ],
    "workflow_automation": [
        {
            "message": "Help me identify processes in my business that could be automated",
            "response": "Great question! Here's a systematic approach to identify automation opportunities:\n\n**High-Impact Automation Areas:**\n\n**1. Customer Communication**\n• Welcome email sequences\n• Follow-up reminders\n• Appointment confirmations\n• Survey distribution\n\n**2. Data Entry & Processing**\n• Lead capture from forms\n• Invoice generation\n• Expense categorization\n• Report compilation\n\n**3. Internal Operations**\n• Task assignment workflows\n• Approval processes\n• Meeting scheduling\n• File organization\n\n**Automation Assessment Framework:**\n• **Volume**: >10 occurrences/week\n• **Repeatability**: Same steps each time\n• **Rule-based**: Clear if/then logic\n• **Time-consuming**: >15 minutes each\n\n**Quick Wins to Start:**\n1. Email autoresponders\n2. Calendar booking automation\n3. Social media posting\n4. Basic report generation\n\nWould you like me to help you map out a specific process or create an automation priority list for your industry?"
        }
    ],
    "business_strategy": [
        {
            "message": "What should be our key focus areas for the next quarter?",
            "response": "Strategic planning for next quarter should balance growth, efficiency, and market positioning. Here's a framework:\n\n**Core Focus Areas:**\n\n**1. Revenue Growth (40% of effort)**\n• Customer retention initiatives\n• Upsell/cross-sell programs\n• New market segment exploration\n• Partnership opportunities\n\n**2. Operational Excellence (30%)**\n• Process optimization\n• Cost structure analysis\n• Team productivity improvements\n• Technology integration\n\n**3. Market Position (20%)**\n• Competitive analysis\n• Brand strengthening\n• Customer feedback integration\n• Product/service enhancement\n\n**4. Future Preparation (10%)**\n• Trend monitoring\n• Skill development\n• Innovation pipeline\n• Risk mitigation\n\n**Quarterly Planning Process:**\n1. Review previous quarter results\n2. Analyze market conditions\n3. Set 3-5 key objectives\n4. Define success metrics\n5. Allocate resources\n\n**Success Indicators:**\n• Revenue targets\n• Customer satisfaction scores\n• Operational efficiency metrics\n• Team engagement levels\n\nWhat's your current biggest challenge or opportunity? I can help you prioritize based on your specific situation."
        }
    ]
}

async def create_demo_user(company_data):
    """Create a demo user with company configuration"""
    user_id = str(uuid.uuid4())
    
    # Create user
    user = {
        "id": user_id,
        "username": f"demo_{company_data['name'].lower().replace(' ', '_')}",
        "email": f"demo@{company_data['name'].lower().replace(' ', '')}.com",
        "role": "employee",
        "created_at": datetime.now(timezone.utc) - timedelta(days=7),  # Created a week ago
        "is_demo": True
    }
    
    await db.users.insert_one(user)
    
    # Create widget configuration
    config = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "company_name": company_data["name"],
        "industry": company_data["industry"],
        "ai_personality": company_data["ai_personality"],
        "workflow_automations": [
            "Email Follow-ups",
            "Report Generation", 
            "Task Assignment",
            "Meeting Scheduling"
        ],
        "integration_settings": {
            "crm_integration": True,
            "email_automation": True,
            "analytics_tracking": True,
            "ai_learning": True
        },
        "created_at": datetime.now(timezone.utc) - timedelta(days=6)
    }
    
    await db.widget_configs.insert_one(config)
    
    # Create knowledge base items
    if company_data["industry"] in KNOWLEDGE_BASE_TEMPLATES:
        for kb_template in KNOWLEDGE_BASE_TEMPLATES[company_data["industry"]]:
            kb_item = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "title": kb_template["title"],
                "content": kb_template["content"],
                "file_type": "text",
                "created_at": datetime.now(timezone.utc) - timedelta(days=5)
            }
            await db.knowledge_base.insert_one(kb_item)
    
    # Create sample conversations
    conversation_types = ["sales_analysis", "workflow_automation", "business_strategy"]
    for conv_type in conversation_types:
        if conv_type in DEMO_CONVERSATIONS:
            for conv in DEMO_CONVERSATIONS[conv_type]:
                chat_message = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "message": conv["message"],
                    "response": conv["response"],
                    "timestamp": datetime.now(timezone.utc) - timedelta(days=4, hours=2)
                }
                await db.chat_messages.insert_one(chat_message)
    
    return user

async def create_demo_data():
    """Create all demo data"""
    print("🚀 Creating demo data for modQ platform...")
    
    # Check if demo data already exists
    existing_demo = await db.users.find_one({"is_demo": True})
    if existing_demo:
        print("Demo data already exists. Skipping creation.")
        return
    
    demo_users = []
    
    for company in DEMO_COMPANIES:
        print(f"Creating demo user for {company['name']}...")
        user = await create_demo_user(company)
        demo_users.append(user)
    
    print(f"✅ Created {len(demo_users)} demo users with realistic business data")
    print("\nDemo accounts created:")
    for i, company in enumerate(DEMO_COMPANIES):
        print(f"  {i+1}. {company['name']} ({company['industry']})")
        print(f"     Email: demo@{company['name'].lower().replace(' ', '')}.com")
    
    print("\n🎉 Demo data creation complete!")
    print("💡 These accounts will appear in the admin portal for testing")

async def cleanup_demo_data():
    """Remove all demo data"""
    print("🧹 Cleaning up demo data...")
    
    # Find all demo users
    demo_users = await db.users.find({"is_demo": True}).to_list(100)
    demo_user_ids = [user["id"] for user in demo_users]
    
    if not demo_user_ids:
        print("No demo data found to clean up.")
        return
    
    # Delete associated data
    await db.widget_configs.delete_many({"user_id": {"$in": demo_user_ids}})
    await db.knowledge_base.delete_many({"user_id": {"$in": demo_user_ids}})
    await db.chat_messages.delete_many({"user_id": {"$in": demo_user_ids}})
    await db.users.delete_many({"is_demo": True})
    
    print(f"✅ Cleaned up {len(demo_users)} demo users and associated data")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "cleanup":
        asyncio.run(cleanup_demo_data())
    else:
        asyncio.run(create_demo_data())