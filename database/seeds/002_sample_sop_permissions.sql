-- Sample SOP permissions for development and testing
-- This sets up various SOPs with different access levels

-- Public SOPs (everyone can access)
INSERT INTO sop_permissions (file_name, display_name, description, is_public, category, allowed_roles)
VALUES
    (
        'general_company_guidelines.pdf',
        'General Company Guidelines',
        'Company-wide policies, mission, values, and general procedures',
        true,
        'General',
        '{}'
    ),
    (
        'office_safety_procedures.pdf',
        'Office Safety Procedures',
        'Emergency procedures, evacuation routes, and workplace safety',
        true,
        'Safety',
        '{}'
    ),
    (
        'it_acceptable_use_policy.pdf',
        'IT Acceptable Use Policy',
        'Guidelines for using company IT resources and equipment',
        true,
        'IT',
        '{}'
    ),
    (
        'remote_work_policy.pdf',
        'Remote Work Policy',
        'Guidelines and expectations for remote/hybrid work',
        true,
        'General',
        '{}'
    )
ON CONFLICT (file_name) DO NOTHING;

-- HR-restricted SOPs
INSERT INTO sop_permissions (file_name, display_name, description, is_public, category, allowed_roles)
VALUES
    (
        'employee_handbook_hr.pdf',
        'Employee Handbook (HR Section)',
        'Confidential HR policies, compensation guidelines, and disciplinary procedures',
        false,
        'HR',
        ARRAY['hr', 'admin']
    ),
    (
        'recruitment_procedures.pdf',
        'Recruitment & Hiring Procedures',
        'Interview guidelines, hiring criteria, and onboarding processes',
        false,
        'HR',
        ARRAY['hr', 'manager', 'admin']
    ),
    (
        'performance_review_guidelines.pdf',
        'Performance Review Guidelines',
        'Performance evaluation criteria and review processes',
        false,
        'HR',
        ARRAY['hr', 'manager', 'admin']
    )
ON CONFLICT (file_name) DO NOTHING;

-- Finance-restricted SOPs
INSERT INTO sop_permissions (file_name, display_name, description, is_public, category, allowed_roles)
VALUES
    (
        'expense_approval_procedures.pdf',
        'Expense Approval Procedures',
        'Financial approval workflows and spending limits',
        false,
        'Finance',
        ARRAY['finance', 'manager', 'admin']
    ),
    (
        'budget_planning_guidelines.pdf',
        'Budget Planning Guidelines',
        'Annual budget planning and departmental allocation procedures',
        false,
        'Finance',
        ARRAY['finance', 'admin']
    ),
    (
        'invoice_processing.pdf',
        'Invoice Processing Procedures',
        'Accounts payable and receivable processes',
        false,
        'Finance',
        ARRAY['finance', 'admin']
    )
ON CONFLICT (file_name) DO NOTHING;

-- Manager-only SOPs
INSERT INTO sop_permissions (file_name, display_name, description, is_public, category, allowed_roles)
VALUES
    (
        'conflict_resolution_guidelines.pdf',
        'Conflict Resolution Guidelines',
        'Procedures for handling workplace conflicts and disputes',
        false,
        'Management',
        ARRAY['manager', 'hr', 'admin']
    ),
    (
        'team_performance_metrics.pdf',
        'Team Performance Metrics',
        'KPIs and performance tracking for team management',
        false,
        'Management',
        ARRAY['manager', 'admin']
    )
ON CONFLICT (file_name) DO NOTHING;

-- Admin-only SOPs
INSERT INTO sop_permissions (file_name, display_name, description, is_public, category, allowed_roles)
VALUES
    (
        'system_administration.pdf',
        'System Administration Procedures',
        'Internal system configuration and security procedures',
        false,
        'Administration',
        ARRAY['admin']
    ),
    (
        'data_retention_policy.pdf',
        'Data Retention & Privacy Policy',
        'Data governance, retention schedules, and privacy compliance',
        false,
        'Administration',
        ARRAY['admin']
    )
ON CONFLICT (file_name) DO NOTHING;

-- NOTE: These are sample SOPs for testing the permission system
-- In production, ensure file_names match actual documents in the documents table
