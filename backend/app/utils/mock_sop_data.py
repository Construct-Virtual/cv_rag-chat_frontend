"""Mock SOP document data for RAG pipeline testing"""
import uuid

# Mock SOP documents with content chunks
# Each document has: content, metadata (file_name, page, chunk_index), and allowed_roles
MOCK_DOCUMENTS = [
    # Public SOPs - accessible to all roles
    {
        "id": str(uuid.uuid4()),
        "content": "The employee onboarding process begins with HR sending a welcome email containing login credentials and first-day instructions. New employees must complete all required paperwork within the first week, including tax forms, emergency contact information, and direct deposit authorization. IT will provide computer equipment and software access within 24 hours of start date. All new hires are required to attend orientation on their first day at 9:00 AM.",
        "metadata": {
            "file_name": "employee_onboarding.pdf",
            "display_name": "Employee Onboarding Process",
            "page_number": 1,
            "chunk_index": 0,
            "category": "HR",
            "is_public": True,
            "file_url": "https://company.sharepoint.com/sites/HR/Documents/employee_onboarding.pdf"
        },
        "allowed_roles": ["admin", "hr", "manager", "employee"]  # All roles
    },
    {
        "id": str(uuid.uuid4()),
        "content": "To request time off, employees must submit a request through the company portal at least two weeks in advance for planned vacations. Sick leave can be requested same-day by notifying your manager via email or phone before 9:00 AM. Emergency leave should be communicated immediately to both your manager and HR. All time off requests are subject to manager approval and business needs.",
        "metadata": {
            "file_name": "time_off_policy.pdf",
            "display_name": "Time Off Request Policy",
            "page_number": 1,
            "chunk_index": 0,
            "category": "HR",
            "is_public": True,
            "file_url": "https://company.sharepoint.com/sites/HR/Documents/time_off_policy.pdf"
        },
        "allowed_roles": ["admin", "hr", "manager", "employee"]
    },
    {
        "id": str(uuid.uuid4()),
        "content": "The office security protocol requires all employees to display their ID badge visibly at all times while on company premises. Visitors must sign in at reception and be escorted by an employee. After-hours access requires prior approval from your manager and facility security. Any security incidents or suspicious activity should be reported immediately to security@company.com or extension 911.",
        "metadata": {
            "file_name": "security_protocol.pdf",
            "display_name": "Office Security Protocol",
            "page_number": 1,
            "chunk_index": 0,
            "category": "Security",
            "is_public": True,
            "file_url": "https://company.sharepoint.com/sites/Security/Documents/security_protocol.pdf"
        },
        "allowed_roles": ["admin", "hr", "manager", "employee"]
    },
    {
        "id": str(uuid.uuid4()),
        "content": "Remote work policy allows employees to work from home up to 3 days per week with manager approval. Remote workers must maintain regular business hours (9 AM - 5 PM local time) and be available via chat and video calls. A reliable internet connection and secure home office setup are required. Company-provided equipment must not be shared with family members or used for personal activities.",
        "metadata": {
            "file_name": "remote_work_policy.pdf",
            "display_name": "Remote Work Policy",
            "page_number": 1,
            "chunk_index": 0,
            "category": "Operations",
            "is_public": True,
            "file_url": "https://company.sharepoint.com/sites/Operations/Documents/remote_work_policy.pdf"
        },
        "allowed_roles": ["admin", "hr", "manager", "employee"]
    },

    # HR-restricted SOPs - accessible only to HR and admin
    {
        "id": str(uuid.uuid4()),
        "content": "Salary adjustments and promotions are reviewed annually during the performance review cycle in Q4. Merit increases typically range from 2-8% based on performance ratings. Promotions require manager recommendation, HR approval, and budget availability. Compensation data is strictly confidential and must not be shared with other employees. All salary discussions must be conducted in private settings.",
        "metadata": {
            "file_name": "compensation_guidelines.pdf",
            "display_name": "Compensation and Salary Guidelines",
            "page_number": 1,
            "chunk_index": 0,
            "category": "HR - Confidential",
            "is_public": False,
            "file_url": "https://company.sharepoint.com/sites/HR/Confidential/compensation_guidelines.pdf"
        },
        "allowed_roles": ["admin", "hr"]
    },
    {
        "id": str(uuid.uuid4()),
        "content": "The disciplinary process follows a progressive approach: verbal warning, written warning, performance improvement plan (PIP), and termination. All incidents must be documented in the employee's file. HR must be involved in all disciplinary actions beyond verbal warnings. Termination decisions require approval from both the department head and HR director. Exit interviews are mandatory and conducted by HR.",
        "metadata": {
            "file_name": "disciplinary_procedures.pdf",
            "display_name": "Employee Disciplinary Procedures",
            "page_number": 1,
            "chunk_index": 0,
            "category": "HR - Confidential",
            "is_public": False,
            "file_url": "https://company.sharepoint.com/sites/HR/Confidential/disciplinary_procedures.pdf"
        },
        "allowed_roles": ["admin", "hr"]
    },

    # Manager-only SOPs - accessible to managers and admin
    {
        "id": str(uuid.uuid4()),
        "content": "Performance reviews must be completed twice annually in June and December. Managers should prepare detailed feedback on each direct report's accomplishments, areas for improvement, and development goals. Use the STAR method (Situation, Task, Action, Result) when documenting specific examples. Schedule a minimum 1-hour one-on-one meeting with each employee to discuss their review. Submit all completed reviews to HR within 2 weeks of the review period close.",
        "metadata": {
            "file_name": "performance_review_guide.pdf",
            "display_name": "Manager's Performance Review Guide",
            "page_number": 1,
            "chunk_index": 0,
            "category": "Management",
            "is_public": False,
            "file_url": "https://company.sharepoint.com/sites/Management/Documents/performance_review_guide.pdf"
        },
        "allowed_roles": ["admin", "manager", "hr"]
    },
    {
        "id": str(uuid.uuid4()),
        "content": "Budget approval process requires managers to submit quarterly budget requests by the 15th of the last month each quarter. Requests over $5,000 require detailed justification and ROI analysis. Emergency expenses under $1,000 can be approved by your direct supervisor. All approved expenses must be tracked in the finance portal with proper cost center codes. Receipt submission is required within 30 days of purchase.",
        "metadata": {
            "file_name": "budget_approval.pdf",
            "display_name": "Budget and Expense Approval Process",
            "page_number": 1,
            "chunk_index": 0,
            "category": "Management",
            "is_public": False,
            "file_url": "https://company.sharepoint.com/sites/Management/Documents/budget_approval.pdf"
        },
        "allowed_roles": ["admin", "manager"]
    },

    # Admin-only SOPs
    {
        "id": str(uuid.uuid4()),
        "content": "System administrator access to production databases requires two-factor authentication and VPN connection. All database queries must be logged and audited quarterly. Direct production database modifications are prohibited except during approved maintenance windows. Always create backups before making schema changes. Access credentials must be rotated every 90 days and stored in the company password vault.",
        "metadata": {
            "file_name": "database_access_policy.pdf",
            "display_name": "Production Database Access Policy",
            "page_number": 1,
            "chunk_index": 0,
            "category": "IT - Admin Only",
            "is_public": False,
            "file_url": "https://company.sharepoint.com/sites/IT/Confidential/database_access_policy.pdf"
        },
        "allowed_roles": ["admin"]
    }
]

# SOP permissions tracking
SOP_PERMISSIONS = {
    "employee_onboarding.pdf": {"allowed_roles": ["admin", "hr", "manager", "employee"], "is_public": True},
    "time_off_policy.pdf": {"allowed_roles": ["admin", "hr", "manager", "employee"], "is_public": True},
    "security_protocol.pdf": {"allowed_roles": ["admin", "hr", "manager", "employee"], "is_public": True},
    "remote_work_policy.pdf": {"allowed_roles": ["admin", "hr", "manager", "employee"], "is_public": True},
    "compensation_guidelines.pdf": {"allowed_roles": ["admin", "hr"], "is_public": False},
    "disciplinary_procedures.pdf": {"allowed_roles": ["admin", "hr"], "is_public": False},
    "performance_review_guide.pdf": {"allowed_roles": ["admin", "manager", "hr"], "is_public": False},
    "budget_approval.pdf": {"allowed_roles": ["admin", "manager"], "is_public": False},
    "database_access_policy.pdf": {"allowed_roles": ["admin"], "is_public": False}
}
